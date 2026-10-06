import Foundation

public final class GeminiClient: AIServiceProtocol {
    private let apiKey: String
    private let oauthToken: String?
    private let model: String
    
    public init(apiKey: String, oauthToken: String? = nil, model: String = "gemini-2.0-flash") {
        self.apiKey = apiKey
        self.oauthToken = oauthToken
        self.model = model
    }
    
    private var authHeader: (field: String, value: String)? {
        if let token = oauthToken, !token.isEmpty {
            return ("Authorization", "Bearer \(token)")
        }
        return nil
    }
    
    // Upload audio and perform direct multimodal transcription & speaker diarization via Gemini
    public func transcribe(audioURL: URL) async throws -> (rawText: String, segments: [TranscriptSegment]) {
        // Direct multimodal speech analysis with Gemini via base64 inline audio or File API
        let audioData = try Data(contentsOf: audioURL)
        let base64Audio = audioData.base64EncodedString()
        
        let urlString: String
        if let _ = oauthToken {
            urlString = "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent"
        } else {
            urlString = "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent?key=\(apiKey)"
        }
        
        guard let endpoint = URL(string: urlString) else {
            throw NSError(domain: "GeminiClient", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid Gemini URL."])
        }
        
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let auth = authHeader {
            request.setValue(auth.value, forHTTPHeaderField: auth.field)
        }
        
        let promptText = """
        You are an advanced audio transcription and speaker diarization engine.
        Listen to this audio recording carefully.
        Transcribe every spoken sentence with timestamps (start and end in seconds) and separate out different speakers (e.g. Speaker 1, Speaker 2, or detected names).
        
        Return STRICT JSON in the following format:
        {
          "fullText": "Continuous transcript text here...",
          "segments": [
            {
              "speaker": "Speaker Name or Label",
              "startTime": 0.0,
              "endTime": 3.4,
              "text": "Exact words spoken"
            }
          ]
        }
        """
        
        let payload: [String: Any] = [
            "contents": [
                [
                    "parts": [
                        ["text": promptText],
                        [
                            "inline_data": [
                                "mime_type": "audio/mp4",
                                "data": base64Audio
                            ]
                        ]
                    ]
                ]
            ],
            "generationConfig": [
                "response_mime_type": "application/json",
                "temperature": 0.2
            ]
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let errorText = String(data: data, encoding: .utf8) ?? "Gemini API error"
            throw NSError(domain: "GeminiClient", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: errorText])
        }
        
        struct GeminiGenerateResponse: Codable {
            struct Candidate: Codable {
                struct Content: Codable {
                    struct Part: Codable {
                        let text: String?
                    }
                    let parts: [Part]?
                }
                let content: Content?
            }
            let candidates: [Candidate]?
        }
        
        let decoded = try JSONDecoder().decode(GeminiGenerateResponse.self, from: data)
        guard let textPart = decoded.candidates?.first?.content?.parts?.first?.text,
              let jsonTextData = textPart.data(using: .utf8) else {
            throw NSError(domain: "GeminiClient", code: 500, userInfo: [NSLocalizedDescriptionKey: "No content returned from Gemini."])
        }
        
        struct GeminiDiarizationJSON: Codable {
            let fullText: String
            let segments: [SegmentJSON]
            
            struct SegmentJSON: Codable {
                let speaker: String
                let startTime: Double
                let endTime: Double
                let text: String
            }
        }
        
        let diarized = try JSONDecoder().decode(GeminiDiarizationJSON.self, from: jsonTextData)
        let segments = diarized.segments.map { s in
            TranscriptSegment(
                speaker: s.speaker,
                startTime: s.startTime,
                endTime: s.endTime,
                text: s.text
            )
        }
        
        return (diarized.fullText, segments)
    }
    
    // Analyze transcript: participants, summary, action items
    public func analyzeMeeting(rawTranscript: String, segments: [TranscriptSegment]) async throws -> (title: String, participants: [Participant], summary: MeetingSummary, actionItems: [ActionItem]) {
        let urlString: String
        if let _ = oauthToken {
            urlString = "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent"
        } else {
            urlString = "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent?key=\(apiKey)"
        }
        
        guard let endpoint = URL(string: urlString) else {
            throw NSError(domain: "GeminiClient", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid Gemini URL."])
        }
        
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let auth = authHeader {
            request.setValue(auth.value, forHTTPHeaderField: auth.field)
        }
        
        let prompt = """
        You are an elite meeting summarization intelligence.
        Analyze this meeting transcript carefully.
        Identify every participant who spoke or was involved in the meeting.
        Assign each participant a sequential number (1, 2, 3...) starting at 1.
        If their real name is mentioned, use their name (e.g. "Alice Johnson"), or "Participant 1" if anonymous.
        
        Synthesize:
        1. An informative, clean meeting title.
        2. A list of all participants with their assigned sequential number:
           - "number": integer (1, 2, 3...)
           - "name": name or "Participant 1"
           - "roleOrAffiliation": role/title or null
           - "keyContributions": list of key contributions
        3. A structured summary (executive overview, key topics, decisions).
        4. A comprehensive list of actionable tasks (title, assignee if mentioned, deadline if mentioned).
        
        Return STRICT JSON matching:
        {
          "title": "Meeting Title",
          "participants": [
             { "number": 1, "name": "Name", "roleOrAffiliation": "Role", "keyContributions": ["Contribution 1"] }
          ],
          "summary": {
             "overview": "Overview text",
             "keyTopics": ["Topic 1", "Topic 2"],
             "decisionsMade": ["Decision 1"]
          },
          "actionItems": [
             { "title": "Task description", "assignee": "Assignee name", "deadline": "Deadline" }
          ]
        }
        
        Transcript:
        \(rawTranscript)
        """
        
        let payload: [String: Any] = [
            "contents": [
                [
                    "parts": [
                        ["text": prompt]
                    ]
                ]
            ],
            "generationConfig": [
                "response_mime_type": "application/json",
                "temperature": 0.2
            ]
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let errorText = String(data: data, encoding: .utf8) ?? "Gemini Analysis error"
            throw NSError(domain: "GeminiClient", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: errorText])
        }
        
        struct GeminiGenerateResponse: Codable {
            struct Candidate: Codable {
                struct Content: Codable {
                    struct Part: Codable {
                        let text: String?
                    }
                    let parts: [Part]?
                }
                let content: Content?
            }
            let candidates: [Candidate]?
        }
        
        let decoded = try JSONDecoder().decode(GeminiGenerateResponse.self, from: data)
        guard let textPart = decoded.candidates?.first?.content?.parts?.first?.text,
              let jsonData = textPart.data(using: .utf8) else {
            throw NSError(domain: "GeminiClient", code: 500, userInfo: [NSLocalizedDescriptionKey: "No analysis returned from Gemini."])
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
        
        let analysis = try JSONDecoder().decode(AnalysisJSON.self, from: jsonData)
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
