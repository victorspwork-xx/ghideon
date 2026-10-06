# Notis — AI Meeting Recorder & Intelligence for iOS

**Notis** is a native iOS application crafted for meeting capture, automated transcription, multi-participant detection/diarization, executive summaries, and actionable task extraction.

Designed for self-hosted / personal use and TestFlight deployment.

---

## Key Features

1. **Uninterrupted Background Audio Recording**:
   - Audio continues recording reliably when you lock your iPhone, turn off the screen, or switch to other applications.
   - Built on `AVAudioSession` with `.playAndRecord` / `.spokenAudio` and background audio capability (`UIBackgroundModes = ["audio"]`).
   - High-fidelity AAC (`.m4a`) master recording stored permanently on device.

2. **Master Audio & Document Persistence**:
   - All original recordings are stored locally under the sandboxed App Documents directory (`Documents/Recordings/`).
   - Full transcript, participant lists, summaries, and action checklists are linked directly to each audio file.

3. **Multi-Participant & Speaker Diarization**:
   - Detects whether multiple people are in the meeting.
   - Segments utterances by speaker with precise start/end timestamps.
   - Interactive audio player allows jumping directly to any speaker's quote with a single tap.

4. **Executive Summaries & Action Items**:
   - Extracts a crisp title, executive overview, key discussion topics, and decisions made.
   - Generates interactive, checkable action items (with assignee and deadline).
   - Instant 1-tap export/sharing to iOS Notes, Reminders, Slack, or Clipboard.

5. **Flexible AI Routing (OmniRoute, Groq, Gemini)**:
   - **OmniRoute API**: Connect your custom OmniRoute endpoint and API key to route transcription and LLM processing dynamically.
   - **Groq API**: Blazing-fast Whisper-large-v3 transcription + LLaMA 3.3 models.
   - **Google Gemini**: Direct multimodal audio understanding + diarization and structured JSON output using either your Gemini API Key or OAuth Bearer token.
   - Configure credentials and switch providers on the fly in the **Settings** tab. Keys are securely kept in the iOS Keychain.

---

## Project Structure

```
Notis/
├── Notis.xcodeproj/             # Xcode project (generated via xcodegen)
├── project.yml                  # XcodeGen specification
├── README.md
└── NotisApp/
    ├── Resources/
    │   └── Info.plist           # Microhpone permission & UIBackgroundModes (audio, processing)
    └── Sources/
        ├── App/
        │   └── NotisApp.swift   # Main SwiftUI App entry & background audio configuration
        ├── Models/
        │   ├── Meeting.swift    # Meeting, TranscriptSegment, Participant, ActionItem, MeetingSummary
        │   └── ProviderConfig.swift # Multi-provider AI settings model
        ├── Services/
        │   ├── Audio/
        │   │   ├── AudioRecorderService.swift  # Background AVAudioRecorder & live metering
        │   │   └── AudioPlayerService.swift    # Audio playback with scrub & rate control
        │   ├── AI/
        │   │   ├── AIServiceProtocol.swift     # Common AI transcription & analysis interface
        │   │   ├── OmniRouteClient.swift       # OmniRoute API integration
        │   │   ├── GroqClient.swift            # Groq Whisper & Chat API integration
        │   │   ├── GeminiClient.swift          # Gemini multimodal & structured output API
        │   │   └── MeetingProcessingPipeline.swift # End-to-end background processing orchestrator
        │   └── Storage/
        │       ├── DataStore.swift             # Local JSON & master audio persistence
        │       └── KeychainManager.swift       # Secure Apple Keychain wrapper for API keys
        └── Views/
            ├── MainTabView.swift               # Tab bar (Record, Meetings, Settings)
            ├── Record/
            │   ├── RecordView.swift            # One-tap lock-safe recording screen
            │   └── WaveformVisualizer.swift    # Real-time audio waveform
            ├── Meetings/
            │   ├── MeetingListView.swift       # Chronological list + full-text search
            │   ├── MeetingDetailView.swift     # Player, transcript, summary & tasks
            │   ├── TranscriptView.swift        # Diarized speaker segments & jump-to-audio
            │   └── ActionItemsView.swift       # Checkable action items & task export
            └── Settings/
                └── SettingsView.swift          # OmniRoute, Groq & Gemini configuration
```

---

## How to Open and Deploy to TestFlight

1. **Accept the Xcode License** (if not already done):
   ```bash
   sudo xcodebuild -license accept
   ```

2. **Open the Project in Xcode**:
   ```bash
   open Notis.xcodeproj
   ```

3. **Set Up Signing & Team**:
   - In Xcode, select the **Notis** target.
   - Under **Signing & Capabilities**, select your Apple Developer Team.
   - The bundle identifier is set to `io.westpoint.notis` (customize as needed).

4. **Verify Capabilities**:
   - Under **Signing & Capabilities**, verify that **Background Modes** is active with:
     - **Audio, AirPlay, and Picture in Picture** (ensures recording persists with screen locked).
     - **Background processing**.

5. **Deploy to TestFlight**:
   - Select the target **Any iOS Device (arm64)**.
   - In Xcode menu, click **Product $\to$ Archive**.
   - In the Organizer window, click **Distribute App $\to$ TestFlight & App Store**.
   - Your build will appear in App Store Connect / TestFlight ready for testing on your iPhone.
