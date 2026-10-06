import Foundation

public struct ValidationResult: Equatable {
    public let isSuccess: Bool
    public let message: String
    public let latencyMs: Int?
    
    public static func success(message: String, latencyMs: Int? = nil) -> ValidationResult {
        ValidationResult(isSuccess: true, message: message, latencyMs: latencyMs)
    }
    
    public static func failure(message: String) -> ValidationResult {
        ValidationResult(isSuccess: false, message: message, latencyMs: nil)
    }
}

public final class AIConnectionValidator {
    public static let shared = AIConnectionValidator()
    
    private init() {}
    
    public func validateOmniRoute(baseURL: String, apiKey: String, model: String) async -> ValidationResult {
        guard !baseURL.isEmpty else {
            return .failure(message: "Base URL is required.")
        }
        guard !apiKey.isEmpty else {
            return .failure(message: "API Key is required.")
        }
        let cleanBase = baseURL.hasSuffix("/") ? String(baseURL.dropLast()) : baseURL
        guard let url = URL(string: "\(cleanBase)/chat/completions") else {
            return .failure(message: "Invalid Base URL endpoint format.")
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 12
        
        let payload: [String: Any] = [
            "model": model.isEmpty ? "gpt-4o" : model,
            "messages": [["role": "user", "content": "ping"]],
            "max_tokens": 5
        ]
        
        let startTime = Date()
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, response) = try await URLSession.shared.data(for: request)
            let elapsedMs = Int(Date().timeIntervalSince(startTime) * 1000)
            
            guard let http = response as? HTTPURLResponse else {
                return .failure(message: "Non-HTTP response received.")
            }
            
            if (200...299).contains(http.statusCode) {
                return .success(message: "OmniRoute connected successfully.", latencyMs: elapsedMs)
            } else {
                let errorBody = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
                return .failure(message: "HTTP \(http.statusCode): \(cleanErrorMessage(errorBody))")
            }
        } catch {
            return .failure(message: error.localizedDescription)
        }
    }
    
    public func validateGroq(apiKey: String, chatModel: String) async -> ValidationResult {
        guard !apiKey.isEmpty else {
            return .failure(message: "Groq API Key is required.")
        }
        guard let url = URL(string: "https://api.groq.com/openai/v1/chat/completions") else {
            return .failure(message: "Invalid Groq endpoint URL.")
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 12
        
        let payload: [String: Any] = [
            "model": chatModel.isEmpty ? "llama-3.3-70b-versatile" : chatModel,
            "messages": [["role": "user", "content": "ping"]],
            "max_tokens": 5
        ]
        
        let startTime = Date()
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, response) = try await URLSession.shared.data(for: request)
            let elapsedMs = Int(Date().timeIntervalSince(startTime) * 1000)
            
            guard let http = response as? HTTPURLResponse else {
                return .failure(message: "Non-HTTP response received.")
            }
            
            if (200...299).contains(http.statusCode) {
                return .success(message: "Groq API connected successfully.", latencyMs: elapsedMs)
            } else {
                let errorBody = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
                return .failure(message: "HTTP \(http.statusCode): \(cleanErrorMessage(errorBody))")
            }
        } catch {
            return .failure(message: error.localizedDescription)
        }
    }
    
    public func validateGemini(apiKey: String, oauthToken: String?, model: String) async -> ValidationResult {
        let hasApiKey = !apiKey.isEmpty
        let hasOAuth = oauthToken != nil && !oauthToken!.isEmpty
        guard hasApiKey || hasOAuth else {
            return .failure(message: "Gemini API Key or OAuth token is required.")
        }
        
        let targetModel = model.isEmpty ? "gemini-2.0-flash" : model
        let urlString: String
        if hasOAuth {
            urlString = "https://generativelanguage.googleapis.com/v1beta/models/\(targetModel):generateContent"
        } else {
            urlString = "https://generativelanguage.googleapis.com/v1beta/models/\(targetModel):generateContent?key=\(apiKey)"
        }
        
        guard let url = URL(string: urlString) else {
            return .failure(message: "Invalid Gemini URL endpoint.")
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = oauthToken, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.timeoutInterval = 12
        
        let payload: [String: Any] = [
            "contents": [
                [
                    "parts": [["text": "ping"]]
                ]
            ]
        ]
        
        let startTime = Date()
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, response) = try await URLSession.shared.data(for: request)
            let elapsedMs = Int(Date().timeIntervalSince(startTime) * 1000)
            
            guard let http = response as? HTTPURLResponse else {
                return .failure(message: "Non-HTTP response received.")
            }
            
            if (200...299).contains(http.statusCode) {
                return .success(message: "Google Gemini connected successfully.", latencyMs: elapsedMs)
            } else {
                let errorBody = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
                return .failure(message: "HTTP \(http.statusCode): \(cleanErrorMessage(errorBody))")
            }
        } catch {
            return .failure(message: error.localizedDescription)
        }
    }
    
    private func cleanErrorMessage(_ raw: String) -> String {
        if let data = raw.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let errorObj = json["error"] as? [String: Any], let msg = errorObj["message"] as? String {
                return msg
            }
            if let msg = json["message"] as? String {
                return msg
            }
        }
        if raw.count > 120 {
            return String(raw.prefix(120)) + "..."
        }
        return raw
    }
}
