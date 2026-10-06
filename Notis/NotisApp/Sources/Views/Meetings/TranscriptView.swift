import SwiftUI

public struct TranscriptView: View {
    public let segments: [TranscriptSegment]
    public let rawTranscript: String
    public let onSeek: (TimeInterval) -> Void
    
    @State private var showingRaw = false
    
    public init(segments: [TranscriptSegment], rawTranscript: String, onSeek: @escaping (TimeInterval) -> Void) {
        self.segments = segments
        self.rawTranscript = rawTranscript
        self.onSeek = onSeek
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Transcript & Speakers", systemImage: "quote.bubble")
                    .font(.headline)
                Spacer()
                if !segments.isEmpty {
                    Button(showingRaw ? "Show Diarized" : "Show Full Text") {
                        showingRaw.toggle()
                    }
                    .font(.caption)
                    .foregroundColor(.indigo)
                }
            }
            
            if segments.isEmpty && rawTranscript.isEmpty {
                Text("Transcript has not been generated yet.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.vertical, 8)
            } else if showingRaw || segments.isEmpty {
                Text(rawTranscript)
                    .font(.body)
                    .lineSpacing(4)
                    .padding(12)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .cornerRadius(12)
            } else {
                VStack(spacing: 12) {
                    ForEach(segments) { segment in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                HStack(spacing: 6) {
                                    let (num, label) = speakerLabelAndNumber(for: segment.speaker)
                                    if let num = num {
                                        Text(num)
                                            .font(.system(size: 10, weight: .bold))
                                            .padding(.horizontal, 5)
                                            .padding(.vertical, 1.5)
                                            .background(colorForSpeaker(segment.speaker).opacity(0.15))
                                            .foregroundColor(colorForSpeaker(segment.speaker))
                                            .cornerRadius(4)
                                    } else {
                                        Circle()
                                            .fill(colorForSpeaker(segment.speaker))
                                            .frame(width: 8, height: 8)
                                    }
                                    
                                    Text(label)
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundColor(colorForSpeaker(segment.speaker))
                                }
                                
                                Spacer()
                                
                                Button {
                                    onSeek(segment.startTime)
                                } label: {
                                    HStack(spacing: 3) {
                                        Image(systemName: "play.circle.fill")
                                        Text(formatTimestamp(segment.startTime))
                                    }
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                }
                            }
                            
                            Text(segment.text)
                                .font(.body)
                                .lineSpacing(3)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(uiColor: .secondarySystemGroupedBackground))
                        .cornerRadius(10)
                    }
                }
            }
        }
    }
    
    private func speakerLabelAndNumber(for speaker: String) -> (number: String?, name: String) {
        let trimmed = speaker.trimmingCharacters(in: .whitespacesAndNewlines)
        if let match = trimmed.range(of: #"(?:Speaker|Participant)\s*(\d+)"#, options: .regularExpression) {
            let numStr = String(trimmed[match]).components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
            return ("#\(numStr)", trimmed)
        }
        return (nil, trimmed)
    }
    
    private func colorForSpeaker(_ speaker: String) -> Color {
        let colors: [Color] = [.indigo, .purple, .teal, .orange, .pink, .blue]
        let hash = abs(speaker.hashValue)
        return colors[hash % colors.count]
    }
    
    private func formatTimestamp(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
