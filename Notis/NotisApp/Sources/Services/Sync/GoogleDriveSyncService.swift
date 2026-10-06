import Foundation

public enum GoogleDriveSyncResult {
    case success(folderURL: String)
    case failure(error: String)
}

public final class GoogleDriveSyncService {
    public static let shared = GoogleDriveSyncService()
    
    private init() {}
    
    // MARK: - Sync Meeting
    public func syncMeeting(meeting: Meeting, config: ProviderConfig) async throws -> String {
        guard config.isGoogleDriveConfigured else {
            throw NSError(
                domain: "GoogleDriveSyncService",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Google Drive is not configured. Please enter an Access Token or Webhook in Settings."]
            )
        }
        
        let audioURL = DataStore.shared.getAudioURL(for: meeting.audioFileName)
        guard FileManager.default.fileExists(atPath: audioURL.path) else {
            throw NSError(
                domain: "GoogleDriveSyncService",
                code: 2,
                userInfo: [NSLocalizedDescriptionKey: "Audio file for meeting was not found on device."]
            )
        }
        
        let audioData = try Data(contentsOf: audioURL)
        let summaryMarkdown = generateSummaryMarkdown(meeting: meeting)
        let transcriptText = generateTimestampedTranscript(meeting: meeting)
        
        // Mode 1: Webhook (Google Apps Script)
        if !config.googleDriveWebhookURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return try await syncViaWebhook(
                meeting: meeting,
                audioData: audioData,
                summaryMarkdown: summaryMarkdown,
                transcriptText: transcriptText,
                webhookURL: config.googleDriveWebhookURL,
                folderId: config.googleDriveFolderId
            )
        }
        
        // Mode 2: Direct Google Drive REST API v3
        return try await syncViaDirectAPI(
            meeting: meeting,
            audioData: audioData,
            summaryMarkdown: summaryMarkdown,
            transcriptText: transcriptText,
            token: config.googleDriveAccessToken,
            parentFolderId: config.googleDriveFolderId
        )
    }
    
    // MARK: - Direct Google Drive v3 REST API
    private func syncViaDirectAPI(
        meeting: Meeting,
        audioData: Data,
        summaryMarkdown: String,
        transcriptText: String,
        token: String,
        parentFolderId: String
    ) async throws -> String {
        let authHeader = "Bearer \(token.trimmingCharacters(in: .whitespacesAndNewlines))"
        let folderName = "[\(formattedDateOnly(meeting.createdAt))] \(meeting.title)"
        
        // 1. Create meeting folder in Google Drive
        let meetingFolderId = try await createDriveFolder(
            name: folderName,
            parentFolderId: parentFolderId.isEmpty ? nil : parentFolderId,
            authHeader: authHeader
        )
        
        // 2. Upload Audio.m4a
        try await uploadDriveFile(
            name: "\(meeting.title) - Audio.m4a",
            mimeType: "audio/mp4",
            data: audioData,
            parentFolderId: meetingFolderId,
            authHeader: authHeader
        )
        
        // 3. Upload Summary.md
        if let summaryData = summaryMarkdown.data(using: .utf8) {
            try await uploadDriveFile(
                name: "\(meeting.title) - Summary.md",
                mimeType: "text/markdown",
                data: summaryData,
                parentFolderId: meetingFolderId,
                authHeader: authHeader
            )
        }
        
        // 4. Upload Transcript.txt
        if let transcriptData = transcriptText.data(using: .utf8) {
            try await uploadDriveFile(
                name: "\(meeting.title) - Transcript.txt",
                mimeType: "text/plain",
                data: transcriptData,
                parentFolderId: meetingFolderId,
                authHeader: authHeader
            )
        }
        
        return "https://drive.google.com/drive/folders/\(meetingFolderId)"
    }
    
    private func createDriveFolder(name: String, parentFolderId: String?, authHeader: String) async throws -> String {
        let endpoint = URL(string: "https://www.googleapis.com/drive/v3/files")!
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue(authHeader, forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var body: [String: Any] = [
            "name": name,
            "mimeType": "application/vnd.google-apps.folder"
        ]
        if let parent = parentFolderId, !parent.isEmpty {
            body["parents"] = [parent]
        }
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let errorText = String(data: data, encoding: .utf8) ?? "Failed to create Google Drive folder"
            throw NSError(domain: "GoogleDriveSync", code: 400, userInfo: [NSLocalizedDescriptionKey: errorText])
        }
        
        struct FolderResponse: Codable {
            let id: String
        }
        let folder = try JSONDecoder().decode(FolderResponse.self, from: data)
        return folder.id
    }
    
    private func uploadDriveFile(name: String, mimeType: String, data: Data, parentFolderId: String, authHeader: String) async throws {
        let endpoint = URL(string: "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")!
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue(authHeader, forHTTPHeaderField: "Authorization")
        
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/related; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        let metadata: [String: Any] = [
            "name": name,
            "parents": [parentFolderId]
        ]
        let metadataData = try JSONSerialization.data(withJSONObject: metadata)
        
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/json; charset=UTF-8\r\n\r\n".data(using: .utf8)!)
        body.append(metadataData)
        body.append("\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        let (resData, response) = try await URLSession.shared.upload(for: request, from: body)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let errorText = String(data: resData, encoding: .utf8) ?? "Failed to upload file to Google Drive"
            throw NSError(domain: "GoogleDriveSync", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: errorText])
        }
    }
    
    // MARK: - Webhook Sync (Google Apps Script)
    private func syncViaWebhook(
        meeting: Meeting,
        audioData: Data,
        summaryMarkdown: String,
        transcriptText: String,
        webhookURL: String,
        folderId: String
    ) async throws -> String {
        guard let url = URL(string: webhookURL.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            throw NSError(domain: "GoogleDriveSync", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid Google Apps Script Webhook URL."])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload: [String: Any] = [
            "title": meeting.title,
            "date": formattedDateOnly(meeting.createdAt),
            "folderId": folderId,
            "audioBase64": audioData.base64EncodedString(),
            "summaryMarkdown": summaryMarkdown,
            "transcriptText": transcriptText
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let err = parseErrorMessage(from: data, defaultError: "Google Apps Script error")
            throw NSError(domain: "GoogleDriveSync", code: 500, userInfo: [NSLocalizedDescriptionKey: err])
        }
        
        if let text = String(data: data, encoding: .utf8), text.contains("<!DOCTYPE html>") || text.contains("<html") {
            let err = parseErrorMessage(from: data, defaultError: "Invalid response from Google")
            throw NSError(domain: "GoogleDriveSync", code: 403, userInfo: [NSLocalizedDescriptionKey: err])
        }
        
        struct WebhookResponse: Codable {
            let status: String?
            let folderUrl: String?
            let error: String?
        }
        
        if let decoded = try? JSONDecoder().decode(WebhookResponse.self, from: data) {
            if let error = decoded.error, !error.isEmpty {
                throw NSError(domain: "GoogleDriveSync", code: 500, userInfo: [NSLocalizedDescriptionKey: error])
            }
            return decoded.folderUrl ?? "https://drive.google.com"
        }
        
        return "https://drive.google.com"
    }
    
    // MARK: - Connection Diagnostics
    public func testConnection(config: ProviderConfig) async -> Result<String, Error> {
        let startTime = Date()
        
        if !config.googleDriveWebhookURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            guard let url = URL(string: config.googleDriveWebhookURL.trimmingCharacters(in: .whitespacesAndNewlines)) else {
                return .failure(NSError(domain: "GoogleDriveSync", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid Webhook URL format."]))
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: ["action": "ping"])
            
            do {
                let (data, response) = try await URLSession.shared.data(for: request)
                let elapsedMs = Int(Date().timeIntervalSince(startTime) * 1000)
                guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                    let err = parseErrorMessage(from: data, defaultError: "Webhook returned error")
                    return .failure(NSError(domain: "GoogleDriveSync", code: 500, userInfo: [NSLocalizedDescriptionKey: err]))
                }
                
                if let text = String(data: data, encoding: .utf8), text.contains("<!DOCTYPE html>") || text.contains("<html") {
                    let err = parseErrorMessage(from: data, defaultError: "Invalid response from Google")
                    return .failure(NSError(domain: "GoogleDriveSync", code: 403, userInfo: [NSLocalizedDescriptionKey: err]))
                }
                
                return .success("Google Apps Script Webhook verified successfully! (\(elapsedMs) ms)")
            } catch {
                return .failure(error)
            }
        }
        
        if !config.googleDriveAccessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let token = config.googleDriveAccessToken.trimmingCharacters(in: .whitespacesAndNewlines)
            let folderId = config.googleDriveFolderId.trimmingCharacters(in: .whitespacesAndNewlines)
            
            let urlString = folderId.isEmpty
                ? "https://www.googleapis.com/drive/v3/about?fields=user"
                : "https://www.googleapis.com/drive/v3/files/\(folderId)?fields=id,name"
            
            guard let url = URL(string: urlString) else {
                return .failure(NSError(domain: "GoogleDriveSync", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid Google Drive test URL."]))
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            
            do {
                let (data, response) = try await URLSession.shared.data(for: request)
                let elapsedMs = Int(Date().timeIntervalSince(startTime) * 1000)
                guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                    let err = String(data: data, encoding: .utf8) ?? "Google Drive API error"
                    return .failure(NSError(domain: "GoogleDriveSync", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: err]))
                }
                
                if folderId.isEmpty {
                    return .success("Google Drive API connected successfully! (\(elapsedMs) ms)")
                } else {
                    return .success("Target Google Drive Folder verified! (\(elapsedMs) ms)")
                }
            } catch {
                return .failure(error)
            }
        }
        
        return .failure(NSError(domain: "GoogleDriveSync", code: 400, userInfo: [NSLocalizedDescriptionKey: "Please enter a Google Drive Access Token or Webhook URL."]))
    }
    
    // MARK: - Markdown & Transcript Builders
    public func generateSummaryMarkdown(meeting: Meeting) -> String {
        var str = "# \(meeting.title)\n\n"
        str += "**Date:** \(formattedDateTime(meeting.createdAt))  \n"
        str += "**Duration:** \(formatDuration(meeting.duration))  \n\n"
        
        if !meeting.participants.isEmpty {
            str += "## Participants\n"
            for (idx, p) in meeting.participants.enumerated() {
                let num = p.number ?? (idx + 1)
                str += "- **#\(num) \(p.name)**"
                if let role = p.roleOrAffiliation, !role.isEmpty {
                    str += " *(\(role))*"
                }
                if let contribution = p.keyContributions.first {
                    str += " — \(contribution)"
                }
                str += "\n"
            }
            str += "\n"
        }
        
        if !meeting.summary.overview.isEmpty {
            str += "## Executive Summary\n\(meeting.summary.overview)\n\n"
        }
        
        if !meeting.summary.keyTopics.isEmpty {
            str += "## Key Topics\n"
            for topic in meeting.summary.keyTopics {
                str += "- \(topic)\n"
            }
            str += "\n"
        }
        
        if !meeting.summary.decisionsMade.isEmpty {
            str += "## Decisions Made\n"
            for decision in meeting.summary.decisionsMade {
                str += "- ✓ \(decision)\n"
            }
            str += "\n"
        }
        
        if !meeting.actionItems.isEmpty {
            str += "## Action Items\n"
            for item in meeting.actionItems {
                str += "- [\(item.isCompleted ? "x" : " ")] \(item.title)"
                if let assignee = item.assignee { str += " (@\(assignee))" }
                if let deadline = item.deadline { str += " *(Due: \(deadline))*" }
                str += "\n"
            }
            str += "\n"
        }
        
        return str
    }
    
    public func generateTimestampedTranscript(meeting: Meeting) -> String {
        if meeting.transcriptSegments.isEmpty {
            return meeting.rawTranscript
        }
        
        var str = "MEETING TRANSCRIPT: \(meeting.title)\n"
        str += "Recorded: \(formattedDateTime(meeting.createdAt))\n\n"
        
        for segment in meeting.transcriptSegments {
            let start = formatDuration(segment.startTime)
            let end = formatDuration(segment.endTime)
            str += "[\(start) - \(end)] \(segment.speaker):\n\(segment.text)\n\n"
        }
        
        return str
    }
    
    private func formattedDateOnly(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
    
    private func formattedDateTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func formatDuration(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    private func parseErrorMessage(from data: Data, defaultError: String) -> String {
        guard let text = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return defaultError
        }
        
        if text.contains("<!DOCTYPE html>") || text.contains("<html") {
            if text.contains("ServiceLogin") || text.contains("ppConfig") || text.contains("accounts.google.com") {
                return "Google Access Denied: In Google Apps Script, go to Deploy -> Manage Deployments -> Edit -> change 'Who has access' to 'Anyone' (Oricine), then click Deploy."
            }
            return "Google Apps Script returned an HTML page. Ensure 'Who has access' is set to 'Anyone' (Oricine)."
        }
        
        return text
    }
}
