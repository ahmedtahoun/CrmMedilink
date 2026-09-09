import { useMemo } from 'react'
import type { Clinic } from '../lib/types'
import { CLOSER_STAGES } from '../lib/constants'
import { repColor, initials } from '../lib/styles'
import { fmtMoney } from '../lib/format'
import type { BoardType } from '../lib/pipeline'

interface Props {
  clinics: Clinic[]
  board: BoardType
}

const STAGE_ORDER = ['lead', 'visit', 'followup', 'proposal', 'commission', 'signed']

export default function PipelineAnalytics({ clinics }: Props) {
  const a = useMemo(() => {
    const total = clinics.length || 1
    const signed = clinics.filter((c) => c.cs === 'signed').length
    const convRate = Math.round((signed / total) * 100)

    // category mix
    const catCounts = new Map<string, number>()
    for (const c of clinics) catCounts.set(c.cat, (catCounts.get(c.cat) ?? 0) + 1)
    const categoryMix = [...catCounts.entries()].sort((x, y) => y[1] - x[1])
    const catMax = Math.max(1, ...categoryMix.map(([, n]) => n))
    const topCategory = categoryMix[0]

    // win rate by priority
    const priorityWinRate = (['High', 'Medium', 'Low'] as const).map((p) => {
      const rows = clinics.filter((c) => c.pri === p)
      const won = rows.filter((c) => c.cs === 'signed').length
      return { label: p, total: rows.length, signed: won, rate: rows.length ? Math.round((won / rows.length) * 100) : 0 }
    })
    const bestPriority = [...priorityWinRate].sort((x, y) => y.rate - x.rate)[0]

    // funnel (cumulative reach of each stage)
    const idxOf = (c: Clinic) => STAGE_ORDER.indexOf(c.cs)
    const funnel = CLOSER_STAGES.map((s, i) => ({
      label: s.title,
      count: clinics.filter((c) => idxOf(c) >= i).length,
    }))
    const funnelMax = Math.max(1, ...funnel.map((f) => f.count))

    // rep leaderboard
    const repMap = new Map<string, { signed: number; live: number; mrr: number }>()
    for (const c of clinics) {
      if (!c.closer) continue
      const e = repMap.get(c.closer) ?? { signed: 0, live: 0, mrr: 0 }
      if (c.cs === 'signed') e.signed += 1
      if (c.cs === 'signed' && c.ts === 'live') e.live += 1
      e.mrr += Number(c.mrr || 0)
      repMap.set(c.closer, e)
    }
    const leaderboard = [...repMap.entries()].map(([name, v]) => ({ name, ...v })).sort((x, y) => y.mrr - x.mrr)

    return { convRate, categoryMix, catMax, topCategory, priorityWinRate, bestPriority, funnel, funnelMax, leaderboard, signed, total: clinics.length }
  }, [clinics])

  if (clinics.length === 0) {
    return <div className="ml-empty" style={{ padding: '60px 0' }}>No clinics yet — analytics will populate as the pipeline fills.</div>
  }

  return (
    <div style={{ animation: 'fadeIn .3s ease' }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Stat dark label="Lead → signed conversion" value={`${a.convRate}%`} />
        <Stat label="Signed clinics" value={`${a.signed} / ${a.total}`} />
        <Stat label="Top category" value={a.topCategory ? `${a.topCategory[0]}` : '—'} sub={a.topCategory ? `${a.topCategory[1]} clinics` : ''} />
        <Stat label="Best win rate" value={a.bestPriority ? `${a.bestPriority.label}` : '—'} sub={a.bestPriority ? `${a.bestPriority.rate}%` : ''} accent />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Category mix">
          {a.categoryMix.map(([label, count]) => (
            <Bar key={label} label={label} value={String(count)} pct={(count / a.catMax) * 100} color="#7c9dd6" />
          ))}
        </Card>
        <Card title="Win rate by priority">
          {a.priorityWinRate.map((pw) => (
            <Bar
              key={pw.label}
              label={pw.label}
              value={`${pw.rate}% · ${pw.signed}/${pw.total}`}
              pct={pw.rate}
              color={pw.label === 'High' ? '#dc2626' : pw.label === 'Medium' ? '#b45309' : '#15803d'}
            />
          ))}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Conversion funnel">
          {a.funnel.map((f) => (
            <Bar key={f.label} label={f.label} value={String(f.count)} pct={(f.count / a.funnelMax) * 100} gradient />
          ))}
        </Card>
        <Card title="Rep leaderboard">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr', gap: 12, padding: '4px 4px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#7a8891', borderBottom: '1px solid #eef1f3' }}>
            <span>Rep</span>
            <span>Signed</span>
            <span>Live</span>
            <span>MRR</span>
          </div>
          {a.leaderboard.length === 0 && <div className="ml-empty" style={{ padding: 16 }}>No reps assigned yet.</div>}
          {a.leaderboard.map((l) => (
            <div key={l.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr', gap: 12, padding: '12px 4px', borderBottom: '1px solid #f2f5f6', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--ink-2)' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: repColor(l.name), color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {initials(l.name)}
                </span>
                {l.name}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{l.signed}</span>
              <span style={{ fontWeight: 700, color: 'var(--brand)' }}>{l.live}</span>
              <span style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{fmtMoney(l.mrr)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, dark, accent }: { label: string; value: string; sub?: string; dark?: boolean; accent?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 170,
        background: dark ? '#0c1920' : '#fff',
        color: dark ? '#fff' : undefined,
        border: dark ? 'none' : '1px solid var(--border-2)',
        borderRadius: 15,
        padding: '18px 20px',
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, color: dark ? '#8fb3ab' : 'var(--muted-3)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 24, color: accent ? 'var(--brand)' : dark ? '#fff' : 'var(--ink-2)' }}>
        {value}
        {sub && <span style={{ fontSize: 13, color: '#9aa7b0', fontWeight: 600 }}> · {sub}</span>}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ml-card" style={{ padding: '22px 24px' }}>
      <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 15, margin: '0 0 18px', color: 'var(--ink-2)' }}>{title}</h3>
      {children}
    </div>
  )
}

function Bar({ label, value, pct, color, gradient }: { label: string; value: string; pct: number; color?: string; gradient?: boolean }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, color: 'var(--muted-2)', marginBottom: 5 }}>
        <span>{label}</span>
        <span style={{ color: 'var(--ink-2)', fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 11, background: '#eef1f3', borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.max(2, pct)}%`,
            background: gradient ? 'linear-gradient(90deg,#17c08f,#0e9270)' : color,
            borderRadius: 99,
            transition: 'width .5s ease',
          }}
        />
      </div>
    </div>
  )
}
