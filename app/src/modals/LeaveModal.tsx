import { useState } from 'react'
import type { Employee, EmployeeLeave } from '../lib/types'
import { LEAVE_TYPES } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { saveLeave, deleteLeave, leaveDays } from '../lib/leaves'
import { leaveTypeStyle } from '../lib/styles'
import Modal from '../components/Modal'

interface Props {
  editing: EmployeeLeave | null
  employees: Employee[]
  defaultEmployeeId?: string
  defaultDate?: string
  onClose: () => void
  onSaved: () => void
}

export default function LeaveModal({ editing, employees, defaultEmployeeId, defaultDate, onClose, onSaved }: Props) {
  const showToast = useAppStore((s) => s.showToast)
  const [saving, setSaving] = useState(false)

  const [f, setF] = useState({
    employee_id: editing?.employee_id ?? defaultEmployeeId ?? employees[0]?.id ?? '',
    type: editing?.type ?? 'Annual',
    start_date: editing?.start_date ?? defaultDate ?? '',
    end_date: editing?.end_date ?? defaultDate ?? '',
    notes: editing?.notes ?? '',
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    if (!f.employee_id) return showToast('Pick an employee')
    if (!f.start_date || !f.end_date) return showToast('Pick a start and end date')
    if (f.end_date < f.start_date) return showToast('End date is before the start date')
    setSaving(true)
    const err = await saveLeave({
      id: editing?.id,
      employee_id: f.employee_id,
      type: f.type,
      start_date: f.start_date,
      end_date: f.end_date,
      notes: f.notes || null,
    })
    setSaving(false)
    if (err) return showToast(err)
    showToast(editing ? 'Leave updated' : 'Leave logged')
    onSaved()
    onClose()
  }

  async function remove() {
    if (!editing) return
    if (!confirm('Delete this leave entry?')) return
    setSaving(true)
    const err = await deleteLeave(editing.id)
    setSaving(false)
    if (err) return showToast(err)
    showToast('Leave deleted')
    onSaved()
    onClose()
  }

  return (
    <Modal title={editing ? 'Edit leave' : 'Log leave'} onClose={onClose} width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="ml-label">Employee</label>
          <select className="ml-select" value={f.employee_id} onChange={(e) => set('employee_id', e.target.value)}>
            {employees.length === 0 && <option value="">No employees yet</option>}
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="ml-label">Type</label>
          <div style={{ display: 'flex', gap: 7 }}>
            {LEAVE_TYPES.map((t) => (
              <div
                key={t}
                onClick={() => set('type', t)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 9,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  background: f.type === t ? leaveTypeStyle(t).bg : '#f1f4f6',
                  color: f.type === t ? leaveTypeStyle(t).color : 'var(--muted-2)',
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="ml-label">From</label>
            <input className="ml-input" type="date" value={f.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="ml-label">To</label>
            <input className="ml-input" type="date" value={f.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </div>
        </div>
        {f.start_date && f.end_date && f.end_date >= f.start_date && (
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
            {leaveDays(f.start_date, f.end_date)} day{leaveDays(f.start_date, f.end_date) > 1 ? 's' : ''}
          </div>
        )}
        <div>
          <label className="ml-label">Notes (optional)</label>
          <textarea className="ml-textarea" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
        {editing ? (
          <div onClick={remove} style={{ color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Delete
          </div>
        ) : (
          <div />
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ml-btn ml-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="ml-btn" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Log leave'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
