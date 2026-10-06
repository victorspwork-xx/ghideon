import Foundation

public struct ProcessedMeetingResult {
    public var title: String
    public var participants: [Participant]
    public var rawTranscript: String
    public var segments: [TranscriptSegment]
    public var summary: MeetingSummary
    public var actionItems: [ActionItem]
    
    public init(
        title: String,
        participants: [Participant],
        rawTranscript: String,
        segments: [TranscriptSegment],
        summary: MeetingSummary,
        actionItems: [ActionItem]
    ) {
        self.title = title
        self.participants = participants
        self.rawTranscript = rawTranscript
        self.segments = segments
        self.summary = summary
        self.actionItems = actionItems
    }
}

public protocol AIServiceProtocol {
    func transcribe(audioURL: URL) async throws -> (rawText: String, segments: [TranscriptSegment])
    func analyzeMeeting(rawTranscript: String, segments: [TranscriptSegment]) async throws -> (title: String, participants: [Participant], summary: MeetingSummary, actionItems: [ActionItem])
}
