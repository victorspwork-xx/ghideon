import Foundation
import AVFoundation
import Combine

public final class AudioPlayerService: NSObject, ObservableObject, AVAudioPlayerDelegate {
    public static let shared = AudioPlayerService()
    
    @Published public var isPlaying = false
    @Published public var currentTime: TimeInterval = 0
    @Published public var duration: TimeInterval = 0
    @Published public var playbackRate: Float = 1.0
    
    private var audioPlayer: AVAudioPlayer?
    private var timer: AnyCancellable?
    
    public override init() {
        super.init()
    }
    
    public func loadAudio(url: URL) -> Bool {
        stop()
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
            try AVAudioSession.sharedInstance().setActive(true)
            
            let player = try AVAudioPlayer(contentsOf: url)
            player.delegate = self
            player.enableRate = true
            player.prepareToPlay()
            
            self.audioPlayer = player
            self.duration = player.duration
            self.currentTime = 0
            self.playbackRate = 1.0
            return true
        } catch {
            print("Failed to load audio: \(error.localizedDescription)")
            return false
        }
    }
    
    public func play() {
        guard let player = audioPlayer else { return }
        player.rate = playbackRate
        player.play()
        self.isPlaying = true
        startTimer()
    }
    
    public func pause() {
        audioPlayer?.pause()
        self.isPlaying = false
        stopTimer()
    }
    
    public func togglePlayPause() {
        if isPlaying {
            pause()
        } else {
            play()
        }
    }
    
    public func seek(to time: TimeInterval) {
        guard let player = audioPlayer else { return }
        player.currentTime = max(0, min(time, duration))
        self.currentTime = player.currentTime
    }
    
    public func setRate(_ rate: Float) {
        self.playbackRate = rate
        audioPlayer?.rate = rate
    }
    
    public func stop() {
        audioPlayer?.stop()
        audioPlayer = nil
        isPlaying = false
        currentTime = 0
        duration = 0
        stopTimer()
    }
    
    private func startTimer() {
        timer = Timer.publish(every: 0.1, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                guard let self = self, let player = self.audioPlayer, player.isPlaying else { return }
                self.currentTime = player.currentTime
            }
    }
    
    private func stopTimer() {
        timer?.cancel()
        timer = nil
    }
    
    // MARK: - AVAudioPlayerDelegate
    public func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        self.isPlaying = false
        self.currentTime = self.duration
        stopTimer()
    }
}
