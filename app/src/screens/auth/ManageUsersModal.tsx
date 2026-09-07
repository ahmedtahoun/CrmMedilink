import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/appStore'
import { ROLE_BADGE } from '../../lib/styles'
import type { Profile } from '../../lib/types'
import Modal from '../../components/Modal'
import Pill from '../../components/Pill'

interface Props {
  onClose: () => void
}

export default function ManageUsersModal({ onClose }: Props) {
  const showToast = useAppStore((s) => s.showToast)
  const [rows, setRows] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

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

  async function toggleActive(p: Profile) {
    const { error } = await supabase.from('profiles').update({ active: !p.active }).eq('id', p.id)
    if (error) {
      showToast(error.message)
      return
    }
    setRows((r) => r.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))
    showToast(p.active ? 'Access paused' : 'Access restored')
  }

  return (
    <Modal
      title="Team access"
      subtitle="Deactivate or restore a login. New logins are created in the Supabase dashboard (or via an Edge Function once deployed)."
      onClose={onClose}
      width={620}
    >
      <div style={{ border: '1px solid var(--border-2)', borderRadius: 12, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 1.6fr .8fr 1fr',
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
          <span style={{ textAlign: 'right' }}>Action</span>
        </div>
        {loading && <div className="ml-empty">Loading…</div>}
        {!loading && rows.length === 0 && <div className="ml-empty">No team logins yet.</div>}
        {rows.map((u) => (
          <div
            key={u.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.3fr 1.6fr .8fr 1fr',
              gap: 8,
              padding: '11px 14px',
              borderBottom: '1px solid var(--border-soft)',
              alignItems: 'center',
              opacity: u.active ? 1 : 0.55,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>{u.name}</span>
            <span style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>{u.email}</span>
            <span>
              <Pill swatch={ROLE_BADGE[u.role] ?? { color: '#475569', bg: '#eef1f4' }}>{u.role}</Pill>
            </span>
            <span style={{ textAlign: 'right' }}>
              <span
                onClick={() => toggleActive(u)}
                style={{ fontSize: 12, fontWeight: 700, color: u.active ? 'var(--danger)' : 'var(--brand)', cursor: 'pointer' }}
              >
                {u.active ? 'Pause' : 'Restore'}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Modal>
  )
}
