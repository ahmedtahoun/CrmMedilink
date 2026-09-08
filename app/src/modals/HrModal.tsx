import { useState } from 'react'
import type { Employee } from '../lib/types'
import {
  COUNTRY_OPTIONS,
  EMPLOYEE_STATUS,
  EMPLOYMENT_TYPES,
  HR_CURRENCIES,
  HR_DEPARTMENTS,
  HR_POSITIONS,
} from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { upsertEmployee } from '../lib/employees'
import { num } from '../lib/format'
import Modal from '../components/Modal'

interface Props {
  editing: Employee | null
  onClose: () => void
  onSaved: () => void
}

type Tab = 'personal' | 'job' | 'salary' | 'notes'

export default function HrModal({ editing, onClose, onSaved }: Props) {
  const showToast = useAppStore((s) => s.showToast)
  const [tab, setTab] = useState<Tab>('personal')
  const [saving, setSaving] = useState(false)

  const [f, setF] = useState({
    name: editing?.name ?? '',
    email: editing?.email ?? '',
    phone: editing?.phone ?? '',
    country: editing?.country ?? 'Egypt',
    department: editing?.department ?? '',
    position: editing?.position ?? '',
    employment_type: editing?.employment_type ?? 'Full-time',
    status: editing?.status ?? 'active',
    start_date: editing?.start_date ?? '',
    manager: editing?.manager ?? '',
    base_salary: editing?.base_salary != null ? String(editing.base_salary) : '',
    currency: editing?.currency ?? 'USD',
    commission_rate: editing?.commission_rate != null ? String(editing.commission_rate) : '',
    allowance: editing?.allowance != null ? String(editing.allowance) : '',
    notes: editing?.notes ?? '',
  })
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    if (!f.name.trim()) return showToast('Name is required')
    setSaving(true)
    const err = await upsertEmployee({
      id: editing?.id,
      name: f.name.trim(),
      email: f.email || null,
      phone: f.phone || null,
      country: f.country,
      department: f.department || null,
      position: f.position || null,
      employment_type: f.employment_type || null,
      status: f.status as Employee['status'],
      start_date: f.start_date || null,
      manager: f.manager || null,
      base_salary: f.base_salary ? num(f.base_salary) : null,
      currency: f.currency,
      commission_rate: f.commission_rate ? num(f.commission_rate) : null,
      allowance: f.allowance ? num(f.allowance) : null,
      notes: f.notes || null,
    })
    setSaving(false)
    if (err) return showToast(err)
    showToast(editing ? 'Employee updated' : 'Employee added')
    onSaved()
    onClose()
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'personal', label: 'Personal' },
    { key: 'job', label: 'Job' },
    { key: 'salary', label: 'Compensation' },
    { key: 'notes', label: 'Notes' },
  ]

  return (
    <Modal title={editing ? `Edit ${editing.name}` : 'Add employee'} onClose={onClose} width={660}>
      <div style={{ display: 'flex', gap: 4, background: 'var(--tab-track-2)', padding: 4, borderRadius: 11, marginBottom: 22, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <div
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 13px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? 'var(--ink)' : 'var(--muted-3)',
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'personal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label className="ml-label">Full name</label>
            <input className="ml-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="ml-label">Email</label>
            <input className="ml-input" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@medilink360.com" />
          </div>
          <div>
            <label className="ml-label">Phone</label>
            <input className="ml-input" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="ml-label">Country</label>
            <select className="ml-select" value={f.country} onChange={(e) => set('country', e.target.value)}>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {tab === 'job' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="ml-label">Department</label>
            <select className="ml-select" value={f.department} onChange={(e) => set('department', e.target.value)}>
              <option value="">Select…</option>
              {HR_DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ml-label">Position</label>
            <select className="ml-select" value={f.position} onChange={(e) => set('position', e.target.value)}>
              <option value="">Select…</option>
              {HR_POSITIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ml-label">Employment type</label>
            <select className="ml-select" value={f.employment_type} onChange={(e) => set('employment_type', e.target.value)}>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ml-label">Status</label>
            <select className="ml-select" value={f.status} onChange={(e) => set('status', e.target.value)}>
              {EMPLOYEE_STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ml-label">Start date</label>
            <input className="ml-input" type="date" value={f.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="ml-label">Manager</label>
            <input className="ml-input" value={f.manager} onChange={(e) => set('manager', e.target.value)} placeholder="Ahmed Hassan" />
          </div>
        </div>
      )}

      {tab === 'salary' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="ml-label">Base salary</label>
            <input className="ml-input" type="number" value={f.base_salary} onChange={(e) => set('base_salary', e.target.value)} placeholder="1200" />
          </div>
          <div>
            <label className="ml-label">Currency</label>
            <select className="ml-select" value={f.currency} onChange={(e) => set('currency', e.target.value)}>
              {HR_CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ml-label">Commission rate (%)</label>
            <input className="ml-input" type="number" value={f.commission_rate} onChange={(e) => set('commission_rate', e.target.value)} placeholder="5" />
          </div>
          <div>
            <label className="ml-label">Allowance (optional)</label>
            <input className="ml-input" type="number" value={f.allowance} onChange={(e) => set('allowance', e.target.value)} placeholder="0" />
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <textarea
          className="ml-textarea"
          value={f.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Anything worth remembering about this hire…"
          style={{ height: 160 }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
        <button className="ml-btn ml-btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="ml-btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add employee'}
        </button>
      </div>
    </Modal>
  )
}
