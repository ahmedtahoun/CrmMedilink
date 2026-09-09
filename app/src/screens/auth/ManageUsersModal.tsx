import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/appStore'
import { ROLE_BADGE } from '../../lib/styles'
import type { Profile } from '../../lib/types'
import type { Role } from '../../lib/constants'
import Modal from '../../components/Modal'
import Pill from '../../components/Pill'
import Icon from '../../components/Icon'

interface Props {
  me: Profile
  onClose: () => void
}

// Which roles the actor is allowed to assign to a given target row.
function assignableRoles(actorRole: Role, targetRole: Role): Role[] {
  if (targetRole === 'Admin') return [] // Admin rows are immutable in-app
  if (actorRole === 'Admin') return ['CEO', 'Sales', 'Trainer'] // Admin: everyone below Admin
  if (actorRole === 'CEO') return targetRole === 'CEO' ? [] : ['Sales', 'Trainer'] // CEO: staff only
  return []
}

function canPause(actorRole: Role, targetRole: Role): boolean {
  if (targetRole === 'Admin') return false
  if (actorRole === 'Admin') return true
  if (actorRole === 'CEO') return targetRole !== 'CEO'
  return false
}

export default function ManageUsersModal({ me, onClose }: Props) {
  const showToast = useAppStore((s) => s.showToast)
  const [rows, setRows] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setRows((data as Profile[]) ?? [])
        setLoading(false)
      })
  }, [])

  async function setRole(p: Profile, role: Role) {
    setBusy(p.id)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', p.id)
    setBusy(null)
    if (error) return showToast(error.message)
    setRows((r) => r.map((x) => (x.id === p.id ? { ...x, role } : x)))
    showToast(`${p.name} is now ${role}`)
  }

  async function toggleActive(p: Profile) {
    setBusy(p.id)
    const { error } = await supabase.from('profiles').update({ active: !p.active }).eq('id', p.id)
    setBusy(null)
    if (error) return showToast(error.message)
    setRows((r) => r.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))
    showToast(p.active ? 'Access paused' : 'Access restored')
  }

  const grid = '1.3fr 1.7fr 1fr .8fr'

  return (
    <Modal
      title="Team access"
      subtitle="Admin can manage CEO and staff. CEO can manage Sales & Trainer. Admin accounts are managed in Supabase. New logins are created in Supabase → Authentication."
      onClose={onClose}
      width={640}
    >
      <div style={{ border: '1px solid var(--border-2)', borderRadius: 12, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: grid,
            gap: 8,
            padding: '10px 14px',
            background: 'var(--surface-alt)',
            borderBottom: '1px solid var(--border-2)',
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            color: 'var(--muted-4)',
          }}
        >
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span style={{ textAlign: 'right' }}>Access</span>
        </div>

        {loading && <div className="ml-empty">Loading…</div>}
        {!loading && rows.length === 0 && <div className="ml-empty">No team logins yet.</div>}

        {rows.map((u) => {
          const roleOpts = assignableRoles(me.role, u.role)
          const editableRole = roleOpts.length > 0
          const pausable = canPause(me.role, u.role)
          const isSelf = u.id === me.id

          return (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: grid,
                gap: 8,
                padding: '11px 14px',
                borderBottom: '1px solid var(--border-soft)',
                alignItems: 'center',
                opacity: u.active ? (busy === u.id ? 0.5 : 1) : 0.55,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {u.name || '—'}
                {isSelf && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-4)' }}>(you)</span>}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--muted-2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>

              <span>
                {editableRole ? (
                  <select
                    className="ml-select"
                    value={u.role}
                    disabled={busy === u.id}
                    onChange={(e) => setRole(u, e.target.value as Role)}
                    style={{ padding: '6px 8px', fontSize: 12, width: 'auto' }}
                  >
                    {/* keep the current role visible even if it's not otherwise assignable */}
                    {[...new Set<Role>([u.role, ...roleOpts])].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Pill swatch={ROLE_BADGE[u.role] ?? { color: '#475569', bg: '#eef1f4' }}>{u.role}</Pill>
                    {u.role === 'Admin' && <Icon name="lock" size={11} strokeWidth={0} stroke="none" style={{ fill: 'var(--muted-4)' }} />}
                  </span>
                )}
              </span>

              <span style={{ textAlign: 'right' }}>
                {pausable ? (
                  <span
                    onClick={() => busy !== u.id && toggleActive(u)}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: u.active ? 'var(--danger)' : 'var(--brand)',
                      cursor: busy === u.id ? 'default' : 'pointer',
                    }}
                  >
                    {u.active ? 'Pause' : 'Restore'}
                  </span>
                ) : (
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--empty)' }}>
                    {u.active ? 'Active' : 'Paused'}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
