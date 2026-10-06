import Foundation

public final class OmniRouteClient: AIServiceProtocol {
    private let baseURL: String
    private let apiKey: String
    private let model: String
    
    public init(baseURL: String, apiKey: String, model: String = "gpt-4o") {
        self.baseURL = baseURL.hasSuffix("/") ? String(baseURL.dropLast()) : baseURL
        self.apiKey = apiKey
        self.model = model
    }
    
    // OmniRoute Transcription
    public func transcribe(audioURL: URL) async throws -> (rawText: String, segments: [TranscriptSegment]) {
        guard !apiKey.isEmpty else {
            throw NSError(domain: "OmniRouteClient", code: 401, userInfo: [NSLocalizedDescriptionKey: "OmniRoute API Key is not configured."])
        }
        
        let endpoint = URL(string: "\(baseURL)/audio/transcriptions")!
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
        body.append("whisper-1\r\n".data(using: .utf8)!)
        
        // Form field: response_format
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
            let errorText = String(data: data, encoding: .utf8) ?? "OmniRoute transcription error"
            throw NSError(domain: "OmniRouteClient", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: errorText])
        }
        
        struct TranscriptionResponse: Codable {
            let text: String
            let segments: [SegmentObj]?
        }
        struct SegmentObj: Codable {
            let start: Double
            let end: Double
            let text: String
        }
        
        let decoded = try JSONDecoder().decode(TranscriptionResponse.self, from: data)
        let segments: [TranscriptSegment] = decoded.segments?.map { s in
            TranscriptSegment(
                speaker: "Participant",
                startTime: s.start,
                endTime: s.end,
                text: s.text.trimmingCharacters(in: .whitespacesAndNewlines)
            )
        } ?? []
        
        return (decoded.text, segments)
    }
    
    // OmniRoute Chat / Analysis
    public func analyzeMeeting(rawTranscript: String, segments: [TranscriptSegment]) async throws -> (title: String, participants: [Participant], summary: MeetingSummary, actionItems: [ActionItem]) {
        guard !apiKey.isEmpty else {
            throw NSError(domain: "OmniRouteClient", code: 401, userInfo: [NSLocalizedDescriptionKey: "OmniRoute API Key is not configured."])
        }
        
        let endpoint = URL(string: "\(baseURL)/chat/completions")!
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let prompt = """
        You are a smart AI meeting secretary.
        Analyze this meeting transcript carefully.
        1. Identify every participant who spoke or participated in the meeting.
        2. Assign each participant a sequential number (1, 2, 3...) starting at 1.
        3. If their real name is mentioned, use their name (e.g. "Sarah Connor"), or "Participant 1" if anonymous.
        4. Extract an accurate meeting title, executive summary, key topics, decisions, and clear action items (with assignee and deadline if mentioned).
        
        Return STRICT JSON matching:
        {
          "title": "Meeting Title",
          "participants": [
             { "number": 1, "name": "Name", "roleOrAffiliation": "Role or null", "keyContributions": ["Contribution 1"] }
          ],
          "summary": {
             "overview": "Overview of meeting.",
             "keyTopics": ["Topic 1", "Topic 2"],
             "decisionsMade": ["Decision 1"]
          },
          "actionItems": [
             { "title": "Task description", "assignee": "Name or null", "deadline": "Deadline or null" }
          ]
        }
        """
        
        let payload: [String: Any] = [
            "model": model,
            "messages": [
                ["role": "system", "content": prompt],
                ["role": "user", "content": "Meeting Transcript:\n\(rawTranscript)"]
            ],
            "response_format": ["type": "json_object"],
            "temperature": 0.2
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let errorText = String(data: data, encoding: .utf8) ?? "OmniRoute Chat error"
            throw NSError(domain: "OmniRouteClient", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: errorText])
        }
        
        struct ChatResponse: Codable {
            struct Choice: Codable {
                struct Message: Codable {
                    let content: String
                }
                let message: Message
            }
            let choices: [Choice]
        }
        
        let chatResult = try JSONDecoder().decode(ChatResponse.self, from: data)
        guard let contentString = chatResult.choices.first?.message.content,
              let contentData = contentString.data(using: .utf8) else {
            throw NSError(domain: "OmniRouteClient", code: 500, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON response from OmniRoute"])
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
