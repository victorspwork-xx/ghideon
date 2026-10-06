import Foundation
import AVFoundation

public enum AudioMergerError: LocalizedError {
    case cannotCreateCompositionTrack
    case cannotLoadAudioTrack
    case exportSessionFailed(String)
    
    public var errorDescription: String? {
        switch self {
        case .cannotCreateCompositionTrack:
            return "Unable to create composition track for audio merging."
        case .cannotLoadAudioTrack:
            return "Unable to load audio track from file."
        case .exportSessionFailed(let msg):
            return "Audio export failed: \(msg)"
        }
    }
}

public final class AudioMerger {
    public static let shared = AudioMerger()
    
    private init() {}
    
    /// Merges two audio files sequentially (original + appended segment) and atomically replaces original at destinationURL.
    /// Returns the total combined duration in seconds.
    public func mergeAudioFiles(originalURL: URL, segmentURL: URL) async throws -> TimeInterval {
        let composition = AVMutableComposition()
        guard let compositionTrack = composition.addMutableTrack(
            withMediaType: .audio,
            preferredTrackID: kCMPersistentTrackID_Invalid
        ) else {
            throw AudioMergerError.cannotCreateCompositionTrack
        }
        
        let originalAsset = AVURLAsset(url: originalURL)
        let segmentAsset = AVURLAsset(url: segmentURL)
        
        let originalTracks: [AVAssetTrack]
        let originalDuration: CMTime
        let segmentTracks: [AVAssetTrack]
        let segmentDuration: CMTime
        
        if #available(iOS 16.0, *) {
            originalTracks = try await originalAsset.loadTracks(withMediaType: .audio)
            originalDuration = try await originalAsset.load(.duration)
            segmentTracks = try await segmentAsset.loadTracks(withMediaType: .audio)
            segmentDuration = try await segmentAsset.load(.duration)
        } else {
            originalTracks = originalAsset.tracks(withMediaType: .audio)
            originalDuration = originalAsset.duration
            segmentTracks = segmentAsset.tracks(withMediaType: .audio)
            segmentDuration = segmentAsset.duration
        }
        
        var currentTime = CMTime.zero
        
        // 1. Insert original audio track
        if let originalTrack = originalTracks.first {
            let originalRange = CMTimeRange(start: .zero, duration: originalDuration)
            try compositionTrack.insertTimeRange(originalRange, of: originalTrack, at: currentTime)
            currentTime = CMTimeAdd(currentTime, originalDuration)
        }
        
        // 2. Insert new segment audio track
        if let segmentTrack = segmentTracks.first {
            let segmentRange = CMTimeRange(start: .zero, duration: segmentDuration)
            try compositionTrack.insertTimeRange(segmentRange, of: segmentTrack, at: currentTime)
            currentTime = CMTimeAdd(currentTime, segmentDuration)
        }
        
        let totalDurationSeconds = CMTimeGetSeconds(composition.duration)
        
        // 3. Export to temporary file
        let tempExportURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("merged_\(UUID().uuidString).m4a")
        
        if FileManager.default.fileExists(atPath: tempExportURL.path) {
            try? FileManager.default.removeItem(at: tempExportURL)
        }
        
        guard let exportSession = AVAssetExportSession(
            asset: composition,
            presetName: AVAssetExportPresetAppleM4A
        ) else {
            throw AudioMergerError.exportSessionFailed("Failed to initialize AVAssetExportSession.")
        }
        
        exportSession.outputURL = tempExportURL
        exportSession.outputFileType = .m4a
        
        await exportSession.export()
        
        if exportSession.status != .completed {
            let err = exportSession.error?.localizedDescription ?? "Unknown export error"
            throw AudioMergerError.exportSessionFailed(err)
        }
        
        // 4. Replace original file with merged file atomically
        if FileManager.default.fileExists(atPath: originalURL.path) {
            _ = try FileManager.default.replaceItemAt(originalURL, withItemAt: tempExportURL)
        } else {
            try FileManager.default.moveItem(at: tempExportURL, to: originalURL)
        }
        
        // 5. Clean up temporary segment file
        try? FileManager.default.removeItem(at: segmentURL)
        
        return totalDurationSeconds
    }
}
