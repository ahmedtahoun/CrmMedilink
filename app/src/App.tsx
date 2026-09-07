import { useAuth } from './lib/auth'
import { isSupabaseConfigured } from './lib/supabase'
import AuthGate from './screens/auth/AuthGate'
import AppShell from './components/AppShell'

function FullScreenMessage({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        background: 'var(--canvas)',
        textAlign: 'center',
        padding: 32,
      }}
    >
      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 20, color: 'var(--ink)', margin: 0 }}>{title}</h1>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', maxWidth: 460, margin: 0, lineHeight: 1.6 }}>{body}</p>
    </div>
  )
}

export default function App() {
  const { loading, session, profile } = useAuth()

  if (!isSupabaseConfigured) {
    return (
      <FullScreenMessage
        title="Backend not configured"
        body="Copy app/.env.local.example to app/.env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server."
      />
    )
  }

  if (loading) {
    return <FullScreenMessage title="MediLink360" body="Loading your workspace…" />
  }

  if (!session) return <AuthGate />

  if (!profile) {
    return (
      <FullScreenMessage
        title="Account not linked"
        body="You're signed in, but this login has no profile row yet. Ask a CEO or Admin to finish setting up your account."
      />
    )
  }

  if (!profile.active) {
    return (
      <FullScreenMessage
        title="Access paused"
        body="This account has been deactivated. Contact your CEO or Admin to restore access."
      />
    )
  }

  return <AppShell profile={profile} />
}
