import { MARKETS, MARKET_LAUNCH, WORKSPACE_ITEMS, type Workspace } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { isCeoOrAdmin } from '../lib/auth'
import type { Profile } from '../lib/types'
import Icon from './Icon'

interface SidebarProps {
  profile: Profile
  visibleWorkspaces: Set<Workspace>
  onManageUsers: () => void
  onAddClinic: () => void
  onSignOut: () => void
}

export default function Sidebar({
  profile,
  visibleWorkspaces,
  onManageUsers,
  onAddClinic,
  onSignOut,
}: SidebarProps) {
  const { workspace, setWorkspace, market, setMarket, ceoPersona, toggleCeoPersona } = useAppStore()
  const isCeo = profile.role === 'CEO'

  return (
    <aside
      style={{
        width: 246,
        flexShrink: 0,
        background: 'var(--sidebar)',
        color: 'var(--sidebar-ink)',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 16px',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px 22px' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: 'var(--logo-grad)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-head)',
            fontWeight: 700,
            fontSize: 20,
            color: '#04201a',
          }}
        >
          M
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, color: '#fff' }}>
            MediLink360
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--sidebar-muted)', fontWeight: 600 }}>
            Rollout Tracker
          </div>
        </div>
      </div>

      <div style={sectionLabel}>WORKSPACE VIEW</div>
      {WORKSPACE_ITEMS.filter((w) => visibleWorkspaces.has(w.key)).map((w) => {
        const active = workspace === w.key
        return (
          <div
            key={w.key}
            onClick={() => setWorkspace(w.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '11px 12px 11px 10px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14.5,
              cursor: 'pointer',
              marginBottom: 3,
              background: active ? 'rgba(255,255,255,.08)' : 'transparent',
              color: active ? '#fff' : 'var(--sidebar-ink)',
              borderLeft: `2.5px solid ${active ? '#17c08f' : 'transparent'}`,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: active ? '#17c08f' : '#41535c',
                }}
              />
              {w.label}
            </span>
            {w.ceoOnly && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: '#f5c451',
                  background: 'rgba(245,196,81,.12)',
                  border: '1px solid rgba(245,196,81,.3)',
                  padding: '3px 6px',
                  borderRadius: 6,
                }}
              >
                <Icon name="lock" size={9} strokeWidth={0} stroke="none" style={{ fill: 'currentColor' }} />
                CEO
              </span>
            )}
          </div>
        )
      })}

      <div style={{ ...sectionLabel, paddingTop: 24 }}>MARKET</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {MARKETS.map((m) => {
          const active = market === m.key
          return (
            <div
              key={m.key}
              onClick={() => setMarket(m.key)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '11px 6px',
                borderRadius: 11,
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
                background: active ? 'rgba(23,192,143,.16)' : 'rgba(255,255,255,.04)',
                color: active ? '#fff' : 'var(--sidebar-ink)',
                border: `1px solid ${active ? 'rgba(23,192,143,.5)' : 'rgba(255,255,255,.09)'}`,
              }}
            >
              <span style={{ fontSize: 15 }}>{m.flag}</span>
              {m.label}
              {!m.live && (
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -4,
                    fontSize: 8.5,
                    fontWeight: 800,
                    background: '#b45309',
                    color: '#fff',
                    padding: '2px 5px',
                    borderRadius: 6,
                  }}
                  title={MARKET_LAUNCH[m.key]}
                >
                  SOON
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ flex: 1 }} />

      {isCeoOrAdmin(profile.role) && (
        <div
          onClick={onManageUsers}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.1)',
            padding: '10px 12px',
            borderRadius: 11,
            cursor: 'pointer',
            marginBottom: 10,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <Icon name="users" size={15} strokeWidth={2.2} />
          Team access
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.08)',
          padding: '9px 12px',
          borderRadius: 11,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>
          {profile.name} · {profile.role}
        </span>
        <span onClick={onSignOut} style={{ fontSize: 11.5, fontWeight: 700, color: '#f0a3a3', cursor: 'pointer' }}>
          Log out
        </span>
      </div>

      {isCeo && (
        <div
          onClick={toggleCeoPersona}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.1)',
            padding: '10px 12px',
            borderRadius: 11,
            cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>
            {ceoPersona ? 'Viewing as CEO' : 'Viewing as team'}
          </span>
          <span
            style={{
              width: 34,
              height: 19,
              borderRadius: 20,
              background: ceoPersona ? '#17c08f' : '#41535c',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: ceoPersona ? 17 : 2,
                width: 15,
                height: 15,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left .15s',
              }}
            />
          </span>
        </div>
      )}

      <div
        onClick={onAddClinic}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'var(--brand-grad)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14.5,
          padding: 14,
          borderRadius: 12,
          cursor: 'pointer',
          boxShadow: '0 8px 22px rgba(16,170,127,.28)',
        }}
      >
        <Icon name="plus" size={17} strokeWidth={2.6} />
        Add clinic
      </div>

      <div
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--sidebar-muted)',
          fontWeight: 600,
          paddingTop: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#2ee6a6',
            animation: 'pulseDot 1.8s infinite',
          }}
        />
        Shared board · live for everyone
      </div>
    </aside>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.2,
  color: '#5b7078',
  padding: '8px 8px',
}
