import Foundation
import AVFoundation
import Combine
import MediaPlayer
import UIKit
import UserNotifications

public final class AudioRecorderService: NSObject, ObservableObject, AVAudioRecorderDelegate, UNUserNotificationCenterDelegate {
    public static let shared = AudioRecorderService()
    
    @Published public var isRecording = false
    @Published public var isPaused = false
    @Published public var elapsedTime: TimeInterval = 0
    @Published public var currentAudioLevel: Float = 0.0 // 0.0 to 1.0 normalized
    @Published public var audioWaveformSamples: [Float] = []
    
    // Meeting ID or active file name
    @Published public var activeMeetingId: UUID?
    @Published public var activeMeetingTitle: String = ""
    @Published public var isAppendingToExisting: Bool = false
    @Published public var lastSavedMeeting: Meeting?
    
    private var audioRecorder: AVAudioRecorder?
    private var timer: AnyCancellable?
    private var currentRecordingFileName: String = ""
    private var currentRecordingURL: URL?
    
    // Continuation / Appending state
    private var isContinuation: Bool = false
    private var continuationBaseDuration: TimeInterval = 0
    private var continuationOriginalFileName: String = ""
    private var continuationSegmentURL: URL?
    
    public override init() {
        super.init()
        setupNotificationCategories()
        UNUserNotificationCenter.current().delegate = self
        requestNotificationPermission()
    }
    
    private func setupNotificationCategories() {
        let stopAction = UNNotificationAction(
            identifier: "STOP_AND_SAVE_ACTION",
            title: "Stop & Save Recording",
            options: [.foreground]
        )
        let category = UNNotificationCategory(
            identifier: "RECORDING_ACTIVE_CATEGORY",
            actions: [stopAction],
            intentIdentifiers: [],
            options: []
        )
        UNUserNotificationCenter.current().setNotificationCategories([category])
    }
    
    public func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
    }
    
    public func requestMicrophonePermission() async -> Bool {
        let status = AVAudioSession.sharedInstance().recordPermission
        switch status {
        case .granted:
            return true
        case .denied:
            return false
        case .undetermined:
            if #available(iOS 17.0, *) {
                return await AVAudioApplication.requestRecordPermission()
            } else {
                return await withCheckedContinuation { continuation in
                    AVAudioSession.sharedInstance().requestRecordPermission { granted in
                        continuation.resume(returning: granted)
                    }
                }
            }
        @unknown default:
            return false
        }
    }
    
    public func configureAudioSessionForBackgroundRecording() throws {
        let session = AVAudioSession.sharedInstance()
        
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.defaultToSpeaker, .allowBluetoothHFP, .allowBluetoothA2DP]
            )
        } catch {
            print("Notice: setCategory with bluetooth options failed, falling back to defaultToSpeaker: \(error.localizedDescription)")
            try session.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.defaultToSpeaker]
            )
        }
        
        try session.setActive(true, options: .notifyOthersOnDeactivation)
    }
    
    public func startNewRecording(customTitle: String? = nil) async throws -> (fileName: String, url: URL) {
        let granted = await requestMicrophonePermission()
        guard granted else {
            throw NSError(
                domain: "AudioRecorderService",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Microphone permission is denied. Please open iOS Settings -> Notesa -> turn Microphone ON."]
            )
        }
        
        do {
            try configureAudioSessionForBackgroundRecording()
        } catch {
            print("Notice: configureAudioSession threw: \(error.localizedDescription)")
        }
        
        // Stop any active recording first
        if isRecording {
            _ = try await stopRecording()
        }
        
        let (fileName, fileURL) = DataStore.shared.newAudioRecordingURL()
        self.isContinuation = false
        self.continuationBaseDuration = 0
        self.continuationOriginalFileName = ""
        self.continuationSegmentURL = nil
        
        self.currentRecordingFileName = fileName
        self.currentRecordingURL = fileURL
        
        if FileManager.default.fileExists(atPath: fileURL.path) {
            try? FileManager.default.removeItem(at: fileURL)
        }
        
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            AVEncoderBitRateKey: 96000
        ]
        
        let recorder = try AVAudioRecorder(url: fileURL, settings: settings)
        recorder.delegate = self
        recorder.isMeteringEnabled = true
        
        guard recorder.prepareToRecord() else {
            throw NSError(
                domain: "AudioRecorderService",
                code: 2,
                userInfo: [NSLocalizedDescriptionKey: "Could not prepare audio file for recording. Verify device storage."]
            )
        }
        
        guard recorder.record() else {
            throw NSError(
                domain: "AudioRecorderService",
                code: 3,
                userInfo: [NSLocalizedDescriptionKey: "AVAudioRecorder failed to start recording audio. Ensure no other app or call has exclusive audio lock."]
            )
        }
        
        // Start silent audio keep-alive for background lock screen persistence
        SilentAudioPlayer.shared.start()
        
        let finalTitle = customTitle?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
            ? customTitle!
            : "Meeting \(formattedCurrentDate())"
        
        await MainActor.run {
            self.audioRecorder = recorder
            self.isRecording = true
            self.isPaused = false
            self.elapsedTime = 0
            self.audioWaveformSamples = []
            self.activeMeetingId = UUID()
            self.activeMeetingTitle = finalTitle
            self.isAppendingToExisting = false
            self.startMetering()
            self.setupNowPlaying(title: finalTitle)
            self.postLockScreenNotification(title: finalTitle)
        }
        
        return (fileName, fileURL)
    }
    
    public func continueRecording(
        existingFileName: String,
        meetingTitle: String,
        meetingId: UUID,
        baseDuration: TimeInterval
    ) async throws {
        let granted = await requestMicrophonePermission()
        guard granted else {
            throw NSError(
                domain: "AudioRecorderService",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Microphone permission is denied. Please open iOS Settings -> Notesa -> turn Microphone ON."]
            )
        }
        
        do {
            try configureAudioSessionForBackgroundRecording()
        } catch {
            print("Notice: configureAudioSession threw: \(error.localizedDescription)")
        }
        
        if isRecording {
            _ = try await stopRecording()
        }
        
        // Create temporary segment file
        let segmentFileName = "segment_\(UUID().uuidString).m4a"
        let segmentURL = FileManager.default.temporaryDirectory.appendingPathComponent(segmentFileName)
        
        if FileManager.default.fileExists(atPath: segmentURL.path) {
            try? FileManager.default.removeItem(at: segmentURL)
        }
        
        self.isContinuation = true
        self.continuationBaseDuration = baseDuration
        self.continuationOriginalFileName = existingFileName
        self.continuationSegmentURL = segmentURL
        
        self.currentRecordingFileName = segmentFileName
        self.currentRecordingURL = segmentURL
        
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            AVEncoderBitRateKey: 96000
        ]
        
        let recorder = try AVAudioRecorder(url: segmentURL, settings: settings)
        recorder.delegate = self
        recorder.isMeteringEnabled = true
        
        guard recorder.prepareToRecord() else {
            throw NSError(
                domain: "AudioRecorderService",
                code: 2,
                userInfo: [NSLocalizedDescriptionKey: "Could not prepare audio segment file for recording."]
            )
        }
        
        guard recorder.record() else {
            throw NSError(
                domain: "AudioRecorderService",
                code: 3,
                userInfo: [NSLocalizedDescriptionKey: "AVAudioRecorder failed to start recording audio segment."]
            )
        }
        
        // Start silent audio keep-alive for background lock screen persistence
        SilentAudioPlayer.shared.start()
        
        await MainActor.run {
            self.audioRecorder = recorder
            self.isRecording = true
            self.isPaused = false
            self.elapsedTime = baseDuration
            self.audioWaveformSamples = []
            self.activeMeetingId = meetingId
            self.activeMeetingTitle = meetingTitle
            self.isAppendingToExisting = true
            self.startMetering()
            self.setupNowPlaying(title: "\(meetingTitle) (Appending)")
            self.postLockScreenNotification(title: "\(meetingTitle) (Appending)")
        }
    }
    
    public func pauseRecording() {
        guard let recorder = audioRecorder, isRecording else { return }
        recorder.pause()
        self.isPaused = true
        // Keep SilentAudioPlayer running to prevent iOS from terminating background audio session while paused
        updateNowPlaying(playbackRate: 0.0)
    }
    
    public func resumeRecording() {
        guard let recorder = audioRecorder, isRecording else { return }
        recorder.record()
        self.isPaused = false
        SilentAudioPlayer.shared.start()
        updateNowPlaying(playbackRate: 1.0)
    }
    
    @discardableResult
    public func stopAndSaveRecording() async throws -> Meeting? {
        guard let result = try await stopRecording() else {
            return nil
        }
        
        let meetingToSave: Meeting = await MainActor.run {
            if let existingId = result.meetingId, let existing = DataStore.shared.meetings.first(where: { $0.id == existingId }) {
                var updated = existing
                updated.duration = result.duration
                DataStore.shared.updateMeeting(updated)
                self.lastSavedMeeting = updated
                return updated
            } else {
                let newMeeting = Meeting(
                    id: result.meetingId ?? UUID(),
                    title: result.title.isEmpty ? "Meeting \(formattedCurrentDate())" : result.title,
                    createdAt: Date(),
                    duration: result.duration,
                    audioFileName: result.fileName,
                    status: .recorded
                )
                DataStore.shared.addMeeting(newMeeting)
                self.lastSavedMeeting = newMeeting
                return newMeeting
            }
        }
        
        postCompletionNotification(title: meetingToSave.title, duration: meetingToSave.duration)
        
        if DataStore.shared.config.autoProcessAfterRecording && DataStore.shared.config.isAIConfigured {
            Task {
                await MeetingProcessingPipeline.shared.process(meeting: meetingToSave)
            }
        }
        
        return meetingToSave
    }
    
    public func stopRecording() async throws -> (fileName: String, url: URL, duration: TimeInterval, meetingId: UUID?, title: String)? {
        guard isRecording, let recorder = audioRecorder else {
            return nil
        }
        
        let segmentDuration = recorder.currentTime
        recorder.stop()
        self.audioRecorder = nil
        self.isRecording = false
        self.isPaused = false
        self.timer?.cancel()
        self.timer = nil
        
        SilentAudioPlayer.shared.stop()
        clearNowPlaying()
        removeLockScreenNotification()
        
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        
        let savedMeetingId = self.activeMeetingId
        let savedTitle = self.activeMeetingTitle
        let wasAppending = self.isContinuation
        
        self.activeMeetingId = nil
        self.activeMeetingTitle = ""
        self.isAppendingToExisting = false
        
        if wasAppending, let segmentURL = continuationSegmentURL {
            let originalURL = DataStore.shared.getAudioURL(for: continuationOriginalFileName)
            
            // Merge segment into original master audio file
            let totalMergedDuration = try await AudioMerger.shared.mergeAudioFiles(
                originalURL: originalURL,
                segmentURL: segmentURL
            )
            
            let finalFileName = self.continuationOriginalFileName
            self.isContinuation = false
            self.continuationBaseDuration = 0
            self.continuationOriginalFileName = ""
            self.continuationSegmentURL = nil
            
            return (finalFileName, originalURL, totalMergedDuration, savedMeetingId, savedTitle)
        } else if let fileURL = currentRecordingURL {
            let finalFileName = self.currentRecordingFileName
            return (finalFileName, fileURL, segmentDuration, savedMeetingId, savedTitle)
        }
        
        return nil
    }
    
    public func discardRecording() {
        guard isRecording, let recorder = audioRecorder else { return }
        recorder.stop()
        self.audioRecorder = nil
        self.isRecording = false
        self.isPaused = false
        self.timer?.cancel()
        self.timer = nil
        
        SilentAudioPlayer.shared.stop()
        clearNowPlaying()
        removeLockScreenNotification()
        
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        
        // Clean up current recording file if it was a new recording
        if !isContinuation, let fileURL = currentRecordingURL {
            try? FileManager.default.removeItem(at: fileURL)
        } else if isContinuation, let segmentURL = continuationSegmentURL {
            // Clean up temporary segment without modifying original
            try? FileManager.default.removeItem(at: segmentURL)
        }
        
        self.activeMeetingId = nil
        self.activeMeetingTitle = ""
        self.isAppendingToExisting = false
        self.isContinuation = false
        self.continuationBaseDuration = 0
        self.continuationOriginalFileName = ""
        self.continuationSegmentURL = nil
    }
    
    private func startMetering() {
        timer?.cancel()
        timer = Timer.publish(every: 0.08, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                guard let self = self, let recorder = self.audioRecorder, recorder.isRecording else { return }
                
                recorder.updateMeters()
                let currentSegmentTime = recorder.currentTime
                self.elapsedTime = self.continuationBaseDuration + currentSegmentTime
                
                let averagePower = recorder.averagePower(forChannel: 0) // -160 dB to 0 dB
                let minDb: Float = -60.0
                let normalizedLevel: Float
                if averagePower < minDb {
                    normalizedLevel = 0.0
                } else if averagePower >= 0.0 {
                    normalizedLevel = 1.0
                } else {
                    normalizedLevel = (averagePower - minDb) / (-minDb)
                }
                
                self.currentAudioLevel = normalizedLevel
                
                self.audioWaveformSamples.append(normalizedLevel)
                if self.audioWaveformSamples.count > 40 {
                    self.audioWaveformSamples.removeFirst()
                }
            }
    }
    
    // MARK: - Lock Screen "Now Playing" Banner & Remote Commands
    private func setupNowPlaying(title: String) {
        UIApplication.shared.beginReceivingRemoteControlEvents()
        
        var nowPlayingInfo = [String: Any]()
        nowPlayingInfo[MPMediaItemPropertyTitle] = "🔴 Recording: \(title)"
        nowPlayingInfo[MPMediaItemPropertyArtist] = "Notesa Meeting Assistant"
        nowPlayingInfo[MPMediaItemPropertyAlbumTitle] = "Tap || to Stop & Save • Notesa"
        nowPlayingInfo[MPNowPlayingInfoPropertyIsLiveStream] = true
        nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = 1.0
        
        // High-resolution Lock Screen Artwork with red recording indicator and brand badge
        let artwork = MPMediaItemArtwork(boundsSize: CGSize(width: 300, height: 300)) { size in
            UIGraphicsBeginImageContextWithOptions(size, true, 0.0)
            guard let ctx = UIGraphicsGetCurrentContext() else {
                return UIImage()
            }
            
            // Dark Navy Background
            let rect = CGRect(origin: .zero, size: size)
            let bgColor = UIColor(red: 0.12, green: 0.11, blue: 0.29, alpha: 1.0)
            bgColor.setFill()
            ctx.fill(rect)
            
            // Glowing Red Recording Circle
            let circleRect = CGRect(x: (size.width - 90) / 2, y: 65, width: 90, height: 90)
            UIColor(red: 0.95, green: 0.2, blue: 0.2, alpha: 1.0).setFill()
            ctx.fillEllipse(in: circleRect)
            
            // Text "REC"
            let text = "REC"
            let attrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 24, weight: .black),
                .foregroundColor: UIColor.white
            ]
            let str = NSAttributedString(string: text, attributes: attrs)
            let strSize = str.size()
            str.draw(at: CGPoint(x: (size.width - strSize.width) / 2, y: 65 + (90 - strSize.height) / 2))
            
            // Text "NOTESA"
            let brandAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 16, weight: .bold),
                .foregroundColor: UIColor(red: 0.78, green: 0.82, blue: 1.0, alpha: 1.0)
            ]
            let brandStr = NSAttributedString(string: "NOTESA • AUDIO RECORDING", attributes: brandAttrs)
            let brandSize = brandStr.size()
            brandStr.draw(at: CGPoint(x: (size.width - brandSize.width) / 2, y: 185))
            
            let img = UIGraphicsGetImageFromCurrentImageContext() ?? UIImage()
            UIGraphicsEndImageContext()
            return img
        }
        nowPlayingInfo[MPMediaItemPropertyArtwork] = artwork
        
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
        
        let commandCenter = MPRemoteCommandCenter.shared()
        commandCenter.pauseCommand.isEnabled = true
        commandCenter.pauseCommand.addTarget { [weak self] _ in
            Task {
                _ = try? await self?.stopAndSaveRecording()
            }
            return .success
        }
        commandCenter.playCommand.isEnabled = true
        commandCenter.playCommand.addTarget { [weak self] _ in
            self?.resumeRecording()
            return .success
        }
        commandCenter.togglePlayPauseCommand.isEnabled = true
        commandCenter.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self = self else { return .commandFailed }
            if self.isPaused {
                self.resumeRecording()
            } else {
                Task {
                    _ = try? await self.stopAndSaveRecording()
                }
            }
            return .success
        }
        commandCenter.stopCommand.isEnabled = true
        commandCenter.stopCommand.addTarget { [weak self] _ in
            Task {
                _ = try? await self?.stopAndSaveRecording()
            }
            return .success
        }
    }
    
    private func updateNowPlaying(playbackRate: Double) {
        var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [String: Any]()
        info[MPNowPlayingInfoPropertyPlaybackRate] = playbackRate
        info[MPMediaItemPropertyAlbumTitle] = playbackRate > 0 ? "Tap || to Stop & Save • Notesa" : "Recording Paused • Tap ▶ to Resume"
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }
    
    private func clearNowPlaying() {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        let commandCenter = MPRemoteCommandCenter.shared()
        commandCenter.pauseCommand.removeTarget(nil)
        commandCenter.playCommand.removeTarget(nil)
        commandCenter.togglePlayPauseCommand.removeTarget(nil)
        commandCenter.stopCommand.removeTarget(nil)
        UIApplication.shared.endReceivingRemoteControlEvents()
    }
    
    // MARK: - Lock Screen Notification Banner
    private func postLockScreenNotification(title: String) {
        let content = UNMutableNotificationContent()
        content.title = "🔴 Notesa Recording Active"
        content.subtitle = title
        content.body = "Tap 'Stop & Save' or lock screen pause button to finish."
        content.categoryIdentifier = "RECORDING_ACTIVE_CATEGORY"
        content.sound = nil
        
        let request = UNNotificationRequest(identifier: "notesa.active_recording", content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
    }
    
    private func postCompletionNotification(title: String, duration: TimeInterval) {
        let content = UNMutableNotificationContent()
        content.title = "✅ Meeting Saved"
        content.subtitle = title
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        content.body = String(format: "Saved successfully (%02d:%02d). Tap to view notes & transcription.", minutes, seconds)
        content.sound = .default
        
        let request = UNNotificationRequest(identifier: "notesa.saved_\(UUID().uuidString)", content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
    }
    
    private func removeLockScreenNotification() {
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ["notesa.active_recording"])
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["notesa.active_recording"])
    }
    
    private func formattedCurrentDate() -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: Date())
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        if response.actionIdentifier == "STOP_AND_SAVE_ACTION" {
            Task {
                _ = try? await self.stopAndSaveRecording()
                completionHandler()
            }
        } else {
            completionHandler()
        }
    }
    
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }
    
    // MARK: - AVAudioRecorderDelegate
    public func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        if !flag {
            print("Audio recording finished with flag = false.")
        }
    }
    
    public func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        if let error = error {
            print("Audio recording encode error: \(error.localizedDescription)")
        }
    }
}
