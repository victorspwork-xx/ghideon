import SwiftUI

public struct MainTabView: View {
    @State private var selectedTab: Int = 0
    
    public init() {}
    
    public var body: some View {
        TabView(selection: $selectedTab) {
            RecordView()
                .tabItem {
                    Label("Record", systemImage: "mic.fill")
                }
                .tag(0)
            
            MeetingListView()
                .tabItem {
                    Label("Meetings", systemImage: "list.bullet.rectangle.fill")
                }
                .tag(1)
            
            SettingsView(onBack: {
                selectedTab = 0
            })
            .tabItem {
                Label("Settings", systemImage: "gearshape.fill")
            }
            .tag(2)
        }
        .tint(.indigo)
    }
}

#Preview("Main App") {
    MainTabView()
}
