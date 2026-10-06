import Foundation

public enum AIProviderType: String, Codable, CaseIterable, Identifiable {
    case none = "none"
    case omniroute = "omniroute"
    case groq = "groq"
    case gemini = "gemini"
    
    public var id: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .none: return "None (Audio Only)"
        case .omniroute: return "OmniRoute"
        case .groq: return "Groq"
        case .gemini: return "Google Gemini"
        }
    }
}

public struct ProviderConfig: Codable, Equatable {
    public var primaryProvider: AIProviderType
    public var transcriptionProvider: AIProviderType
    
    // OmniRoute Configuration
    public var omnirouteBaseURL: String
    public var omnirouteApiKey: String
    public var omnirouteModel: String
    
    // Groq Configuration
    public var groqApiKey: String
    public var groqTranscriptionModel: String
    public var groqChatModel: String
    
    // Gemini Configuration
    public var geminiApiKey: String
    public var geminiOAuthAccessToken: String?
    public var geminiModel: String
    
    // Processing Options
    public var autoProcessAfterRecording: Bool
    public var enableSpeakerDiarization: Bool
    
    // Google Drive Sync Configuration
    public var googleDriveEnabled: Bool
    public var googleDriveFolderId: String
    public var googleDriveAccessToken: String
    public var googleDriveWebhookURL: String
    public var googleDriveAutoSync: Bool
    
    public init(
        primaryProvider: AIProviderType = .gemini,
        transcriptionProvider: AIProviderType = .groq,
        omnirouteBaseURL: String = "https://api.omniroute.ai/v1",
        omnirouteApiKey: String = "",
        omnirouteModel: String = "gpt-4o",
        groqApiKey: String = "",
        groqTranscriptionModel: String = "whisper-large-v3",
        groqChatModel: String = "llama-3.3-70b-versatile",
        geminiApiKey: String = "",
        geminiOAuthAccessToken: String? = nil,
        geminiModel: String = "gemini-2.0-flash",
        autoProcessAfterRecording: Bool = true,
        enableSpeakerDiarization: Bool = true,
        googleDriveEnabled: Bool = false,
        googleDriveFolderId: String = "",
        googleDriveAccessToken: String = "",
        googleDriveWebhookURL: String = "",
        googleDriveAutoSync: Bool = false
    ) {
        self.primaryProvider = primaryProvider
        self.transcriptionProvider = transcriptionProvider
        self.omnirouteBaseURL = omnirouteBaseURL
        self.omnirouteApiKey = omnirouteApiKey
        self.omnirouteModel = omnirouteModel
        self.groqApiKey = groqApiKey
        self.groqTranscriptionModel = groqTranscriptionModel
        self.groqChatModel = groqChatModel
        self.geminiApiKey = geminiApiKey
        self.geminiOAuthAccessToken = geminiOAuthAccessToken
        self.geminiModel = geminiModel
        self.autoProcessAfterRecording = autoProcessAfterRecording
        self.enableSpeakerDiarization = enableSpeakerDiarization
        self.googleDriveEnabled = googleDriveEnabled
        self.googleDriveFolderId = googleDriveFolderId
        self.googleDriveAccessToken = googleDriveAccessToken
        self.googleDriveWebhookURL = googleDriveWebhookURL
        self.googleDriveAutoSync = googleDriveAutoSync
    }
    
    public var isGoogleDriveConfigured: Bool {
        guard googleDriveEnabled else { return false }
        return !googleDriveAccessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
               !googleDriveWebhookURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    public var isAIConfigured: Bool {
        return isProviderConfigured(transcriptionProvider) || isProviderConfigured(primaryProvider)
    }
    
    public func isProviderConfigured(_ provider: AIProviderType) -> Bool {
        switch provider {
        case .none:
            return false
        case .gemini:
            return !geminiApiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
                   (geminiOAuthAccessToken != nil && !geminiOAuthAccessToken!.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        case .groq:
            return !groqApiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case .omniroute:
            return !omnirouteApiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }
}
