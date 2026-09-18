import { useState } from 'react'
import type { PublicHoliday } from '../lib/types'
import { COUNTRY_OPTIONS } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { saveHoliday, deleteHoliday } from '../lib/leaves'
import Modal from '../components/Modal'

interface Props {
  editing: PublicHoliday | null
  defaultDate?: string
  onClose: () => void
  onSaved: () => void
}

export default function HolidayModal({ editing, defaultDate, onClose, onSaved }: Props) {
  const showToast = useAppStore((s) => s.showToast)
  const [saving, setSaving] = useState(false)

  const [f, setF] = useState({
    country: editing?.country ?? COUNTRY_OPTIONS[0],
    name: editing?.name ?? '',
    date: editing?.date ?? defaultDate ?? '',
  })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    if (!f.name.trim()) return showToast('Name the holiday')
    if (!f.date) return showToast('Pick a date')
    setSaving(true)
    const err = await saveHoliday({ id: editing?.id, country: f.country, name: f.name.trim(), date: f.date })
    setSaving(false)
    if (err) return showToast(err)
    showToast(editing ? 'Holiday updated' : 'Holiday added')
    onSaved()
    onClose()
  }

  async function remove() {
    if (!editing) return
    if (!confirm(`Delete "${editing.name}"?`)) return
    setSaving(true)
    const err = await deleteHoliday(editing.id)
    setSaving(false)
    if (err) return showToast(err)
    showToast('Holiday deleted')
    onSaved()
    onClose()
  }

  return (
    <Modal title={editing ? 'Edit holiday' : 'Add public holiday'} onClose={onClose} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="ml-label">Name</label>
          <input className="ml-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Eid al-Fitr" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="ml-label">Country</label>
            <select className="ml-select" value={f.country} onChange={(e) => set('country', e.target.value)}>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ml-label">Date</label>
            <input className="ml-input" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
          </div>
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
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add holiday'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
