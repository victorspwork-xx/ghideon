import SettingsView from '@/ui/shared/SettingsView';

export default function App() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        padding: '2rem 1rem',
        background: 'radial-gradient(ellipse at center, #fafafc 0%, #f0f2fa 60%, #e5e8f4 100%)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '34rem',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 40px rgba(30,27,75,0.08)',
          overflow: 'hidden',
          marginBottom: '2rem',
        }}
      >
        <SettingsView />
      </div>
    </div>
  );
}
