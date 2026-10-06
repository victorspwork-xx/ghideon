import SwiftUI

public struct SettingsView: View {
    @ObservedObject private var store = DataStore.shared
    @Environment(\.dismiss) private var dismiss
    public var onBack: (() -> Void)? = nil
    
    @State private var showingSaveAlert = false
    
    public init(onBack: (() -> Void)? = nil) {
        self.onBack = onBack
    }
    
    // Validation state
    @State private var validatingProvider: AIProviderType?
    @State private var omniRouteResult: ValidationResult?
    @State private var groqResult: ValidationResult?
    @State private var geminiResult: ValidationResult?
    @State private var isValidatingRouting = false
    @State private var routingValidationSummary: String?
    @State private var isValidatingGoogleDrive = false
    @State private var googleDriveResult: ValidationResult?
    
    // Groq dynamic models state
    @State private var groqAudioModels: [String] = [
        "whisper-large-v3",
        "whisper-large-v3-turbo",
        "distil-whisper-large-v3-en"
    ]
    @State private var groqChatModels: [String] = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "llama-3.1-70b-versatile",
        "llama3-70b-8192",
        "mixtral-8x7b-32768",
        "deepseek-r1-distill-llama-70b",
        "gemma2-9b-it"
    ]
    @State private var isFetchingGroqModels = false
    @State private var useManualGroqModel = false
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            Form {
                // Provider Routing
                Section(header: Text("AI Model Routing")) {
                    Picker("Primary Intelligence", selection: $store.config.primaryProvider) {
                        ForEach(AIProviderType.allCases) { provider in
                            Text(provider.displayName).tag(provider)
                        }
                    }
                    
                    Picker("Audio Transcription", selection: $store.config.transcriptionProvider) {
                        ForEach(AIProviderType.allCases) { provider in
                            Text(provider.displayName).tag(provider)
                        }
                    }
                    
                    Toggle("Auto-Process after Recording", isOn: $store.config.autoProcessAfterRecording)
                    Toggle("Detect Multiple Participants", isOn: $store.config.enableSpeakerDiarization)
                    
                    // Test Active Routing Button
                    Button {
                        testActiveRouting()
                    } label: {
                        HStack {
                            if isValidatingRouting {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Testing Selected Providers...")
                            } else {
                                Image(systemName: "checkmark.shield")
                                Text("Validate Active AI Routing")
                            }
                        }
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.indigo)
                    }
                    .disabled(isValidatingRouting || validatingProvider != nil)
                    
                    if let summary = routingValidationSummary {
                        Text(summary)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.vertical, 2)
                    }
                }
                
                // Groq API (with dynamic model list extraction)
                Section(header: Label("Groq API", systemImage: "bolt.fill")) {
                    SecureField("Groq API Key (gsk_...)", text: $store.config.groqApiKey)
                        .font(.footnote)
                    
                    // Fetch Models Button
                    Button {
                        fetchGroqModels()
                    } label: {
                        HStack(spacing: 6) {
                            if isFetchingGroqModels {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Fetching Models from Groq...")
                            } else {
                                Image(systemName: "arrow.triangle.2.circlepath")
                                Text("Fetch Available Models (\(groqAudioModels.count + groqChatModels.count) available)")
                            }
                        }
                        .font(.footnote)
                        .fontWeight(.medium)
                        .foregroundColor(.indigo)
                    }
                    .disabled(isFetchingGroqModels || store.config.groqApiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    
                    // Transcription Model Selection
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Transcription Model")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Picker("Transcription Model", selection: $store.config.groqTranscriptionModel) {
                            ForEach(groqAudioModels, id: \.self) { model in
                                Text(model).tag(model)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                    
                    // Chat / Summary Model Selection
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Chat / Summary Model")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        if useManualGroqModel {
                            TextField("Enter custom model", text: $store.config.groqChatModel)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                                .font(.subheadline)
                        } else {
                            Picker("Chat / Summary Model", selection: $store.config.groqChatModel) {
                                ForEach(groqChatModels, id: \.self) { model in
                                    Text(model).tag(model)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                    }
                    
                    Toggle("Enter Custom Model Identifier", isOn: $useManualGroqModel)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    // Groq Test Connection Button
                    Button {
                        testGroq()
                    } label: {
                        HStack {
                            if validatingProvider == .groq {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Checking Groq API...")
                            } else {
                                Image(systemName: "bolt.horizontal.circle")
                                Text("Validate Groq Connection")
                            }
                        }
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.indigo)
                    }
                    .disabled(validatingProvider != nil || isValidatingRouting || isFetchingGroqModels)
                    
                    if let result = groqResult {
                        validationResultRow(result)
                    }
                }
                
                // Google Gemini
                Section(header: Label("Google Gemini", systemImage: "sparkles")) {
                    SecureField("Gemini API Key (AIzaSy...)", text: $store.config.geminiApiKey)
                        .font(.footnote)
                    
                    TextField("Gemini Model", text: $store.config.geminiModel)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    
                    SecureField("OAuth Access Token (Optional)", text: Binding(
                        get: { store.config.geminiOAuthAccessToken ?? "" },
                        set: { store.config.geminiOAuthAccessToken = $0.isEmpty ? nil : $0 }
                    ))
                    .font(.footnote)
                    
                    Button {
                        testGemini()
                    } label: {
                        HStack {
                            if validatingProvider == .gemini {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Checking Gemini API...")
                            } else {
                                Image(systemName: "bolt.horizontal.circle")
                                Text("Validate Gemini Connection")
                            }
                        }
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.indigo)
                    }
                    .disabled(validatingProvider != nil || isValidatingRouting)
                    
                    if let result = geminiResult {
                        validationResultRow(result)
                    }
                }
                
                // OmniRoute API
                Section(header: Label("OmniRoute API", systemImage: "network")) {
                    TextField("Base URL", text: $store.config.omnirouteBaseURL)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .font(.footnote)
                    
                    SecureField("OmniRoute API Key", text: $store.config.omnirouteApiKey)
                        .font(.footnote)
                    
                    TextField("Model Name (e.g. gpt-4o, claude-3-5)", text: $store.config.omnirouteModel)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    
                    Button {
                        testOmniRoute()
                    } label: {
                        HStack {
                            if validatingProvider == .omniroute {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Checking OmniRoute...")
                            } else {
                                Image(systemName: "bolt.horizontal.circle")
                                Text("Validate OmniRoute Connection")
                            }
                        }
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.indigo)
                    }
                    .disabled(validatingProvider != nil || isValidatingRouting)
                    
                    if let result = omniRouteResult {
                        validationResultRow(result)
                    }
                }
                
                // Google Drive Sync
                Section(header: Label("Google Drive Cloud Sync", systemImage: "arrow.triangle.2.circlepath.circle")) {
                    Toggle("Enable Google Drive Sync", isOn: $store.config.googleDriveEnabled)
                    
                    if store.config.googleDriveEnabled {
                        Toggle("Auto-Sync Completed Meetings", isOn: $store.config.googleDriveAutoSync)
                        
                        Text("Option A: Direct Google Drive API")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                            .padding(.top, 4)
                        
                        SecureField("OAuth / Service Access Token", text: $store.config.googleDriveAccessToken)
                            .font(.footnote)
                        
                        TextField("Folder ID (Optional, defaults to root)", text: $store.config.googleDriveFolderId)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .font(.footnote)
                        
                        Text("Option B: Google Apps Script Webhook (Zero Setup)")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                            .padding(.top, 4)
                        
                        TextField("Apps Script Webhook URL", text: $store.config.googleDriveWebhookURL)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .font(.footnote)
                        
                        Button {
                            testGoogleDrive()
                        } label: {
                            HStack {
                                if isValidatingGoogleDrive {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                    Text("Verifying Google Drive...")
                                } else {
                                    Image(systemName: "bolt.horizontal.circle")
                                    Text("Validate Google Drive Connection")
                                }
                            }
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.indigo)
                        }
                        .disabled(isValidatingGoogleDrive)
                        
                        if let result = googleDriveResult {
                            validationResultRow(result)
                        }
                    }
                }
                
                // Storage Info
                Section(header: Text("Storage & Reliability")) {
                    HStack {
                        Text("Background Mode")
                        Spacer()
                        Text("Active (Audio)")
                            .foregroundColor(.green)
                            .font(.caption)
                    }
                    HStack {
                        Text("Master Audio Storage")
                        Spacer()
                        Text("Permanent (M4A AAC)")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                    HStack {
                        Text("Stored Meetings")
                        Spacer()
                        Text("\(store.meetings.count)")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        if let onBack = onBack {
                            onBack()
                        } else {
                            dismiss()
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                            Text("Back")
                        }
                        .font(.body)
                        .foregroundColor(.indigo)
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        store.saveConfig()
                        showingSaveAlert = true
                    }
                    .fontWeight(.bold)
                }
            }
            .alert("Settings Saved", isPresented: $showingSaveAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Your API configurations and provider settings have been saved to local secure storage.")
            }
            .onAppear {
                // Ensure current stored models are available in the picker lists
                if !groqAudioModels.contains(store.config.groqTranscriptionModel) {
                    groqAudioModels.insert(store.config.groqTranscriptionModel, at: 0)
                }
                if !groqChatModels.contains(store.config.groqChatModel) {
                    groqChatModels.insert(store.config.groqChatModel, at: 0)
                }
            }
        }
    }
    
    // MARK: - Inline Validation Result Row
    @ViewBuilder
    private func validationResultRow(_ result: ValidationResult) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: result.isSuccess ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                .foregroundColor(result.isSuccess ? .green : .red)
                .font(.subheadline)
                .padding(.top, 1)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(result.message)
                    .font(.caption)
                    .foregroundColor(result.isSuccess ? .primary : .red)
                
                if let latency = result.latencyMs {
                    Text("Response time: \(latency) ms")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    // MARK: - Groq Model Extraction
    private func fetchGroqModels() {
        store.saveConfig()
        isFetchingGroqModels = true
        
        Task { @MainActor in
            do {
                let (audio, chat) = try await GroqClient.fetchAvailableModels(apiKey: store.config.groqApiKey)
                self.groqAudioModels = audio
                self.groqChatModels = chat
                
                // If selected model is not in fetched list, default to first
                if !audio.contains(store.config.groqTranscriptionModel), let first = audio.first {
                    store.config.groqTranscriptionModel = first
                }
                if !chat.contains(store.config.groqChatModel), let first = chat.first {
                    store.config.groqChatModel = first
                }
                store.saveConfig()
                self.isFetchingGroqModels = false
                self.groqResult = .success(message: "Extracted \(audio.count) audio models and \(chat.count) chat models from Groq.")
            } catch {
                self.isFetchingGroqModels = false
                self.groqResult = .failure(message: "Failed to extract Groq models: \(error.localizedDescription)")
            }
        }
    }
    
    // MARK: - Validation Actions
    private func testOmniRoute() {
        store.saveConfig()
        validatingProvider = .omniroute
        omniRouteResult = nil
        
        Task { @MainActor in
            let res = await AIConnectionValidator.shared.validateOmniRoute(
                baseURL: store.config.omnirouteBaseURL,
                apiKey: store.config.omnirouteApiKey,
                model: store.config.omnirouteModel
            )
            self.omniRouteResult = res
            self.validatingProvider = nil
        }
    }
    
    private func testGroq() {
        store.saveConfig()
        validatingProvider = .groq
        groqResult = nil
        
        Task { @MainActor in
            let res = await AIConnectionValidator.shared.validateGroq(
                apiKey: store.config.groqApiKey,
                chatModel: store.config.groqChatModel
            )
            self.groqResult = res
            self.validatingProvider = nil
            
            // Automatically fetch models on successful validation if not yet fetched
            if res.isSuccess && groqChatModels.count <= 7 {
                fetchGroqModels()
            }
        }
    }
    
    private func testGemini() {
        store.saveConfig()
        validatingProvider = .gemini
        geminiResult = nil
        
        Task { @MainActor in
            let res = await AIConnectionValidator.shared.validateGemini(
                apiKey: store.config.geminiApiKey,
                oauthToken: store.config.geminiOAuthAccessToken,
                model: store.config.geminiModel
            )
            self.geminiResult = res
            self.validatingProvider = nil
        }
    }
    
    private func testActiveRouting() {
        store.saveConfig()
        isValidatingRouting = true
        routingValidationSummary = nil
        
        Task { @MainActor in
            var results: [String] = []
            
            let primary = store.config.primaryProvider
            if primary == .none {
                results.append("Primary: Audio Only (AI skipped)")
            } else {
                let res = await validateProvider(primary)
                let status = res.isSuccess ? "✅ \(primary.displayName) OK" : "❌ \(primary.displayName) Failed: \(res.message)"
                results.append(status)
            }
            
            let transcription = store.config.transcriptionProvider
            if transcription != primary && transcription != .none {
                let res = await validateProvider(transcription)
                let status = res.isSuccess ? "✅ \(transcription.displayName) OK" : "❌ \(transcription.displayName) Failed: \(res.message)"
                results.append(status)
            }
            
            self.routingValidationSummary = results.joined(separator: "\n")
            self.isValidatingRouting = false
        }
    }
    
    private func testGoogleDrive() {
        store.saveConfig()
        isValidatingGoogleDrive = true
        googleDriveResult = nil
        
        Task { @MainActor in
            let res = await GoogleDriveSyncService.shared.testConnection(config: store.config)
            switch res {
            case .success(let msg):
                self.googleDriveResult = .success(message: msg)
            case .failure(let err):
                self.googleDriveResult = .failure(message: err.localizedDescription)
            }
            self.isValidatingGoogleDrive = false
        }
    }
    
    private func validateProvider(_ provider: AIProviderType) async -> ValidationResult {
        switch provider {
        case .none:
            return .success(message: "AI Disabled")
        case .omniroute:
            return await AIConnectionValidator.shared.validateOmniRoute(
                baseURL: store.config.omnirouteBaseURL,
                apiKey: store.config.omnirouteApiKey,
                model: store.config.omnirouteModel
            )
        case .groq:
            return await AIConnectionValidator.shared.validateGroq(
                apiKey: store.config.groqApiKey,
                chatModel: store.config.groqChatModel
            )
        case .gemini:
            return await AIConnectionValidator.shared.validateGemini(
                apiKey: store.config.geminiApiKey,
                oauthToken: store.config.geminiOAuthAccessToken,
                model: store.config.geminiModel
            )
        }
    }
}

#Preview("Settings View") {
    SettingsView()
}
