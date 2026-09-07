import { useMemo, useState } from 'react'
import {
  BUSINESS_TYPES,
  CLINIC_CATEGORIES,
  CURRENT_SYSTEMS,
  HEALTHCARE_TYPES,
  MEDICAL_CATEGORIES,
  PRIORITIES,
  SEGMENTS,
  marketCountry,
} from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { useEmployees } from '../lib/employees'
import { createClinic } from '../lib/clinics'
import Modal from '../components/Modal'

interface Props {
  onClose: () => void
  asProvider?: boolean
}

export default function AddClinicModal({ onClose, asProvider }: Props) {
  const market = useAppStore((s) => s.market)
  const showToast = useAppStore((s) => s.showToast)
  const { employees } = useEmployees()
  const [saving, setSaving] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const [f, setF] = useState({
    name: '',
    cat: 'General',
    pri: 'Medium',
    area: '',
    street: '',
    contact: '',
    phone: '',
    email: '',
    website: '',
    healthcare_type: '',
    business_type: '',
    segment: '',
    ownership: '',
    chain_name: '',
    current_system: '',
    closer: '',
    trainer: '',
    medical_cats: [] as string[],
  })
  const set = (k: keyof typeof f, v: string | string[]) => setF((p) => ({ ...p, [k]: v }))

  const country = marketCountry(market)
  const closers = useMemo(
    () => employees.filter((e) => e.status === 'active' && e.country === country && /sales/i.test(e.position ?? '')).map((e) => e.name),
    [employees, country],
  )
  const trainers = useMemo(
    () => employees.filter((e) => e.status === 'active' && e.country === country && /train/i.test(e.position ?? '')).map((e) => e.name),
    [employees, country],
  )

  async function save() {
    if (!f.name.trim()) return showToast('Clinic name is required')
    setSaving(true)
    const { error } = await createClinic({
      name: f.name.trim(),
      cat: f.cat,
      pri: f.pri as 'High' | 'Medium' | 'Low',
      area: f.area || null,
      street: f.street || null,
      contact: f.contact || null,
      phone: f.phone || null,
      email: f.email || null,
      website: f.website || null,
      healthcare_type: f.healthcare_type || null,
      business_type: f.business_type || null,
      segment: f.segment || null,
      ownership: f.ownership || null,
      chain_name: f.chain_name || null,
      current_system: f.current_system || null,
      closer: f.closer || null,
      trainer: f.trainer || null,
      medical_cats: f.medical_cats,
      market,
      cs: 'lead',
      is_provider: !!asProvider,
      cs_date: new Date().toISOString().slice(0, 10),
    })
    setSaving(false)
    if (error) return showToast(error)
    showToast(asProvider ? 'Provider added' : 'Clinic added to pipeline')
    onClose()
  }

  const toggleMedCat = (c: string) =>
    set('medical_cats', f.medical_cats.includes(c) ? f.medical_cats.filter((x) => x !== c) : [...f.medical_cats, c])

  return (
    <Modal title={asProvider ? 'Add provider' : 'Add clinic'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="ml-label">Clinic name *</label>
          <input className="ml-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Cairo Family Clinic" />
        </div>
        <div>
          <label className="ml-label">Category</label>
          <select className="ml-select" value={f.cat} onChange={(e) => set('cat', e.target.value)}>
            {CLINIC_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="ml-label">Priority</label>
          <select className="ml-select" value={f.pri} onChange={(e) => set('pri', e.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="ml-label">Area</label>
          <input className="ml-input" value={f.area} onChange={(e) => set('area', e.target.value)} placeholder="e.g. Nasr City" />
        </div>
        <div>
          <label className="ml-label">Contact person</label>
          <input className="ml-input" value={f.contact} onChange={(e) => set('contact', e.target.value)} placeholder="Dr. …" />
        </div>
        <div>
          <label className="ml-label">Phone</label>
          <input className="ml-input" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <label className="ml-label">Email</label>
          <input className="ml-input" value={f.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <label className="ml-label">Sales closer</label>
          <select className="ml-select" value={f.closer} onChange={(e) => set('closer', e.target.value)}>
            <option value="">Unassigned</option>
            {closers.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="ml-label">Trainer</label>
          <select className="ml-select" value={f.trainer} onChange={(e) => set('trainer', e.target.value)}>
            <option value="">Unassigned</option>
            {trainers.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div
        onClick={() => setShowMore((s) => !s)}
        style={{ margin: '16px 0 6px', fontSize: 12.5, fontWeight: 700, color: 'var(--brand)', cursor: 'pointer' }}
      >
        {showMore ? '− Hide' : '+ Add'} healthcare details
      </div>

      {showMore && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
          <div>
            <label className="ml-label">Healthcare type</label>
            <select className="ml-select" value={f.healthcare_type} onChange={(e) => set('healthcare_type', e.target.value)}>
              <option value="">—</option>
              {HEALTHCARE_TYPES.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ml-label">Business type</label>
            <select className="ml-select" value={f.business_type} onChange={(e) => set('business_type', e.target.value)}>
              <option value="">—</option>
              {BUSINESS_TYPES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ml-label">Segment</label>
            <select className="ml-select" value={f.segment} onChange={(e) => set('segment', e.target.value)}>
              <option value="">—</option>
              {SEGMENTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ml-label">Current system</label>
            <select className="ml-select" value={f.current_system} onChange={(e) => set('current_system', e.target.value)}>
              <option value="">—</option>
              {CURRENT_SYSTEMS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label className="ml-label">Medical categories</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {MEDICAL_CATEGORIES.map((c) => (
                <div
                  key={c}
                  onClick={() => toggleMedCat(c)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: f.medical_cats.includes(c) ? '#e3f4ee' : '#f1f4f6',
                    color: f.medical_cats.includes(c) ? '#0e6b52' : 'var(--muted-2)',
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button className="ml-btn" onClick={save} disabled={saving} style={{ width: '100%', marginTop: 18, padding: 12 }}>
        {saving ? 'Saving…' : asProvider ? 'Add provider' : 'Add to pipeline'}
      </button>
    </Modal>
  )
}
