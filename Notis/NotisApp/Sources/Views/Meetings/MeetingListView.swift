import SwiftUI

public struct MeetingListView: View {
    @ObservedObject private var store = DataStore.shared
    @State private var searchText = ""
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            List {
                if filteredMeetings.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "waveform")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("No Meetings Yet")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        Text("Recorded audio files and transcripts will appear here.")
                            .font(.subheadline)
                            .foregroundColor(.secondary.opacity(0.8))
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
                    .listRowBackground(Color.clear)
                } else {
                    ForEach(filteredMeetings) { meeting in
                        NavigationLink {
                            MeetingDetailView(meeting: meeting)
                        } label: {
                            MeetingRowView(meeting: meeting)
                        }
                    }
                    .onDelete { indexSet in
                        store.deleteMeeting(at: indexSet)
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search meetings, transcripts, action items...")
            .navigationTitle("Meetings")
            .toolbar {
                EditButton()
            }
        }
    }
    
    private var filteredMeetings: [Meeting] {
        if searchText.isEmpty {
            return store.meetings
        }
        return store.meetings.filter { meeting in
            meeting.title.localizedCaseInsensitiveContains(searchText) ||
            meeting.rawTranscript.localizedCaseInsensitiveContains(searchText) ||
            meeting.summary.overview.localizedCaseInsensitiveContains(searchText) ||
            meeting.actionItems.contains(where: { $0.title.localizedCaseInsensitiveContains(searchText) })
        }
    }
}

struct MeetingRowView: View {
    let meeting: Meeting
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(meeting.title)
                    .font(.headline)
                    .lineLimit(1)
                Spacer()
                statusBadge(meeting.status)
            }
            
            if !meeting.summary.overview.isEmpty {
                Text(meeting.summary.overview)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            HStack(spacing: 14) {
                Label(formattedDate(meeting.createdAt), systemImage: "calendar")
                Label(formatDuration(meeting.duration), systemImage: "clock")
                if !meeting.actionItems.isEmpty {
                    Label("\(meeting.actionItems.count) tasks", systemImage: "checklist")
                } else {
                    Label("Audio", systemImage: "waveform")
                }
            }
            .font(.caption2)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
    
    private func statusBadge(_ status: MeetingStatus) -> some View {
        let label: String
        switch status {
        case .recorded: label = "Audio"
        case .completed: label = "Analyzed"
        case .transcribing: label = "Transcribing"
        case .analyzing: label = "Analyzing"
        case .failed: label = "Failed"
        }
        
        return Text(label)
            .font(.system(size: 10, weight: .bold))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(badgeColor(status).opacity(0.15))
            .foregroundColor(badgeColor(status))
            .cornerRadius(4)
    }
    
    private func badgeColor(_ status: MeetingStatus) -> Color {
        switch status {
        case .completed: return .green
        case .analyzing, .transcribing: return .indigo
        case .recorded: return .blue
        case .failed: return .red
        }
    }
    
    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
    
    private func formatDuration(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

#Preview("Meeting List") {
    MeetingListView()
}
