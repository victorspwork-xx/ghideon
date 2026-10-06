import SwiftUI

public struct MeetingDetailView: View {
    public let meetingId: UUID
    @ObservedObject private var store = DataStore.shared
    @ObservedObject private var player = AudioPlayerService.shared
    @ObservedObject private var pipeline = MeetingProcessingPipeline.shared
    @ObservedObject private var recorder = AudioRecorderService.shared
    @Environment(\.dismiss) private var dismiss
    
    @State private var isSyncingGoogleDrive = false
    @State private var googleDriveSyncError: String?
    
    public init(meeting: Meeting) {
        self.meetingId = meeting.id
    }
    
    private var currentMeeting: Meeting? {
        store.meetings.first(where: { $0.id == meetingId })
    }
    
    public var body: some View {
        Group {
            if let meeting = currentMeeting {
                meetingContent(meeting: meeting)
            } else {
                Text("Meeting not found.")
                    .foregroundColor(.secondary)
            }
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle("Meeting Details")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .onAppear {
            if let meeting = currentMeeting {
                let audioURL = store.getAudioURL(for: meeting.audioFileName)
                _ = player.loadAudio(url: audioURL)
            }
        }
        .onDisappear {
            player.stop()
        }
    }
    
    private func meetingContent(meeting: Meeting) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header Details
                VStack(alignment: .leading, spacing: 6) {
                    Text(meeting.title)
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    HStack(spacing: 12) {
                        Label(formattedDate(meeting.createdAt), systemImage: "calendar")
                        Label(formatDuration(meeting.duration), systemImage: "clock")
                        statusBadge(meeting.status)
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
                .padding(.horizontal)
                
                // Audio Player Card
                audioPlayerCard
                    .padding(.horizontal)
                
                // Continue Recording this meeting banner
                if !recorder.isRecording {
                    Button {
                        Task {
                            try? await recorder.continueRecording(
                                existingFileName: meeting.audioFileName,
                                meetingTitle: meeting.title,
                                meetingId: meeting.id,
                                baseDuration: meeting.duration
                            )
                            dismiss()
                        }
                    } label: {
                        HStack {
                            Image(systemName: "mic.badge.plus")
                            Text("Append / Continue Recording to this Meeting")
                                .fontWeight(.medium)
                            Spacer()
                            Image(systemName: "chevron.right")
                        }
                        .font(.subheadline)
                        .padding(12)
                        .background(Color.indigo.opacity(0.12))
                        .foregroundColor(.indigo)
                        .cornerRadius(10)
                    }
                    .padding(.horizontal)
                }
                
                // Google Drive Sync Banner
                if meeting.isGoogleDriveSynced || isSyncingGoogleDrive || googleDriveSyncError != nil {
                    googleDriveSyncStatusCard(meeting: meeting)
                        .padding(.horizontal)
                }
                
                // Processing Banner / Action
                if pipeline.isProcessing && pipeline.processingMeetingId == meeting.id {
                    processingCard
                        .padding(.horizontal)
                } else if meeting.status == .recorded || meeting.status == .failed {
                    reprocessCard(meeting: meeting)
                        .padding(.horizontal)
                }
                
                // Participants Section
                if !meeting.participants.isEmpty {
                    participantsSection(participants: meeting.participants)
                        .padding(.horizontal)
                }
                
                // Summary Section
                if !meeting.summary.overview.isEmpty || !meeting.summary.keyTopics.isEmpty {
                    summarySection(summary: meeting.summary)
                        .padding(.horizontal)
                }
                
                // Action Items Section
                if !meeting.actionItems.isEmpty || meeting.status == .completed {
                    ActionItemsView(actionItems: Binding(
                        get: { meeting.actionItems },
                        set: { newItems in
                            var updated = meeting
                            updated.actionItems = newItems
                            store.updateMeeting(updated)
                        }
                    )) {
                        // Updated callback
                    }
                    .padding(.horizontal)
                }
                
                // Transcript Section
                TranscriptView(
                    segments: meeting.transcriptSegments,
                    rawTranscript: meeting.rawTranscript
                ) { startTime in
                    player.seek(to: startTime)
                    if !player.isPlaying {
                        player.play()
                    }
                }
                .padding(.horizontal)
                
                Spacer(minLength: 40)
            }
            .padding(.top, 16)
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                        Text("Back")
                    }
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.indigo)
                }
            }
            
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    if store.config.isAIConfigured {
                        Button {
                            Task {
                                await pipeline.process(meeting: meeting)
                            }
                        } label: {
                            Label("Reprocess with AI", systemImage: "arrow.clockwise")
                        }
                    }
                    
                    ShareLink(item: generateMeetingExportString(meeting: meeting)) {
                        Label("Export Meeting Notes", systemImage: "square.and.arrow.up")
                    }
                    
                    if store.config.isGoogleDriveConfigured {
                        Button {
                            syncToGoogleDrive(meeting: meeting)
                        } label: {
                            Label(
                                meeting.isGoogleDriveSynced ? "Re-sync to Google Drive" : "Sync to Google Drive",
                                systemImage: "arrow.triangle.2.circlepath"
                            )
                        }
                    }
                    
                    Divider()
                    
                    Button(role: .destructive) {
                        store.deleteMeeting(meeting)
                        dismiss()
                    } label: {
                        Label("Delete Meeting", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
    }
    
    // Audio Player Card
    private var audioPlayerCard: some View {
        VStack(spacing: 12) {
            HStack {
                Text(formatDuration(player.currentTime))
                    .font(.caption2)
                    .monospacedDigit()
                    .foregroundColor(.secondary)
                
                Slider(value: Binding(
                    get: { player.currentTime },
                    set: { player.seek(to: $0) }
                ), in: 0...max(player.duration, 0.1))
                .tint(.indigo)
                
                Text(formatDuration(player.duration))
                    .font(.caption2)
                    .monospacedDigit()
                    .foregroundColor(.secondary)
            }
            
            HStack(spacing: 24) {
                Button {
                    player.seek(to: player.currentTime - 10)
                } label: {
                    Image(systemName: "gobackward.10")
                        .font(.title3)
                }
                
                Button {
                    player.togglePlayPause()
                } label: {
                    Image(systemName: player.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 44))
                        .foregroundColor(.indigo)
                }
                
                Button {
                    player.seek(to: player.currentTime + 10)
                } label: {
                    Image(systemName: "goforward.10")
                        .font(.title3)
                }
                
                Spacer()
                
                // Speed Picker
                Menu {
                    Button("1.0x") { player.setRate(1.0) }
                    Button("1.25x") { player.setRate(1.25) }
                    Button("1.5x") { player.setRate(1.5) }
                    Button("2.0x") { player.setRate(2.0) }
                } label: {
                    Text(String(format: "%.2gx", player.playbackRate))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(uiColor: .tertiarySystemGroupedBackground))
                        .cornerRadius(6)
                }
            }
        }
        .padding(14)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .cornerRadius(14)
    }
    
    // Processing Card
    private var processingCard: some View {
        HStack(spacing: 12) {
            ProgressView()
                .tint(.indigo)
            VStack(alignment: .leading, spacing: 2) {
                Text(pipeline.currentStage)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text(pipeline.progressMessage)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
        }
        .padding(12)
        .background(Color.indigo.opacity(0.1))
        .cornerRadius(10)
    }
    
    // Reprocess / AI Processing Card
    private func reprocessCard(meeting: Meeting) -> some View {
        Group {
            if store.config.isAIConfigured {
                Button {
                    Task {
                        await pipeline.process(meeting: meeting)
                    }
                } label: {
                    HStack {
                        Image(systemName: "sparkles")
                        Text(meeting.status == .failed ? "Retry AI Processing" : "Transcribe & Summarize with AI")
                            .fontWeight(.medium)
                        Spacer()
                        Image(systemName: "chevron.right")
                    }
                    .padding(12)
                    .background(Color.indigo)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
            } else {
                HStack(spacing: 10) {
                    Image(systemName: "waveform")
                        .foregroundColor(.secondary)
                    Text("Audio saved permanently. Connect an AI provider in Settings to transcribe and summarize.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(12)
                .background(Color(uiColor: .secondarySystemGroupedBackground))
                .cornerRadius(10)
            }
        }
    }
    
    // Participants Section
    private func participantsSection(participants: [Participant]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Participants Detected (\(participants.count))", systemImage: "person.2.fill")
                .font(.headline)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(Array(participants.enumerated()), id: \.element.id) { index, p in
                        let participantNumber = p.number ?? (index + 1)
                        let badgeColor = colorForSpeakerNumber(participantNumber)
                        
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 6) {
                                Text("#\(participantNumber)")
                                    .font(.system(size: 11, weight: .bold))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(badgeColor.opacity(0.15))
                                    .foregroundColor(badgeColor)
                                    .cornerRadius(6)
                                
                                Text(p.name)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .lineLimit(1)
                            }
                            
                            if let role = p.roleOrAffiliation, !role.isEmpty {
                                Text(role)
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }
                            if let first = p.keyContributions.first {
                                Text("• \(first)")
                                    .font(.caption2)
                                    .lineLimit(2)
                                    .foregroundColor(.primary.opacity(0.8))
                            }
                        }
                        .padding(10)
                        .frame(width: 175, alignment: .leading)
                        .background(Color(uiColor: .secondarySystemGroupedBackground))
                        .cornerRadius(10)
                    }
                }
            }
        }
    }
    
    private func colorForSpeakerNumber(_ number: Int) -> Color {
        let colors: [Color] = [.indigo, .purple, .teal, .orange, .pink, .blue, .green, .mint]
        return colors[(number - 1) % colors.count]
    }
    
    // Summary Section
    private func summarySection(summary: MeetingSummary) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Executive Summary", systemImage: "text.alignleft")
                .font(.headline)
            
            VStack(alignment: .leading, spacing: 10) {
                if !summary.overview.isEmpty {
                    Text(summary.overview)
                        .font(.body)
                        .foregroundColor(.primary)
                }
                
                if !summary.keyTopics.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Key Topics:")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                        ForEach(summary.keyTopics, id: \.self) { topic in
                            Text("• \(topic)")
                                .font(.subheadline)
                        }
                    }
                }
                
                if !summary.decisionsMade.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Decisions Made:")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                        ForEach(summary.decisionsMade, id: \.self) { decision in
                            Text("✓ \(decision)")
                                .font(.subheadline)
                                .foregroundColor(.green)
                        }
                    }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(uiColor: .secondarySystemGroupedBackground))
            .cornerRadius(12)
        }
    }
    
    private func statusBadge(_ status: MeetingStatus) -> some View {
        let title: String
        switch status {
        case .recorded: title = "Audio Saved"
        case .completed: title = "Analyzed"
        case .transcribing: title = "Transcribing"
        case .analyzing: title = "Analyzing"
        case .failed: title = "Failed"
        }
        
        return Text(title)
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(badgeColor(status).opacity(0.15))
            .foregroundColor(badgeColor(status))
            .cornerRadius(4)
    }
    
    private func badgeColor(_ status: MeetingStatus) -> Color {
        switch status {
        case .completed: return .green
        case .analyzing, .transcribing: return .indigo
        case .recorded: return .blue
        case .failed: return .red
        }
    }
    
    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func formatDuration(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    private func generateMeetingExportString(meeting: Meeting) -> String {
        var str = "# \(meeting.title)\n"
        str += "Date: \(formattedDate(meeting.createdAt))\n"
        str += "Duration: \(formatDuration(meeting.duration))\n\n"
        
        if !meeting.summary.overview.isEmpty {
            str += "## Overview\n\(meeting.summary.overview)\n\n"
        }
        
        if !meeting.actionItems.isEmpty {
            str += "## Action Items\n"
            for item in meeting.actionItems {
                str += "- [\(item.isCompleted ? "x" : " ")] \(item.title)"
                if let assignee = item.assignee { str += " (@\(assignee))" }
                if let deadline = item.deadline { str += " (Due: \(deadline))" }
                str += "\n"
            }
            str += "\n"
        }
        
        if !meeting.rawTranscript.isEmpty {
            str += "## Full Transcript\n\(meeting.rawTranscript)\n"
        }
        
        return str
    }
    
    private func googleDriveSyncStatusCard(meeting: Meeting) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "arrow.triangle.2.circlepath.circle.fill")
                    .foregroundColor(meeting.isGoogleDriveSynced ? .green : .indigo)
                Text("Google Drive Sync")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Spacer()
                if isSyncingGoogleDrive {
                    ProgressView()
                        .scaleEffect(0.8)
                } else if meeting.isGoogleDriveSynced {
                    Text("Synced")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.15))
                        .foregroundColor(.green)
                        .cornerRadius(4)
                }
            }
            
            if isSyncingGoogleDrive {
                Text("Uploading audio, transcript, and summary...")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else if let error = googleDriveSyncError {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
            } else if meeting.isGoogleDriveSynced {
                HStack {
                    if let syncedAt = meeting.googleDriveSyncedAt {
                        Text("Last synced: \(formattedDate(syncedAt))")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    if let folderURL = meeting.googleDriveFolderURL, let url = URL(string: folderURL) {
                        Link(destination: url) {
                            HStack(spacing: 3) {
                                Text("Open in Drive")
                                Image(systemName: "arrow.up.right")
                            }
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundColor(.indigo)
                        }
                    }
                }
            }
        }
        .padding(12)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .cornerRadius(10)
    }
    
    private func syncToGoogleDrive(meeting: Meeting) {
        guard !isSyncingGoogleDrive else { return }
        isSyncingGoogleDrive = true
        googleDriveSyncError = nil
        
        Task { @MainActor in
            do {
                let folderURL = try await GoogleDriveSyncService.shared.syncMeeting(meeting: meeting, config: store.config)
                var updated = meeting
                updated.isGoogleDriveSynced = true
                updated.googleDriveSyncedAt = Date()
                updated.googleDriveFolderURL = folderURL
                store.updateMeeting(updated)
                self.isSyncingGoogleDrive = false
            } catch {
                self.googleDriveSyncError = error.localizedDescription
                self.isSyncingGoogleDrive = false
            }
        }
    }
}
