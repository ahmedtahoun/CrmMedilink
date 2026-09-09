import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/appStore'
import { ROLE_BADGE } from '../../lib/styles'
import { createTeamUser } from '../../lib/team'
import type { Profile } from '../../lib/types'
import type { Role } from '../../lib/constants'
import Modal from '../../components/Modal'
import Pill from '../../components/Pill'
import Icon from '../../components/Icon'

interface Props {
  me: Profile
  onClose: () => void
}

// Roles the actor may assign to an existing row / create.
function assignableRoles(actorRole: Role, targetRole?: Role): Role[] {
  if (targetRole === 'Admin') return [] // Admin rows are immutable in-app
  if (actorRole === 'Admin') return ['CEO', 'Sales', 'Trainer']
  if (actorRole === 'CEO') return targetRole === 'CEO' ? [] : ['Sales', 'Trainer']
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

  const createRoles = assignableRoles(me.role)
  const [draft, setDraft] = useState({ name: '', email: '', password: '', role: createRoles[0] ?? 'Sales' })
  const [creating, setCreating] = useState(false)

  function load() {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setRows((data as Profile[]) ?? [])
        setLoading(false)
      })
  }
  useEffect(load, [])

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

  async function create() {
    if (!draft.name.trim() || !draft.email.trim() || draft.password.length < 8) {
      return showToast('Name, email, and an 8+ char password are required')
    }
    setCreating(true)
    const res = await createTeamUser({
      name: draft.name.trim(),
      email: draft.email.trim(),
      password: draft.password,
      role: draft.role as Role,
    })
    setCreating(false)
    if (!res.ok) return showToast(res.error)
    showToast(`${draft.name} added as ${draft.role}`)
    setDraft({ name: '', email: '', password: '', role: createRoles[0] ?? 'Sales' })
    setTimeout(load, 400) // give the trigger a beat to write the profile
  }

  const grid = '1.3fr 1.7fr 1fr .8fr'

  return (
    <Modal title="Team access" onClose={onClose} width={640}>
      <div style={{ border: '1px solid var(--border-2)', borderRadius: 12, overflow: 'hidden', marginBottom: 22 }}>
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

      {/* Create login */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted-4)', marginBottom: 10 }}>
        Create a login
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label className="ml-label">Full name</label>
          <input className="ml-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="ml-label">Email</label>
          <input className="ml-input" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="jane@medilink360.com" />
        </div>
        <div>
          <label className="ml-label">Temporary password</label>
          <input className="ml-input" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} placeholder="8+ characters" />
        </div>
        <div>
          <label className="ml-label">Role</label>
          <select className="ml-select" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}>
            {createRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className="ml-btn" onClick={create} disabled={creating} style={{ width: '100%', padding: 11 }}>
        {creating ? 'Creating…' : 'Create login'}
      </button>
    </Modal>
  )
}
