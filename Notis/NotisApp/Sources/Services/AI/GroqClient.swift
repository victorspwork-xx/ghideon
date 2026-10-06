import Foundation

public final class GroqClient: AIServiceProtocol {
    private let apiKey: String
    private let transcriptionModel: String
    private let chatModel: String
    
    public init(apiKey: String, transcriptionModel: String = "whisper-large-v3", chatModel: String = "llama-3.3-70b-versatile") {
        self.apiKey = apiKey
        self.transcriptionModel = transcriptionModel
        self.chatModel = chatModel
    }
    
    /// Fetches live available models from Groq /openai/v1/models endpoint
    public static func fetchAvailableModels(apiKey: String) async throws -> (audioModels: [String], chatModels: [String]) {
        let cleanKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanKey.isEmpty else {
            throw NSError(domain: "GroqClient", code: 401, userInfo: [NSLocalizedDescriptionKey: "Groq API Key is empty. Please enter your API key."])
        }
        
        guard let endpoint = URL(string: "https://api.groq.com/openai/v1/models") else {
            throw NSError(domain: "GroqClient", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid Groq models endpoint."])
        }
        
        var request = URLRequest(url: endpoint)
        request.httpMethod = "GET"
        request.setValue("Bearer \(cleanKey)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 12
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let errorText = String(data: data, encoding: .utf8) ?? "Failed to query Groq models."
            throw NSError(domain: "GroqClient", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: errorText])
        }
        
        struct GroqModelResponse: Codable {
            struct ModelObj: Codable {
                let id: String
            }
            let data: [ModelObj]
        }
        
        let modelList = try JSONDecoder().decode(GroqModelResponse.self, from: data)
        let allIds = modelList.data.map { $0.id }
        
        var audio = allIds.filter { $0.lowercased().contains("whisper") }.sorted()
        var chat = allIds.filter { !$0.lowercased().contains("whisper") }.sorted()
        
        if audio.isEmpty {
            audio = ["whisper-large-v3", "whisper-large-v3-turbo", "distil-whisper-large-v3-en"]
        }
        if chat.isEmpty {
            chat = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"]
        }
        
        return (audio, chat)
    }
    
    // Transcribe via Groq Whisper API (/openai/v1/audio/transcriptions)
    public func transcribe(audioURL: URL) async throws -> (rawText: String, segments: [TranscriptSegment]) {
        guard !apiKey.isEmpty else {
            throw NSError(domain: "GroqClient", code: 401, userInfo: [NSLocalizedDescriptionKey: "Groq API Key is not set."])
        }
        
        let endpoint = URL(string: "https://api.groq.com/openai/v1/audio/transcriptions")!
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        let audioData = try Data(contentsOf: audioURL)
        var body = Data()
        
        // Form field: model
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"model\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(transcriptionModel)\r\n".data(using: .utf8)!)
        
        // Form field: response_format -> verbose_json
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"response_format\"\r\n\r\n".data(using: .utf8)!)
        body.append("verbose_json\r\n".data(using: .utf8)!)
        
        // File field: file
        let filename = audioURL.lastPathComponent
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/m4a\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        let (data, response) = try await URLSession.shared.upload(for: request, from: body)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let errorText = String(data: data, encoding: .utf8) ?? "Unknown Groq error"
            throw NSError(domain: "GroqClient", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: errorText])
        }
        
        // Parse verbose_json
        struct GroqVerboseResponse: Codable {
            let text: String
            let segments: [GroqSegment]?
        }
        struct GroqSegment: Codable {
            let id: Int?
            let start: Double
            let end: Double
            let text: String
        }
        
        let decoded = try JSONDecoder().decode(GroqVerboseResponse.self, from: data)
        let segments: [TranscriptSegment] = decoded.segments?.map { seg in
            TranscriptSegment(
                speaker: "Participant",
                startTime: seg.start,
                endTime: seg.end,
                text: seg.text.trimmingCharacters(in: .whitespacesAndNewlines)
            )
        } ?? []
        
        return (decoded.text, segments)
    }
    
    // Analyze & extract participants, diarization hints, summary, action items
    public func analyzeMeeting(rawTranscript: String, segments: [TranscriptSegment]) async throws -> (title: String, participants: [Participant], summary: MeetingSummary, actionItems: [ActionItem]) {
        guard !apiKey.isEmpty else {
            throw NSError(domain: "GroqClient", code: 401, userInfo: [NSLocalizedDescriptionKey: "Groq API Key is not set."])
        }
        
        let endpoint = URL(string: "https://api.groq.com/openai/v1/chat/completions")!
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let systemPrompt = """
        You are an expert executive meeting assistant. Analyze the provided meeting transcript.
        Identify every participant who spoke or participated in the meeting.
        Assign each participant a sequential number (1, 2, 3...) starting at 1.
        If their real name is mentioned, use their name (e.g. "John Doe"), or "Participant 1" if anonymous.
        Extract a concise, impactful title, an executive overview, key topics discussed, decisions made, and specific actionable tasks.
        
        You must reply strictly in valid JSON format conforming to this exact structure:
        {
          "title": "Clear Meeting Title",
          "participants": [
             { "number": 1, "name": "Name", "roleOrAffiliation": "Role or null", "keyContributions": ["Key point 1"] }
          ],
          "summary": {
             "overview": "High-level 2-3 sentence overview.",
             "keyTopics": ["Topic 1", "Topic 2"],
             "decisionsMade": ["Decision 1"]
          },
          "actionItems": [
             { "title": "Task description", "assignee": "Person or null", "deadline": "Date or null" }
          ]
        }
        """
        
        let payload: [String: Any] = [
            "model": chatModel,
            "messages": [
                ["role": "system", "content": systemPrompt],
                ["role": "user", "content": "Transcript:\n\(rawTranscript)"]
            ],
            "response_format": ["type": "json_object"],
            "temperature": 0.2
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let errorText = String(data: data, encoding: .utf8) ?? "Unknown Groq Chat error"
            throw NSError(domain: "GroqClient", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: errorText])
        }
        
        struct ChatCompletionResponse: Codable {
            struct Choice: Codable {
                struct Message: Codable {
                    let content: String
                }
                let message: Message
            }
            let choices: [Choice]
        }
        
        let chatResult = try JSONDecoder().decode(ChatCompletionResponse.self, from: data)
        guard let contentString = chatResult.choices.first?.message.content,
              let contentData = contentString.data(using: .utf8) else {
            throw NSError(domain: "GroqClient", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON response from Groq"])
        }
        
        struct AnalysisJSON: Codable {
            let title: String
            let participants: [ParticipantJSON]
            let summary: SummaryJSON
            let actionItems: [ActionItemJSON]
            
            struct ParticipantJSON: Codable {
                let number: Int?
                let name: String
                let roleOrAffiliation: String?
                let keyContributions: [String]?
            }
            struct SummaryJSON: Codable {
                let overview: String
                let keyTopics: [String]?
                let decisionsMade: [String]?
            }
            struct ActionItemJSON: Codable {
                let title: String
                let assignee: String?
                let deadline: String?
            }
        }
        
        let analysis = try JSONDecoder().decode(AnalysisJSON.self, from: contentData)
        let participants = analysis.participants.enumerated().map { index, p in
            Participant(
                number: p.number ?? (index + 1),
                name: p.name,
                roleOrAffiliation: p.roleOrAffiliation,
                keyContributions: p.keyContributions ?? []
            )
        }
        let summary = MeetingSummary(
            overview: analysis.summary.overview,
            keyTopics: analysis.summary.keyTopics ?? [],
            decisionsMade: analysis.summary.decisionsMade ?? []
        )
        let actionItems = analysis.actionItems.map { a in
            ActionItem(title: a.title, assignee: a.assignee, deadline: a.deadline, isCompleted: false)
        }
        
        return (analysis.title, participants, summary, actionItems)
    }
}
