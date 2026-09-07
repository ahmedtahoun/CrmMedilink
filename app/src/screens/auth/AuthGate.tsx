import { useState } from 'react'
import Icon from '../../components/Icon'
import { signIn, requestPasswordReset } from '../../lib/auth'

type Screen = 'login' | 'forgot' | 'sent'

export default function AuthGate() {
  const [screen, setScreen] = useState<Screen>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onLogin() {
    setBusy(true)
    setError('')
    const err = await signIn(email, password)
    setBusy(false)
    if (err) setError(err)
  }

  async function onSendReset() {
    setBusy(true)
    await requestPasswordReset(forgotEmail)
    setBusy(false)
    setScreen('sent')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', background: '#fff' }}>
      {/* Left brand panel */}
      <div
        style={{
          width: '44%',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(900px 500px at 80% -10%,rgba(18,163,126,.3),transparent 60%),linear-gradient(160deg,#0b1a1e 0%,#0d2723 55%,#0a181c 100%)',
          color: '#eaf3f0',
          padding: '44px 40px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: 'var(--logo-grad)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-head)',
              fontWeight: 700,
              fontSize: 19,
              color: '#04201a',
            }}
          >
            M
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15.5 }}>MediLink360</div>
            <div style={{ fontSize: 11, color: '#8fb3ab', fontWeight: 600 }}>Rollout Tracker</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 360 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 1.3,
              textTransform: 'uppercase',
              color: '#5fd6ad',
              marginBottom: 16,
            }}
          >
            Restricted access
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 700,
              fontSize: 30,
              lineHeight: 1.15,
              letterSpacing: '-.8px',
              margin: '0 0 16px',
            }}
          >
            One board for every clinic rollout, from lead to live.
          </h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#a9cfc5', margin: '0 0 30px' }}>
            Sign in with the credentials your CEO or admin created for you. Accounts are issued per person —
            nobody joins this board without one.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              'Role-based views for CEO, Sales & Trainers',
              'Admins & CEO control who has access',
              'One shared, always up to date board',
            ].map((t) => (
              <div
                key={t}
                style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 13.5, color: '#cfe6de', fontWeight: 600 }}
              >
                <Icon name="check" size={16} strokeWidth={2.5} stroke="#5fd6ad" />
                {t}
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: '#5b7078', fontWeight: 600 }}>© 2026 MediLink360 · Internal system</div>
      </div>

      {/* Right form panel */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          background: '#f7f9f9',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          {screen === 'login' && (
            <>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 24, margin: '0 0 6px', color: '#12222b' }}>
                Sign in
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 26px' }}>
                Use the email and password issued to you.
              </p>
              <label className="ml-label">Email</label>
              <input
                className="ml-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@medilink360.com"
                style={{ marginBottom: 16 }}
                onKeyDown={(e) => e.key === 'Enter' && onLogin()}
              />
              <label className="ml-label">Password</label>
              <input
                className="ml-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ marginBottom: 10 }}
                onKeyDown={(e) => e.key === 'Enter' && onLogin()}
              />
              {error && (
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--danger)', marginBottom: 14 }}>{error}</div>
              )}
              <div
                onClick={() => setScreen('forgot')}
                style={{
                  textAlign: 'right',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--brand)',
                  cursor: 'pointer',
                  margin: '4px 0 22px',
                }}
              >
                Forgot password?
              </div>
              <button
                className="ml-btn"
                onClick={onLogin}
                disabled={busy}
                style={{ width: '100%', padding: 13, fontSize: 14.5, boxShadow: '0 10px 26px rgba(18,163,126,.32)' }}
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </>
          )}

          {screen === 'forgot' && (
            <>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 24, margin: '0 0 6px', color: '#12222b' }}>
                Reset password
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 26px' }}>
                Enter your email. Your CEO or admin will get a request to reset it for you.
              </p>
              <label className="ml-label">Email</label>
              <input
                className="ml-input"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@medilink360.com"
                style={{ marginBottom: 20 }}
              />
              <button className="ml-btn" onClick={onSendReset} disabled={busy} style={{ width: '100%', padding: 13, marginBottom: 14 }}>
                Send request
              </button>
              <div
                onClick={() => setScreen('login')}
                style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: 'var(--muted-2)', cursor: 'pointer' }}
              >
                ← Back to sign in
              </div>
            </>
          )}

          {screen === 'sent' && (
            <>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--ok-bg)',
                  color: 'var(--ok)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <Icon name="check" size={24} strokeWidth={2.4} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 22, margin: '0 0 8px', color: '#12222b' }}>
                Request sent
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 26px' }}>
                Your CEO or admin has been notified and will reset your password shortly.
              </p>
              <button className="ml-btn ml-btn--ghost" onClick={() => setScreen('login')} style={{ width: '100%', padding: 12 }}>
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
