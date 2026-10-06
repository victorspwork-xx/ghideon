import Foundation
import Combine

public final class DataStore: ObservableObject {
    public static let shared = DataStore()
    
    @Published public var meetings: [Meeting] = []
    @Published public var config: ProviderConfig = ProviderConfig()
    
    private let meetingsFileURL: URL
    private let configFileURL: URL
    private let recordingsDirectoryURL: URL
    
    private init() {
        let fileManager = FileManager.default
        let appSupport = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first 
            ?? fileManager.temporaryDirectory
        
        self.recordingsDirectoryURL = appSupport.appendingPathComponent("Recordings", isDirectory: true)
        self.meetingsFileURL = appSupport.appendingPathComponent("meetings.json")
        self.configFileURL = appSupport.appendingPathComponent("config.json")
        
        // Ensure recordings folder exists safely
        try? fileManager.createDirectory(at: recordingsDirectoryURL, withIntermediateDirectories: true)
        
        // Load config
        if let configData = try? Data(contentsOf: configFileURL),
           let loadedConfig = try? JSONDecoder().decode(ProviderConfig.self, from: configData) {
            self.config = loadedConfig
        }
        
        // Safely check Keychain without blocking launch
        if let geminiKey = KeychainManager.shared.get(key: "gemini_api_key"), !geminiKey.isEmpty {
            self.config.geminiApiKey = geminiKey
        }
        if let groqKey = KeychainManager.shared.get(key: "groq_api_key"), !groqKey.isEmpty {
            self.config.groqApiKey = groqKey
        }
        if let omnirouteKey = KeychainManager.shared.get(key: "omniroute_api_key"), !omnirouteKey.isEmpty {
            self.config.omnirouteApiKey = omnirouteKey
        }
        
        // Load meetings
        if let data = try? Data(contentsOf: meetingsFileURL),
           let loadedMeetings = try? JSONDecoder().decode([Meeting].self, from: data) {
            self.meetings = loadedMeetings
        }
    }
    
    public func getAudioURL(for fileName: String) -> URL {
        return recordingsDirectoryURL.appendingPathComponent(fileName)
    }
    
    public func newAudioRecordingURL() -> (fileName: String, url: URL) {
        let fileName = "\(UUID().uuidString).m4a"
        let url = recordingsDirectoryURL.appendingPathComponent(fileName)
        return (fileName, url)
    }
    
    public func saveMeetings() {
        do {
            let data = try JSONEncoder().encode(meetings)
            try data.write(to: meetingsFileURL, options: [.atomicWrite, .completeFileProtection])
        } catch {
            print("Failed to save meetings: \(error.localizedDescription)")
        }
    }
    
    public func saveConfig() {
        do {
            let data = try JSONEncoder().encode(config)
            try data.write(to: configFileURL, options: [.atomicWrite])
            
            // Persist sensitive keys securely in Keychain
            KeychainManager.shared.save(key: "gemini_api_key", value: config.geminiApiKey)
            KeychainManager.shared.save(key: "groq_api_key", value: config.groqApiKey)
            KeychainManager.shared.save(key: "omniroute_api_key", value: config.omnirouteApiKey)
        } catch {
            print("Failed to save config: \(error.localizedDescription)")
        }
    }
    
    public func addMeeting(_ meeting: Meeting) {
        meetings.insert(meeting, at: 0)
        saveMeetings()
    }
    
    public func updateMeeting(_ meeting: Meeting) {
        if let idx = meetings.firstIndex(where: { $0.id == meeting.id }) {
            meetings[idx] = meeting
            saveMeetings()
        }
    }
    
    public func deleteMeeting(at offsets: IndexSet) {
        for index in offsets {
            let meeting = meetings[index]
            let audioUrl = getAudioURL(for: meeting.audioFileName)
            try? FileManager.default.removeItem(at: audioUrl)
        }
        meetings.remove(atOffsets: offsets)
        saveMeetings()
    }
    
    public func deleteMeeting(_ meeting: Meeting) {
        let audioUrl = getAudioURL(for: meeting.audioFileName)
        try? FileManager.default.removeItem(at: audioUrl)
        meetings.removeAll(where: { $0.id == meeting.id })
        saveMeetings()
    }
}
