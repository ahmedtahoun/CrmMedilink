import { useMemo, useState } from 'react'
import type { Employee, Profile } from '../lib/types'
import { COUNTRY_OPTIONS, HR_DEPARTMENTS } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { useEmployees, upsertEmployee, deleteEmployee } from '../lib/employees'
import { initials, repColor } from '../lib/styles'
import { shortDay } from '../lib/format'
import Icon from '../components/Icon'
import Pill from '../components/Pill'
import ExportButton from '../components/ExportButton'
import { exportObjects, stampedName } from '../lib/csv'
import HrModal from '../modals/HrModal'

interface Props {
  profile: Profile
}

export default function Hr({ profile }: Props) {
  const showToast = useAppStore((s) => s.showToast)
  const { employees, loading, reload } = useEmployees()
  const canEdit = profile.role === 'CEO' || profile.role === 'Admin'

  const [q, setQ] = useState('')
  const [countryF, setCountryF] = useState('all')
  const [deptF, setDeptF] = useState('all')
  const [statusF, setStatusF] = useState('all')
  const [modal, setModal] = useState<{ editing: Employee | null } | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return employees.filter((e) => {
      if (countryF !== 'all' && e.country !== countryF) return false
      if (deptF !== 'all' && e.department !== deptF) return false
      if (statusF !== 'all' && e.status !== statusF) return false
      if (needle) {
        const hay = `${e.name} ${e.email ?? ''} ${e.position ?? ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [employees, q, countryF, deptF, statusF])

  const kpis = [
    { label: 'Headcount', value: String(employees.filter((e) => e.status === 'active').length) },
    { label: 'Countries', value: String(new Set(employees.map((e) => e.country)).size) },
    { label: 'Departments', value: String(new Set(employees.map((e) => e.department).filter(Boolean)).size) },
  ]

  const dist = (key: 'country' | 'department', keys: string[]) => {
    const counts = keys.map((k) => ({ label: k, count: employees.filter((e) => e[key] === k).length }))
    const max = Math.max(1, ...counts.map((c) => c.count))
    return counts.filter((c) => c.count > 0).map((c) => ({ ...c, pct: (c.count / max) * 100 }))
  }

  const groups = useMemo(() => {
    const byC = new Map<string, Employee[]>()
    for (const e of filtered) {
      const arr = byC.get(e.country) ?? []
      arr.push(e)
      byC.set(e.country, arr)
    }
    return [...byC.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  async function setStatus(e: Employee, status: Employee['status']) {
    const err = await upsertEmployee({ id: e.id, status })
    setMenuId(null)
    if (err) showToast(err)
    else {
      reload()
      showToast(status === 'active' ? 'Reactivated' : 'Deactivated')
    }
  }
  async function del(e: Employee) {
    setMenuId(null)
    if (!confirm(`Delete ${e.name}?`)) return
    const err = await deleteEmployee(e.id)
    if (err) showToast(err)
    else {
      reload()
      showToast('Employee deleted')
    }
  }

  const grid = '1.9fr .9fr 1.1fr 1.1fr 1fr .9fr 40px'

  return (
    <>
      <div style={{ padding: '20px 26px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 23, letterSpacing: '-.6px', margin: '0 0 4px', color: 'var(--ink)' }}>
              Team Directory
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#b45309' }}>
              <Icon name="lock" size={12} strokeWidth={0} stroke="none" style={{ fill: 'currentColor' }} />
              CEO-only workspace — salary &amp; documents are private to this view
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <ExportButton
              disabled={filtered.length === 0}
              onClick={() =>
                exportObjects<(typeof filtered)[number]>(
                  stampedName('team-directory'),
                  [
                    ['Name', (e) => e.name],
                    ['Email', (e) => e.email],
                    ['Phone', (e) => e.phone],
                    ['Country', (e) => e.country],
                    ['Department', (e) => e.department],
                    ['Position', (e) => e.position],
                    ['Employment type', (e) => e.employment_type],
                    ['Status', (e) => e.status],
                    ['Start date', (e) => e.start_date],
                    ['Manager', (e) => e.manager],
                    ['Base salary', (e) => e.base_salary],
                    ['Currency', (e) => e.currency],
                    ['Commission %', (e) => e.commission_rate],
                    ['Allowance', (e) => e.allowance],
                  ],
                  filtered,
                )
              }
            />
            {canEdit && (
              <button className="ml-btn" onClick={() => setModal({ editing: null })}>
                <Icon name="plus" size={16} strokeWidth={2.6} />
                Add Employee
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 26px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
          {kpis.map((k) => (
            <div key={k.label} className="ml-card" style={{ borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted-4)', marginBottom: 9 }}>{k.label}</div>
              <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 27, color: 'var(--ink)' }}>{k.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
          <DistCard title="Employees by Country" data={dist('country', COUNTRY_OPTIONS)} color="linear-gradient(90deg,#17c08f,#0e9270)" />
          <DistCard title="Employees by Department" data={dist('department', HR_DEPARTMENTS)} color="linear-gradient(90deg,#4f46e5,#4338ca)" />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 13, color: '#93a1aa', display: 'flex' }}>
              <Icon name="search" size={16} strokeWidth={2} />
            </span>
            <input className="ml-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, position…" style={{ paddingLeft: 38, borderRadius: 11 }} />
          </div>
          <select className="ml-select" value={countryF} onChange={(e) => setCountryF(e.target.value)} style={{ width: 'auto', borderRadius: 11, fontWeight: 600 }}>
            <option value="all">All countries</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="ml-select" value={deptF} onChange={(e) => setDeptF(e.target.value)} style={{ width: 'auto', borderRadius: 11, fontWeight: 600 }}>
            <option value="all">All departments</option>
            {HR_DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select className="ml-select" value={statusF} onChange={(e) => setStatusF(e.target.value)} style={{ width: 'auto', borderRadius: 11, fontWeight: 600 }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="left">Left</option>
          </select>
        </div>

        <div className="ml-card" style={{ overflow: 'hidden' }}>
          {loading && <div className="ml-empty">Loading…</div>}
          {!loading && filtered.length === 0 && <div className="ml-empty" style={{ padding: '48px 0' }}>No employees match your filters</div>}
          {groups.map(([country, rows]) => (
            <div key={country}>
              <div style={{ padding: '12px 20px', background: '#eef4f2', borderBottom: '1px solid var(--border-2)', fontSize: 12, fontWeight: 800, color: '#0e6b52', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {country}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: grid,
                  gap: 10,
                  padding: '13px 20px',
                  background: 'var(--surface-alt-2)',
                  borderBottom: '1px solid var(--border-2)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--muted-4)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                <div>Name</div>
                <div>Type</div>
                <div>Position</div>
                <div>Start date</div>
                <div>Base salary</div>
                <div>Status</div>
                <div />
              </div>
              {rows.map((e) => (
                <div
                  key={e.id}
                  onClick={() => canEdit && setModal({ editing: e })}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: grid,
                    gap: 10,
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border-soft)',
                    alignItems: 'center',
                    cursor: canEdit ? 'pointer' : 'default',
                    fontSize: 12,
                    opacity: e.status === 'active' ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: repColor(e.name),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 12,
                        flexShrink: 0,
                      }}
                    >
                      {initials(e.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.email}</div>
                    </div>
                  </div>
                  <div style={{ color: 'var(--muted)' }}>{e.employment_type || '—'}</div>
                  <div style={{ color: 'var(--text)' }}>{e.position || '—'}</div>
                  <div style={{ color: 'var(--muted)' }}>{shortDay(e.start_date)}</div>
                  <div style={{ color: 'var(--muted)' }}>
                    {e.base_salary != null ? `${e.currency ?? ''} ${e.base_salary}` : '—'}
                  </div>
                  <div>
                    <Pill
                      swatch={
                        e.status === 'active'
                          ? { color: '#15803d', bg: '#e7f5ec' }
                          : e.status === 'inactive'
                            ? { color: '#b45309', bg: '#fbf1e0' }
                            : { color: '#475569', bg: '#eef1f4' }
                      }
                    >
                      {e.status}
                    </Pill>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }} onClick={(ev) => ev.stopPropagation()}>
                    {canEdit && (
                      <button
                        onClick={() => setMenuId(menuId === e.id ? null : e.id)}
                        style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                      >
                        ⋮
                      </button>
                    )}
                    {menuId === e.id && (
                      <div style={{ position: 'absolute', top: 30, right: 0, background: '#fff', border: '1px solid var(--border-2)', borderRadius: 10, boxShadow: '0 12px 28px rgba(20,40,45,.14)', minWidth: 150, zIndex: 32, overflow: 'hidden' }}>
                        <MenuItem label="Edit" onClick={() => { setMenuId(null); setModal({ editing: e }) }} />
                        {e.status === 'active' ? (
                          <MenuItem label="Deactivate" color="#b45309" onClick={() => setStatus(e, 'inactive')} />
                        ) : (
                          <MenuItem label="Reactivate" color="#15803d" onClick={() => setStatus(e, 'active')} />
                        )}
                        <MenuItem label="Delete" color="#dc2626" onClick={() => del(e)} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {modal && <HrModal editing={modal.editing} onClose={() => setModal(null)} onSaved={reload} />}
    </>
  )
}

function DistCard({ title, data, color }: { title: string; data: { label: string; count: number; pct: number }[]; color: string }) {
  return (
    <div className="ml-card" style={{ borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted-4)', marginBottom: 12 }}>{title}</div>
      {data.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--empty)' }}>No data yet</div>}
      {data.map((b) => (
        <div key={b.label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, color: 'var(--muted-2)', marginBottom: 5 }}>
            <span>{b.label}</span>
            <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{b.count}</span>
          </div>
          <div style={{ height: 8, background: '#eef1f3', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${b.pct}%`, background: color, borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function MenuItem({ label, color, onClick }: { label: string; color?: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ padding: '9px 14px', fontSize: 12.5, fontWeight: 600, color: color ?? 'var(--text)', cursor: 'pointer' }}
    >
      {label}
    </div>
  )
}
