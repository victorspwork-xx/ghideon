import Foundation

public enum MeetingStatus: String, Codable, CaseIterable {
    case recorded = "recorded"
    case transcribing = "transcribing"
    case analyzing = "analyzing"
    case completed = "completed"
    case failed = "failed"
}

public struct TranscriptSegment: Identifiable, Codable, Equatable {
    public var id: UUID
    public var speaker: String
    public var startTime: TimeInterval
    public var endTime: TimeInterval
    public var text: String
    
    public init(id: UUID = UUID(), speaker: String = "Speaker 1", startTime: TimeInterval = 0, endTime: TimeInterval = 0, text: String) {
        self.id = id
        self.speaker = speaker
        self.startTime = startTime
        self.endTime = endTime
        self.text = text
    }
}

public struct Participant: Identifiable, Codable, Equatable {
    public var id: UUID
    public var number: Int?
    public var name: String
    public var roleOrAffiliation: String?
    public var keyContributions: [String]
    
    public init(id: UUID = UUID(), number: Int? = nil, name: String, roleOrAffiliation: String? = nil, keyContributions: [String] = []) {
        self.id = id
        self.number = number
        self.name = name
        self.roleOrAffiliation = roleOrAffiliation
        self.keyContributions = keyContributions
    }
}

public struct ActionItem: Identifiable, Codable, Equatable {
    public var id: UUID
    public var title: String
    public var assignee: String?
    public var deadline: String?
    public var isCompleted: Bool
    
    public init(id: UUID = UUID(), title: String, assignee: String? = nil, deadline: String? = nil, isCompleted: Bool = false) {
        self.id = id
        self.title = title
        self.assignee = assignee
        self.deadline = deadline
        self.isCompleted = isCompleted
    }
}

public struct MeetingSummary: Codable, Equatable {
    public var overview: String
    public var keyTopics: [String]
    public var decisionsMade: [String]
    
    public init(overview: String = "", keyTopics: [String] = [], decisionsMade: [String] = []) {
        self.overview = overview
        self.keyTopics = keyTopics
        self.decisionsMade = decisionsMade
    }
}

public struct Meeting: Identifiable, Codable, Equatable {
    public var id: UUID
    public var title: String
    public var createdAt: Date
    public var duration: TimeInterval
    public var audioFileName: String
    public var status: MeetingStatus
    public var errorMessage: String?
    
    public var participants: [Participant]
    public var transcriptSegments: [TranscriptSegment]
    public var rawTranscript: String
    public var summary: MeetingSummary
    public var actionItems: [ActionItem]
    
    // Google Drive Sync Metadata
    public var isGoogleDriveSynced: Bool
    public var googleDriveSyncedAt: Date?
    public var googleDriveFolderURL: String?
    
    public init(
        id: UUID = UUID(),
        title: String = "Untitled Meeting",
        createdAt: Date = Date(),
        duration: TimeInterval = 0,
        audioFileName: String = "",
        status: MeetingStatus = .recorded,
        errorMessage: String? = nil,
        participants: [Participant] = [],
        transcriptSegments: [TranscriptSegment] = [],
        rawTranscript: String = "",
        summary: MeetingSummary = MeetingSummary(),
        actionItems: [ActionItem] = [],
        isGoogleDriveSynced: Bool = false,
        googleDriveSyncedAt: Date? = nil,
        googleDriveFolderURL: String? = nil
    ) {
        self.id = id
        self.title = title
        self.createdAt = createdAt
        self.duration = duration
        self.audioFileName = audioFileName
        self.status = status
        self.errorMessage = errorMessage
        self.participants = participants
        self.transcriptSegments = transcriptSegments
        self.rawTranscript = rawTranscript
        self.summary = summary
        self.actionItems = actionItems
        self.isGoogleDriveSynced = isGoogleDriveSynced
        self.googleDriveSyncedAt = googleDriveSyncedAt
        self.googleDriveFolderURL = googleDriveFolderURL
    }
}
