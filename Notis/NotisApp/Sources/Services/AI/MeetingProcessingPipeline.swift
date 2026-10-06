import Foundation
import Combine

public final class MeetingProcessingPipeline: ObservableObject {
    public static let shared = MeetingProcessingPipeline()
    
    @Published public var isProcessing = false
    @Published public var processingMeetingId: UUID?
    @Published public var currentStage: String = ""
    @Published public var progressMessage: String = ""
    
    private init() {}
    
    public func process(meeting: Meeting) async {
        let config = DataStore.shared.config
        
        // If no AI provider is configured, keep the meeting as recorded audio
        guard config.isAIConfigured else {
            var updated = meeting
            updated.status = .recorded
            updated.errorMessage = nil
            DataStore.shared.updateMeeting(updated)
            return
        }
        
        await MainActor.run {
            self.isProcessing = true
            self.processingMeetingId = meeting.id
            self.currentStage = "Starting"
            self.progressMessage = "Preparing audio file..."
        }
        
        var updatedMeeting = meeting
        updatedMeeting.status = .transcribing
        DataStore.shared.updateMeeting(updatedMeeting)
        
        let audioURL = DataStore.shared.getAudioURL(for: meeting.audioFileName)
        
        guard FileManager.default.fileExists(atPath: audioURL.path) else {
            await fail(meeting: updatedMeeting, error: "Audio file not found on disk.")
            return
        }
        
        do {
            var rawText = updatedMeeting.rawTranscript
            var segments = updatedMeeting.transcriptSegments
            
            // Stage 1: Transcription & Diarization (with automatic seamless chunking)
            if config.isProviderConfigured(config.transcriptionProvider) {
                let transcriptionClient: AIServiceProtocol? = makeClient(for: config.transcriptionProvider, config: config)
                if let client = transcriptionClient {
                    // Automatically chunk audio if longer than 15 minutes (or 20 MB)
                    let chunks = try await AudioChunker.shared.chunkAudioIfNeeded(sourceURL: audioURL)
                    
                    var aggregatedRawText = ""
                    var aggregatedSegments: [TranscriptSegment] = []
                    
                    for chunk in chunks {
                        await MainActor.run {
                            self.currentStage = "Transcribing"
                            if chunk.total > 1 {
                                self.progressMessage = "Transcribing part \(chunk.index + 1) of \(chunk.total) via \(config.transcriptionProvider.displayName)..."
                            } else {
                                self.progressMessage = "Transcribing and detecting speakers via \(config.transcriptionProvider.displayName)..."
                            }
                        }
                        
                        let result = try await client.transcribe(audioURL: chunk.fileURL)
                        
                        // Shift segment timestamps by chunk's start offset
                        let shiftedSegments = result.segments.map { seg in
                            TranscriptSegment(
                                id: UUID(),
                                speaker: seg.speaker,
                                startTime: seg.startTime + chunk.startTime,
                                endTime: seg.endTime + chunk.startTime,
                                text: seg.text
                            )
                        }
                        
                        if !aggregatedRawText.isEmpty && !result.rawText.isEmpty {
                            aggregatedRawText += "\n" + result.rawText
                        } else if !result.rawText.isEmpty {
                            aggregatedRawText = result.rawText
                        }
                        
                        aggregatedSegments.append(contentsOf: shiftedSegments)
                    }
                    
                    // Clean up temporary chunk files safely
                    AudioChunker.shared.cleanupChunks(chunks, sourceURL: audioURL)
                    
                    rawText = aggregatedRawText
                    segments = aggregatedSegments
                    
                    updatedMeeting.rawTranscript = rawText
                    updatedMeeting.transcriptSegments = segments
                    updatedMeeting.status = .analyzing
                    DataStore.shared.updateMeeting(updatedMeeting)
                }
            }
            
            // Stage 2: Intelligence Analysis (if primary provider configured and we have transcript)
            if config.isProviderConfigured(config.primaryProvider), !rawText.isEmpty {
                await MainActor.run {
                    self.currentStage = "Analyzing"
                    self.progressMessage = "Extracting participants, key decisions, and actionable tasks via \(config.primaryProvider.displayName)..."
                }
                
                let analysisClient: AIServiceProtocol? = makeClient(for: config.primaryProvider, config: config)
                if let client = analysisClient {
                    let (title, participants, summary, actionItems) = try await client.analyzeMeeting(
                        rawTranscript: rawText,
                        segments: segments
                    )
                    
                    updatedMeeting.title = title.isEmpty ? meeting.title : title
                    updatedMeeting.participants = participants
                    updatedMeeting.summary = summary
                    updatedMeeting.actionItems = actionItems
                }
            }
            
            // Stage 3: Google Drive Sync (if enabled for auto-sync)
            if config.googleDriveAutoSync && config.isGoogleDriveConfigured {
                await MainActor.run {
                    self.currentStage = "Syncing"
                    self.progressMessage = "Uploading audio, transcript, and summary to Google Drive..."
                }
                
                do {
                    let folderURL = try await GoogleDriveSyncService.shared.syncMeeting(meeting: updatedMeeting, config: config)
                    updatedMeeting.isGoogleDriveSynced = true
                    updatedMeeting.googleDriveSyncedAt = Date()
                    updatedMeeting.googleDriveFolderURL = folderURL
                } catch {
                    print("Google Drive Auto-Sync Notice: \(error.localizedDescription)")
                }
            }
            
            updatedMeeting.status = .completed
            updatedMeeting.errorMessage = nil
            DataStore.shared.updateMeeting(updatedMeeting)
            
            await MainActor.run {
                self.isProcessing = false
                self.processingMeetingId = nil
                self.currentStage = "Complete"
                self.progressMessage = "Meeting intelligence generated successfully!"
            }
        } catch {
            await fail(meeting: updatedMeeting, error: error.localizedDescription)
        }
    }
    
    private func fail(meeting: Meeting, error: String) async {
        var failedMeeting = meeting
        failedMeeting.status = .failed
        failedMeeting.errorMessage = error
        DataStore.shared.updateMeeting(failedMeeting)
        
        await MainActor.run {
            self.isProcessing = false
            self.processingMeetingId = nil
            self.currentStage = "Error"
            self.progressMessage = error
        }
    }
    
    private func makeClient(for provider: AIProviderType, config: ProviderConfig) -> AIServiceProtocol? {
        switch provider {
        case .none:
            return nil
        case .gemini:
            return GeminiClient(
                apiKey: config.geminiApiKey,
                oauthToken: config.geminiOAuthAccessToken,
                model: config.geminiModel
            )
        case .groq:
            return GroqClient(
                apiKey: config.groqApiKey,
                transcriptionModel: config.groqTranscriptionModel,
                chatModel: config.groqChatModel
            )
        case .omniroute:
            return OmniRouteClient(
                baseURL: config.omnirouteBaseURL,
                apiKey: config.omnirouteApiKey,
                model: config.omnirouteModel
            )
        }
    }
}
