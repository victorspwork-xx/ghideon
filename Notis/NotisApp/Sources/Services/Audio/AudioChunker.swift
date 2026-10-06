import Foundation
import AVFoundation

public struct AudioChunk {
    public let index: Int
    public let total: Int
    public let fileURL: URL
    public let startTime: TimeInterval
    public let duration: TimeInterval
}

public final class AudioChunker {
    public static let shared = AudioChunker()
    
    // 12 minutes per chunk (~8.6 MB @ 96kbps AAC, safely below 20MB/25MB API limits)
    public let defaultChunkDuration: TimeInterval = 720.0
    // Minimum duration before chunking is considered (15 minutes)
    public let thresholdDuration: TimeInterval = 900.0
    
    private init() {}
    
    /// Evaluates if audio needs chunking, and slices it using AVAssetExportSession without touching active recording.
    public func chunkAudioIfNeeded(sourceURL: URL, maxChunkDuration: TimeInterval? = nil) async throws -> [AudioChunk] {
        let chunkDuration = maxChunkDuration ?? defaultChunkDuration
        let asset = AVURLAsset(url: sourceURL)
        
        let durationCMTime: CMTime
        if #available(iOS 16.0, *) {
            durationCMTime = try await asset.load(.duration)
        } else {
            durationCMTime = asset.duration
        }
        
        let totalSeconds = CMTimeGetSeconds(durationCMTime)
        guard totalSeconds.isFinite && totalSeconds > 0 else {
            throw NSError(
                domain: "AudioChunker",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid or empty audio file for chunking."]
            )
        }
        
        // If file is shorter than 15 minutes, no chunking needed: return single original file
        if totalSeconds <= thresholdDuration {
            return [
                AudioChunk(
                    index: 0,
                    total: 1,
                    fileURL: sourceURL,
                    startTime: 0,
                    duration: totalSeconds
                )
            ]
        }
        
        let chunkCount = Int(ceil(totalSeconds / chunkDuration))
        var chunks: [AudioChunk] = []
        let tempDir = FileManager.default.temporaryDirectory
        let sessionPrefix = UUID().uuidString
        
        for i in 0..<chunkCount {
            let startSec = Double(i) * chunkDuration
            let durSec = min(chunkDuration, totalSeconds - startSec)
            guard durSec > 0.5 else { continue }
            
            let chunkFileName = "chunk_\(sessionPrefix)_\(i).m4a"
            let chunkURL = tempDir.appendingPathComponent(chunkFileName)
            
            if FileManager.default.fileExists(atPath: chunkURL.path) {
                try? FileManager.default.removeItem(at: chunkURL)
            }
            
            let timeRange = CMTimeRange(
                start: CMTime(seconds: startSec, preferredTimescale: 600),
                duration: CMTime(seconds: durSec, preferredTimescale: 600)
            )
            
            guard let exportSession = AVAssetExportSession(
                asset: asset,
                presetName: AVAssetExportPresetAppleM4A
            ) else {
                throw NSError(
                    domain: "AudioChunker",
                    code: 2,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to initialize AVAssetExportSession for audio chunking."]
                )
            }
            
            exportSession.outputURL = chunkURL
            exportSession.outputFileType = .m4a
            exportSession.timeRange = timeRange
            
            await exportSession.export()
            if let error = exportSession.error {
                throw error
            }
            guard exportSession.status == .completed else {
                throw NSError(
                    domain: "AudioChunker",
                    code: 3,
                    userInfo: [NSLocalizedDescriptionKey: "Audio chunk export failed with status: \(exportSession.status.rawValue)"]
                )
            }
            
            chunks.append(
                AudioChunk(
                    index: i,
                    total: chunkCount,
                    fileURL: chunkURL,
                    startTime: startSec,
                    duration: durSec
                )
            )
        }
        
        return chunks
    }
    
    /// Cleans up temporary chunk files created for transcription, leaving the master audio untouched.
    public func cleanupChunks(_ chunks: [AudioChunk], sourceURL: URL) {
        for chunk in chunks {
            if chunk.fileURL != sourceURL {
                try? FileManager.default.removeItem(at: chunk.fileURL)
            }
        }
    }
}
