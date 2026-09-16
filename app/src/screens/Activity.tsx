import { useMemo, useState } from 'react'
import type { Profile } from '../lib/types'
import { MARKETS } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { useIsMobile } from '../lib/useIsMobile'
import { useActivityFeed, type ActivityRow } from '../lib/activity'
import { commentTypeStyle } from '../lib/styles'
import { shortDay } from '../lib/format'
import Pill from '../components/Pill'
import Icon from '../components/Icon'
import ExportButton from '../components/ExportButton'
import { exportObjects, stampedName } from '../lib/csv'

interface Props {
  profile: Profile
}

const TYPES = ['Note', 'Call', 'Visit']

export default function Activity({ profile }: Props) {
  void profile
  const market = useAppStore((s) => s.market)
  const isMobile = useIsMobile()
  const { rows, loading, error, reload } = useActivityFeed(market)

  const [q, setQ] = useState('')
  const [typeF, setTypeF] = useState('all')

  const marketLabel = MARKETS.find((m) => m.key === market)?.label ?? ''

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (typeF !== 'all' && r.type !== typeF) return false
      if (needle) {
        const hay = `${r.clinic_name} ${r.author} ${r.text}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, q, typeF])

  const stats = useMemo(() => {
    const byType: Record<string, number> = { Note: 0, Call: 0, Visit: 0 }
    for (const r of rows) byType[r.type] = (byType[r.type] ?? 0) + 1
    const weekAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000
    const last7d = rows.filter((r) => new Date(r.created_at).getTime() >= weekAgo).length
    return { total: rows.length, byType, last7d }
  }, [rows])

  return (
    <>
      <div style={{ padding: isMobile ? '14px 14px 0' : '20px 26px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: isMobile ? 12 : 18, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: isMobile ? 18 : 23, fontWeight: 700, letterSpacing: '-.6px', color: 'var(--ink)', paddingLeft: isMobile ? 52 : 0 }}>
              Activity <span style={{ color: 'var(--brand)', fontWeight: 600 }}>— {marketLabel}</span>
            </h1>
            {!isMobile && (
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
                Every note, call and visit logged across every lead — the raw signal behind the pipeline
              </p>
            )}
          </div>
          <ExportButton
            disabled={filtered.length === 0}
            onClick={() =>
              exportObjects<ActivityRow>(
                stampedName(`activity-${market}`),
                [
                  ['Date', (r) => r.created_at?.slice(0, 10)],
                  ['Clinic', (r) => r.clinic_name],
                  ['Type', (r) => r.type],
                  ['Author', (r) => r.author],
                  ['Comment', (r) => r.text],
                  ['Edited', (r) => (r.edited ? 'Yes' : 'No')],
                ],
                filtered,
              )
            }
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
          <StatCard label="Total logged" value={stats.total} />
          <StatCard label="Last 7 days" value={stats.last7d} accent="var(--brand)" />
          <StatCard label="Notes" value={stats.byType.Note ?? 0} />
          <StatCard label="Calls" value={stats.byType.Call ?? 0} />
          <StatCard label="Visits" value={stats.byType.Visit ?? 0} />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: isMobile ? '100%' : 200, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 13, color: '#93a1aa', display: 'flex' }}>
              <Icon name="search" size={16} strokeWidth={2} />
            </span>
            <input className="ml-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clinic, author, comment…" style={{ paddingLeft: 38, borderRadius: 11 }} />
          </div>
          <select className="ml-select" value={typeF} onChange={(e) => setTypeF(e.target.value)} style={{ flex: isMobile ? 1 : undefined, width: isMobile ? undefined : 'auto', borderRadius: 11, fontWeight: 600 }}>
            <option value="all">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '0 14px 20px' : '0 26px 24px' }}>
        {loading && <div className="ml-empty">Loading…</div>}
        {error && <div className="ml-empty" style={{ color: 'var(--danger)' }}>{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="ml-empty" style={{ padding: '40px 0' }}>No activity logged yet.</div>
        )}

        {!loading && filtered.length > 0 && (
          isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((r) => (
                <ActivityCard key={r.id} row={r} />
              ))}
            </div>
          ) : (
            <div className="ml-card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 760, fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-alt-2)' }}>
                      <th style={th}>Date</th>
                      <th style={th}>Clinic</th>
                      <th style={th}>Type</th>
                      <th style={th}>Author</th>
                      <th style={th}>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                        <td style={{ ...td, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{shortDay(r.created_at)}</td>
                        <td style={{ ...td, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{r.clinic_name}</td>
                        <td style={td}>
                          <Pill swatch={commentTypeStyle(r.type)}>{r.type}</Pill>
                        </td>
                        <td style={{ ...td, color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.author}</td>
                        <td style={{ ...td, color: 'var(--text-2)' }}>
                          {r.text}
                          {r.edited && <span style={{ color: 'var(--muted-4)', fontWeight: 700 }}> (edited)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {!loading && (
          <div style={{ marginTop: 14 }}>
            <span onClick={reload} style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', cursor: 'pointer' }}>
              Refresh
            </span>
          </div>
        )}
      </div>
    </>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: 'var(--muted)',
  padding: '12px 14px',
  borderBottom: '1px solid var(--border-2)',
}
const td: React.CSSProperties = { padding: '10px 14px', verticalAlign: 'top' }

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="ml-card" style={{ borderRadius: 13, padding: '13px 15px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--muted-2)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 21, color: accent ?? 'var(--ink)' }}>{value}</div>
    </div>
  )
}

function ActivityCard({ row }: { row: ActivityRow }) {
  return (
    <div className="ml-card" style={{ padding: '13px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 13.5, color: 'var(--ink)' }}>{row.clinic_name}</div>
        <span style={{ fontSize: 11, color: 'var(--muted-4)', fontWeight: 600, flexShrink: 0 }}>{shortDay(row.created_at)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Pill swatch={commentTypeStyle(row.type)}>{row.type}</Pill>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{row.author}</span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
        {row.text}
        {row.edited && <span style={{ color: 'var(--muted-4)', fontWeight: 700 }}> (edited)</span>}
      </div>
    </div>
  )
}
