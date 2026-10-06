import SwiftUI

public struct ActionItemsView: View {
    @Binding public var actionItems: [ActionItem]
    public let onUpdated: () -> Void
    
    public init(actionItems: Binding<[ActionItem]>, onUpdated: @escaping () -> Void) {
        self._actionItems = actionItems
        self.onUpdated = onUpdated
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Actionable Tasks (\(completedCount)/\(actionItems.count))", systemImage: "checklist")
                    .font(.headline)
                Spacer()
                if !actionItems.isEmpty {
                    ShareLink(item: formattedTasksString()) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.subheadline)
                    }
                }
            }
            
            if actionItems.isEmpty {
                Text("No action items detected for this meeting.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.vertical, 8)
            } else {
                ForEach(actionItems.indices, id: \.self) { index in
                    let item = actionItems[index]
                    HStack(alignment: .top, spacing: 12) {
                        Button {
                            actionItems[index].isCompleted.toggle()
                            onUpdated()
                        } label: {
                            Image(systemName: item.isCompleted ? "checkmark.circle.fill" : "circle")
                                .foregroundColor(item.isCompleted ? .green : .secondary)
                                .font(.title3)
                        }
                        .buttonStyle(.plain)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title)
                                .font(.body)
                                .strikethrough(item.isCompleted)
                                .foregroundColor(item.isCompleted ? .secondary : .primary)
                            
                            HStack(spacing: 12) {
                                if let assignee = item.assignee, !assignee.isEmpty {
                                    HStack(spacing: 4) {
                                        Image(systemName: "person.circle")
                                        Text(assignee)
                                    }
                                    .font(.caption)
                                    .foregroundColor(.indigo)
                                }
                                
                                if let deadline = item.deadline, !deadline.isEmpty {
                                    HStack(spacing: 4) {
                                        Image(systemName: "calendar")
                                        Text(deadline)
                                    }
                                    .font(.caption)
                                    .foregroundColor(.orange)
                                }
                            }
                        }
                        
                        Spacer()
                    }
                    .padding(10)
                    .background(Color(uiColor: .secondarySystemGroupedBackground))
                    .cornerRadius(10)
                }
            }
        }
    }
    
    private var completedCount: Int {
        actionItems.filter { $0.isCompleted }.count
    }
    
    private func formattedTasksString() -> String {
        var lines: [String] = ["📋 Action Items:"]
        for item in actionItems {
            let status = item.isCompleted ? "[x]" : "[ ]"
            var line = "\(status) \(item.title)"
            if let assignee = item.assignee {
                line += " (@\(assignee))"
            }
            if let deadline = item.deadline {
                line += " (Due: \(deadline))"
            }
            lines.append(line)
        }
        return lines.joined(separator: "\n")
    }
}
