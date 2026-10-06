import Foundation
import AVFoundation

/// Plays an inaudible silent audio loop concurrently during recording.
/// This guarantees that iOS `mediaserverd` maintains full background audio priority,
/// never suspends recording while the device is locked, and keeps the Lock Screen
/// `MPNowPlayingInfoCenter` banner visible.
public final class SilentAudioPlayer {
    public static let shared = SilentAudioPlayer()
    
    private var audioPlayer: AVAudioPlayer?
    
    private init() {}
    
    public func start() {
        guard audioPlayer == nil else { return }
        
        guard let wavData = createSilentWavData(durationSeconds: 1.0) else { return }
        
        do {
            let player = try AVAudioPlayer(data: wavData)
            player.numberOfLoops = -1 // Infinite background loop
            player.volume = 0.001 // Inaudible volume to keep output stream active
            player.prepareToPlay()
            player.play()
            self.audioPlayer = player
        } catch {
            print("SilentAudioPlayer failed: \(error.localizedDescription)")
        }
    }
    
    public func stop() {
        audioPlayer?.stop()
        audioPlayer = nil
    }
    
    private func createSilentWavData(durationSeconds: Double) -> Data? {
        let sampleRate: Int32 = 44100
        let channels: Int16 = 1
        let bitsPerSample: Int16 = 16
        let totalSamples = Int(Double(sampleRate) * durationSeconds)
        let dataSize = Int32(totalSamples * Int(channels) * Int(bitsPerSample / 8))
        let chunkSize = 36 + dataSize
        
        var data = Data()
        data.append(contentsOf: "RIFF".utf8)
        var chunkSizeBytes = chunkSize.littleEndian
        data.append(Data(bytes: &chunkSizeBytes, count: 4))
        data.append(contentsOf: "WAVE".utf8)
        
        data.append(contentsOf: "fmt ".utf8)
        var subchunk1Size: Int32 = 16
        data.append(Data(bytes: &subchunk1Size, count: 4))
        var audioFormat: Int16 = 1 // PCM
        data.append(Data(bytes: &audioFormat, count: 2))
        var channelsCount = channels.littleEndian
        data.append(Data(bytes: &channelsCount, count: 2))
        var sampleRateVal = sampleRate.littleEndian
        data.append(Data(bytes: &sampleRateVal, count: 4))
        var byteRate = (sampleRate * Int32(channels) * Int32(bitsPerSample / 8)).littleEndian
        data.append(Data(bytes: &byteRate, count: 4))
        var blockAlign = (channels * (bitsPerSample / 8)).littleEndian
        data.append(Data(bytes: &blockAlign, count: 2))
        var bits = bitsPerSample.littleEndian
        data.append(Data(bytes: &bits, count: 2))
        
        data.append(contentsOf: "data".utf8)
        var dataSizeVal = dataSize.littleEndian
        data.append(Data(bytes: &dataSizeVal, count: 4))
        
        data.append(Data(repeating: 0, count: Int(dataSize)))
        return data
    }
}
