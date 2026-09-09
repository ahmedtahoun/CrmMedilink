import { useState } from 'react'
import type { AccessMatrix, Profile } from '../lib/types'
import {
  ACCESS_MODULE_KEYS,
  ACCESS_MODULE_LABELS,
  ACCESS_ROLE_KEYS,
  ACCESS_ROLE_LABELS,
  type AccessModuleKey,
} from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { setAccessCell } from '../lib/access'
import Icon from '../components/Icon'

interface Props {
  profile: Profile
  matrix: AccessMatrix
  onChange: () => void
}

export default function ManageAccess({ profile, matrix, onChange }: Props) {
  const showToast = useAppStore((s) => s.showToast)
  const ceoPersona = useAppStore((s) => s.ceoPersona)
  const isCeo = profile.role === 'CEO' && ceoPersona
  const [local, setLocal] = useState<AccessMatrix>(matrix)

  // keep local in sync when the upstream matrix changes identity
  const [seen, setSeen] = useState(matrix)
  if (seen !== matrix) {
    setSeen(matrix)
    setLocal(matrix)
  }

  async function toggle(role: keyof AccessMatrix, mod: AccessModuleKey) {
    const next = !local[role][mod]
    setLocal((m) => ({ ...m, [role]: { ...m[role], [mod]: next } }))
    const err = await setAccessCell(role, mod, next)
    if (err) {
      showToast(err)
      setLocal(matrix)
    } else {
      onChange()
    }
  }

  return (
    <>
      <div style={{ padding: '20px 26px 0', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 23, letterSpacing: '-.6px', margin: '0 0 4px', color: 'var(--ink)' }}>
          Manage Access
        </h1>
        <div style={{ fontSize: 13, color: 'var(--muted-4)', fontWeight: 600 }}>
          Control which of the role groups can see each workspace
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 26px 24px' }}>
        {!isCeo ? (
          <div className="ml-card" style={{ padding: 40, textAlign: 'center', color: 'var(--empty)', fontSize: 13.5, fontWeight: 600 }}>
            Only the CEO can manage role access. Switch to “Viewing as CEO”.
          </div>
        ) : (
          <div className="ml-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `minmax(140px,1.6fr) repeat(${ACCESS_ROLE_KEYS.length + 2}, minmax(72px,1fr))`,
                minWidth: 560,
              }}
            >
              <HeadCell>Module</HeadCell>
              <HeadCell>CEO</HeadCell>
              {ACCESS_ROLE_KEYS.map((r) => (
                <HeadCell key={r}>{ACCESS_ROLE_LABELS[r]}</HeadCell>
              ))}
              <HeadCell>Admin</HeadCell>

              {ACCESS_MODULE_KEYS.map((mod) => (
                <Row key={mod}>
                  <LabelCell>{ACCESS_MODULE_LABELS[mod]}</LabelCell>
                  <LockedCell />
                  {ACCESS_ROLE_KEYS.map((role) => (
                    <div key={role} style={cellWrap}>
                      <Switch on={local[role][mod]} onClick={() => toggle(role, mod)} />
                    </div>
                  ))}
                  <LockedCell />
                </Row>
              ))}
            </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const cellWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderBottom: '1px solid var(--border-soft)',
  padding: '12px 0',
}

function HeadCell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '14px 12px',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--ink)',
        textAlign: 'center',
        background: 'var(--surface-alt-2)',
        borderBottom: '1px solid var(--border-2)',
      }}
    >
      {children}
    </div>
  )
}
function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
function LabelCell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center' }}>
      {children}
    </div>
  )
}
function LockedCell() {
  return (
    <div style={cellWrap} title="Always full access">
      <Icon name="check" size={16} strokeWidth={3} stroke="#12a37e" />
    </div>
  )
}
function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <span
      onClick={onClick}
      style={{ width: 34, height: 19, borderRadius: 20, background: on ? 'var(--brand)' : '#cfd8dc', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 17 : 2,
          width: 15,
          height: 15,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .15s',
          boxShadow: '0 1px 2px rgba(0,0,0,.2)',
        }}
      />
    </span>
  )
}
