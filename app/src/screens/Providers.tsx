import { useMemo, useState } from 'react'
import type { Clinic, Profile } from '../lib/types'
import { HEALTHCARE_TYPES, MARKETS } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { useIsMobile } from '../lib/useIsMobile'
import { useClinics } from '../lib/clinics'
import { supabase } from '../lib/supabase'
import { catStyle, priStyle, initials, repColor } from '../lib/styles'
import { stageTitle } from '../lib/pipeline'
import Pill from '../components/Pill'
import Icon from '../components/Icon'
import ExportButton from '../components/ExportButton'
import { exportObjects, stampedName } from '../lib/csv'
import ClinicDetailModal from '../modals/ClinicDetailModal'
import AddClinicModal from '../modals/AddClinicModal'

const PAGE_SIZE = 12

interface Props {
  profile: Profile
  onAddClinic: () => void
}

export default function Providers({ profile }: Props) {
  const market = useAppStore((s) => s.market)
  const showToast = useAppStore((s) => s.showToast)
  const isMobile = useIsMobile()
  const { clinics, loading, error, reload } = useClinics(market)

  const [q, setQ] = useState('')
  const [typeF, setTypeF] = useState('all')
  const [statusF, setStatusF] = useState('all')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const marketLabel = MARKETS.find((m) => m.key === market)?.label ?? ''

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return clinics.filter((c) => {
      if (typeF !== 'all' && (c.healthcare_type ?? 'Clinic') !== typeF) return false
      if (statusF !== 'all' && c.sub_status !== statusF) return false
      if (needle) {
        const hay = `${c.name} ${c.area ?? ''} ${c.contact ?? ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [clinics, q, typeF, statusF])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage = Math.min(page, pageCount)
  const rows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  async function del(id: string, name: string) {
    if (!confirm(`Delete ${name}? This removes it from the pipeline too.`)) return
    const { error: e } = await supabase.from('clinics').delete().eq('id', id)
    if (e) showToast(e.message)
    else {
      showToast('Provider deleted')
      reload()
    }
  }

  const grid = '1.8fr 1.1fr 1fr .8fr 1.2fr 1fr .9fr'

  return (
    <>
      <div style={{ padding: isMobile ? '14px 14px 0' : '20px 26px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: isMobile ? 12 : 18, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: isMobile ? 18 : 23, fontWeight: 700, letterSpacing: '-.6px', color: 'var(--ink)', paddingLeft: isMobile ? 52 : 0 }}>
              Healthcare Providers <span style={{ color: 'var(--brand)', fontWeight: 600 }}>— {marketLabel}</span>
            </h1>
            {!isMobile && (
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
                Master database — referenced by Sales, Trainer, Subscriptions and Reporting
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, width: isMobile ? '100%' : undefined }}>
            <ExportButton
              disabled={filtered.length === 0}
              onClick={() =>
                exportObjects<(typeof filtered)[number]>(
                  stampedName(`providers-${market}`),
                  [
                    ['Name', (c) => c.name],
                    ['Type', (c) => c.healthcare_type ?? 'Clinic'],
                    ['Category', (c) => c.cat],
                    ['Priority', (c) => c.pri],
                    ['Area', (c) => c.area],
                    ['Contact', (c) => c.contact],
                    ['Phone', (c) => c.phone],
                    ['Email', (c) => c.email],
                    ['Sales stage', (c) => stageTitle('closer', c.cs)],
                    ['Closer', (c) => c.closer],
                    ['Trainer', (c) => c.trainer],
                    ['Subscription', (c) => c.sub_status],
                    ['MRR', (c) => c.mrr],
                    ['Trial ends', (c) => c.trial_to],
                    ['Created', (c) => c.created_at?.slice(0, 10)],
                  ],
                  filtered,
                )
              }
            />
            <button className="ml-btn" onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={16} strokeWidth={2.6} />
              Add Provider
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: isMobile ? '100%' : 200, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 13, color: '#93a1aa', display: 'flex' }}>
              <Icon name="search" size={16} strokeWidth={2} />
            </span>
            <input className="ml-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search provider, city, contact…" style={{ paddingLeft: 38, borderRadius: 11 }} />
          </div>
          <select className="ml-select" value={typeF} onChange={(e) => setTypeF(e.target.value)} style={{ flex: isMobile ? 1 : undefined, width: isMobile ? undefined : 'auto', borderRadius: 11, fontWeight: 600 }}>
            <option value="all">All types</option>
            {HEALTHCARE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className="ml-select" value={statusF} onChange={(e) => setStatusF(e.target.value)} style={{ flex: isMobile ? 1 : undefined, width: isMobile ? undefined : 'auto', borderRadius: 11, fontWeight: 600 }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="trial">Free Trial</option>
            <option value="expired">Expired</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '0 14px 20px' : '0 26px 24px', display: 'flex', flexDirection: 'column' }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading && <div className="ml-empty">Loading…</div>}
            {error && <div className="ml-empty" style={{ color: 'var(--danger)' }}>{error}</div>}
            {!loading && rows.map((c) => (
              <ProviderCard key={c.id} c={c} onOpen={() => setDetailId(c.id)} onDelete={() => del(c.id, c.name)} />
            ))}
            {!loading && filtered.length === 0 && <div className="ml-empty" style={{ padding: '40px 0' }}>No providers match your filters</div>}
          </div>
        ) : (
        <div className="ml-card" style={{ overflow: 'hidden' }}>
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
            <div>Provider</div>
            <div>Location</div>
            <div>Stage</div>
            <div>Priority</div>
            <div>Primary contact</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          {loading && <div className="ml-empty">Loading…</div>}
          {error && <div className="ml-empty" style={{ color: 'var(--danger)' }}>{error}</div>}
          {!loading && rows.map((c) => (
            <div
              key={c.id}
              onClick={() => setDetailId(c.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: grid,
                gap: 10,
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-soft)',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: repColor(c.name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {initials(c.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted-4)', fontWeight: 600 }}>{c.healthcare_type ?? 'Clinic'}</div>
                </div>
              </div>
              <div style={{ color: 'var(--muted)' }}>{c.area || '—'}</div>
              <div style={{ color: 'var(--text)' }}>{stageTitle('closer', c.cs)}</div>
              <div>
                <Pill swatch={priStyle(c.pri)}>{c.pri}</Pill>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.contact || '—'}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted-4)' }}>{c.phone || ''}</div>
              </div>
              <div>
                <Pill swatch={catStyle(c.cat)}>{c.sub_status}</Pill>
              </div>
              <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => del(c.id, c.name)}
                  style={{ padding: '5px 9px', borderRadius: 7, fontSize: 10.5, fontWeight: 700, background: '#fdf1f1', color: '#dc2626', border: '1px solid #f6d8d8', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && <div className="ml-empty" style={{ padding: '48px 0' }}>No providers match your filters</div>}
        </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 4px 0', flexShrink: 0 }}>
            <span style={{ fontSize: 12.5, color: 'var(--muted-4)', fontWeight: 600 }}>
              Showing {(curPage - 1) * PAGE_SIZE + 1}–{Math.min(curPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <div
                  key={n}
                  onClick={() => setPage(n)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: n === curPage ? 'var(--brand)' : '#fff',
                    color: n === curPage ? '#fff' : 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {detailId && (
        <ClinicDetailModal clinicId={detailId} profile={profile} board="closer" onClose={() => setDetailId(null)} />
      )}
      {addOpen && <AddClinicModal asProvider onClose={() => setAddOpen(false)} />}
    </>
  )
}

function ProviderCard({ c, onOpen, onDelete }: { c: Clinic; onOpen: () => void; onDelete: () => void }) {
  return (
    <div className="ml-card" onClick={onOpen} style={{ padding: '13px 14px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: repColor(c.name),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {initials(c.name)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 14, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.name}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {(c.healthcare_type ?? 'Clinic')} · {c.area || '—'}
          </div>
        </div>
        <span
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', flexShrink: 0 }}
        >
          Delete
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        <Pill swatch={catStyle(c.cat)}>{c.cat}</Pill>
        <Pill swatch={priStyle(c.pri)}>{c.pri}</Pill>
        <Pill swatch={{ color: '#475569', bg: '#eef1f4' }}>{stageTitle('closer', c.cs)}</Pill>
        <Pill
          swatch={
            c.sub_status === 'active'
              ? { color: '#0e9b76', bg: '#e3f4ee' }
              : c.sub_status === 'inactive'
                ? { color: '#dc2626', bg: '#fdecec' }
                : { color: '#b45309', bg: '#fbf1e0' }
          }
        >
          {c.sub_status}
        </Pill>
      </div>
      {(c.contact || c.phone) && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>
          {[c.contact, c.phone].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  )
}
