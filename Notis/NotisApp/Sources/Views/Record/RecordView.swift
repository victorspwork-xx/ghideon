import SwiftUI

public struct RecordView: View {
    @ObservedObject private var recorder = AudioRecorderService.shared
    @ObservedObject private var pipeline = MeetingProcessingPipeline.shared
    @ObservedObject private var store = DataStore.shared
    
    @State private var isStarting = false
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showingErrorAlert = false
    @State private var recentMeeting: Meeting?
    @State private var showingDiscardConfirmAlert = false
    
    public init() {}
    
    private var lastMeeting: Meeting? {
        store.meetings.first
    }
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color(uiColor: .systemGroupedBackground)
                    .ignoresSafeArea()
                
                VStack(spacing: 24) {
                    // Header / Status
                    VStack(spacing: 8) {
                        if recorder.isRecording {
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(recorder.isPaused ? Color.orange : Color.red)
                                    .frame(width: 10, height: 10)
                                Text(recorder.isPaused ? "Recording Paused" : (recorder.isAppendingToExisting ? "Appending to Meeting" : "Recording in Progress"))
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .foregroundColor(.primary)
                            }
                            
                            Text(recorder.activeMeetingTitle)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.indigo)
                                .lineLimit(1)
                            
                            HStack(spacing: 6) {
                                Image(systemName: "lock.circle.fill")
                                    .foregroundColor(.green)
                                Text("Safe to lock phone • Lock screen banner active")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        } else {
                            Text("Ready to Record")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            Text("Record meetings with screen locked. Master audio and notes are kept permanently.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 24)
                        }
                    }
                    .padding(.top, 20)
                    
                    Spacer()
                    
                    // Timer & Waveform
                    VStack(spacing: 20) {
                        Text(formatDuration(recorder.elapsedTime))
                            .font(.system(size: 60, weight: .bold, design: .monospaced))
                            .foregroundColor(recorder.isRecording ? (recorder.isPaused ? .orange : .red) : .primary)
                        
                        if recorder.isAppendingToExisting {
                            Text("Cumulative Duration")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                        }
                        
                        WaveformVisualizer(
                            samples: recorder.audioWaveformSamples,
                            isRecording: recorder.isRecording && !recorder.isPaused
                        )
                        .padding(.horizontal)
                    }
                    
                    Spacer()
                    
                    // Action Buttons Area: 2 Options (New Recording / Continue Last)
                    VStack(spacing: 16) {
                        if recorder.isRecording {
                            // Active Recording Controls: Pause/Resume + Stop
                            HStack(spacing: 40) {
                                // Pause / Resume
                                Button {
                                    if recorder.isPaused {
                                        recorder.resumeRecording()
                                    } else {
                                        recorder.pauseRecording()
                                    }
                                } label: {
                                    VStack(spacing: 6) {
                                        ZStack {
                                            Circle()
                                                .fill(Color(uiColor: .systemBackground))
                                                .frame(width: 64, height: 64)
                                                .shadow(color: Color.black.opacity(0.1), radius: 6, x: 0, y: 3)
                                            Image(systemName: recorder.isPaused ? "play.fill" : "pause.fill")
                                                .font(.title2)
                                                .foregroundColor(.indigo)
                                        }
                                        Text(recorder.isPaused ? "Resume" : "Pause")
                                            .font(.caption2)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .buttonStyle(.borderless)
                                
                                // Stop & Save
                                Button {
                                    stopAndSaveRecording()
                                } label: {
                                    VStack(spacing: 6) {
                                        ZStack {
                                            Circle()
                                                .fill(Color.red)
                                                .frame(width: 80, height: 80)
                                                .shadow(color: Color.red.opacity(0.35), radius: 10, x: 0, y: 6)
                                            if isSaving {
                                                ProgressView()
                                                    .tint(.white)
                                            } else {
                                                RoundedRectangle(cornerRadius: 6)
                                                    .fill(Color.white)
                                                    .frame(width: 28, height: 28)
                                            }
                                        }
                                        Text(isSaving ? "Saving..." : "Stop & Save")
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                            .foregroundColor(.primary)
                                    }
                                }
                                .buttonStyle(.borderless)
                                .disabled(isSaving)
                            }
                        } else {
                            // Idle: Two Options (New Recording / Continue Last)
                            VStack(spacing: 16) {
                                // Option 1: Start New Recording
                                Button {
                                    startNewRecordingFlow()
                                } label: {
                                    VStack(spacing: 10) {
                                        ZStack {
                                            Circle()
                                                .fill(Color.indigo)
                                                .frame(width: 88, height: 88)
                                                .shadow(color: Color.indigo.opacity(0.35), radius: 12, x: 0, y: 6)
                                            
                                            if isStarting {
                                                ProgressView()
                                                    .tint(.white)
                                            } else {
                                                Image(systemName: "mic.fill")
                                                    .font(.system(size: 36))
                                                    .foregroundColor(.white)
                                            }
                                        }
                                        Text("New Recording")
                                            .font(.headline)
                                            .foregroundColor(.primary)
                                    }
                                }
                                .buttonStyle(.borderless)
                                .disabled(isStarting)
                                
                                // Option 2: Continue Last Recording
                                if let last = lastMeeting {
                                    Button {
                                        continueLastRecordingFlow(meeting: last)
                                    } label: {
                                        HStack(spacing: 8) {
                                            Image(systemName: "arrow.triangle.merge")
                                                .font(.subheadline)
                                            Text("Continue Last: \(last.title)")
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                                .lineLimit(1)
                                            Text("(\(formatDuration(last.duration)))")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                        .foregroundColor(.indigo)
                                        .padding(.horizontal, 18)
                                        .padding(.vertical, 10)
                                        .background(Color.indigo.opacity(0.1))
                                        .cornerRadius(22)
                                    }
                                    .buttonStyle(.borderless)
                                    .disabled(isStarting)
                                    .padding(.top, 4)
                                }
                            }
                        }
                    }
                    .padding(.bottom, 36)
                }
            }
            .navigationTitle(recorder.isRecording ? "Recording" : "Notesa")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                if recorder.isRecording {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            showingDiscardConfirmAlert = true
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "chevron.left")
                                Text("Back")
                            }
                            .font(.body)
                            .foregroundColor(.secondary)
                        }
                    }
                }
            }
            .confirmationDialog("Cancel and Discard Recording?", isPresented: $showingDiscardConfirmAlert, titleVisibility: .visible) {
                Button("Discard Recording & Go Back", role: .destructive) {
                    recorder.discardRecording()
                }
                Button("Keep Recording", role: .cancel) {}
            } message: {
                Text("Going back will discard the current recording session.")
            }
            .alert("Recording Error", isPresented: $showingErrorAlert, actions: {
                Button("OK", role: .cancel) {}
            }, message: {
                Text(errorMessage ?? "An unexpected error occurred.")
            })
            .sheet(item: $recentMeeting) { meeting in
                NavigationStack {
                    MeetingDetailView(meeting: meeting)
                }
            }
            .onChange(of: recorder.lastSavedMeeting) { saved in
                if let saved = saved {
                    self.recentMeeting = saved
                }
            }
        }
    }
    
    // MARK: - Actions
    private func startNewRecordingFlow() {
        self.isStarting = true
        Task { @MainActor in
            do {
                _ = try await recorder.startNewRecording()
                self.isStarting = false
            } catch {
                self.isStarting = false
                self.errorMessage = error.localizedDescription
                self.showingErrorAlert = true
            }
        }
    }
    
    private func continueLastRecordingFlow(meeting: Meeting) {
        self.isStarting = true
        Task { @MainActor in
            do {
                try await recorder.continueRecording(
                    existingFileName: meeting.audioFileName,
                    meetingTitle: meeting.title,
                    meetingId: meeting.id,
                    baseDuration: meeting.duration
                )
                self.isStarting = false
            } catch {
                self.isStarting = false
                self.errorMessage = error.localizedDescription
                self.showingErrorAlert = true
            }
        }
    }
    
    private func stopAndSaveRecording() {
        self.isSaving = true
        Task { @MainActor in
            do {
                if let saved = try await recorder.stopAndSaveRecording() {
                    self.recentMeeting = saved
                }
                self.isSaving = false
            } catch {
                self.isSaving = false
                self.errorMessage = "Failed to finalize audio: \(error.localizedDescription)"
                self.showingErrorAlert = true
            }
        }
    }
    
    private func formatDuration(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        let hundredths = Int((time.truncatingRemainder(dividingBy: 1)) * 100)
        return String(format: "%02d:%02d.%02d", minutes, seconds, hundredths)
    }
    
    private func formattedCurrentDate() -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: Date())
    }
}

#Preview("Record View") {
    RecordView()
}
