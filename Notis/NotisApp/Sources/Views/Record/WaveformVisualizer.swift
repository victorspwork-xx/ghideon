import SwiftUI

public struct WaveformVisualizer: View {
    public let samples: [Float]
    public let isRecording: Bool
    
    public init(samples: [Float], isRecording: Bool) {
        self.samples = samples
        self.isRecording = isRecording
    }
    
    public var body: some View {
        HStack(spacing: 4) {
            if samples.isEmpty {
                ForEach(0..<30, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 4, height: 8)
                }
            } else {
                ForEach(Array(samples.enumerated()), id: \.offset) { _, sample in
                    let height = CGFloat(max(6, sample * 70))
                    RoundedRectangle(cornerRadius: 3)
                        .fill(
                            LinearGradient(
                                colors: [Color.indigo, Color.purple],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(width: 4, height: height)
                        .animation(.easeOut(duration: 0.1), value: sample)
                }
            }
        }
        .frame(height: 80)
        .frame(maxWidth: .infinity)
        .padding(.horizontal)
    }
}
