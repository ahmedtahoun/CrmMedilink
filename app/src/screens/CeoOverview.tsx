import { useMemo } from 'react'
import type { Profile } from '../lib/types'
import { MARKETS, MARKET_LAUNCH, type MarketKey } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { useClinics } from '../lib/clinics'
import { useFxRates, setFxRate } from '../lib/fx'
import { fmtMoney } from '../lib/format'
import { repColor, initials } from '../lib/styles'
import TopBar from '../components/TopBar'

interface Props {
  profile: Profile
}

// Load every market's clinics for the exec roll-up.
function useAllClinics() {
  const eg = useClinics('egypt')
  const ae = useClinics('dubai')
  const sa = useClinics('ksa')
  const qa = useClinics('qatar')
  return useMemo(
    () => ({
      byMarket: { egypt: eg.clinics, dubai: ae.clinics, ksa: sa.clinics, qatar: qa.clinics } as Record<MarketKey, typeof eg.clinics>,
      loading: eg.loading || ae.loading || sa.loading || qa.loading,
    }),
    [eg.clinics, ae.clinics, sa.clinics, qa.clinics, eg.loading, ae.loading, sa.loading, qa.loading],
  )
}

export default function CeoOverview({ profile }: Props) {
  void profile
  const setWorkspace = useAppStore((s) => s.setWorkspace)
  const setMarket = useAppStore((s) => s.setMarket)
  const showToast = useAppStore((s) => s.showToast)
  const { rates, reload } = useFxRates()
  const { byMarket, loading } = useAllClinics()

  const marketStats = MARKETS.map((m) => {
    const rows = byMarket[m.key] ?? []
    const signed = rows.filter((c) => c.cs === 'signed').length
    const liveCount = rows.filter((c) => c.cs === 'signed' && c.ts === 'live').length
    const mrrLocal = rows.filter((c) => c.sub_status !== 'inactive').reduce((a, c) => a + Number(c.mrr || 0), 0)
    const mrrUsd = mrrLocal * (rates[m.key] ?? 0)
    return { ...m, count: rows.length, signed, liveCount, mrrLocal, mrrUsd }
  })

  const totalUsd = marketStats.reduce((a, m) => a + m.mrrUsd, 0)
  const totalClinics = marketStats.reduce((a, m) => a + m.count, 0)

  // leaderboard by closer across live markets
  const leaderboard = useMemo(() => {
    const all = Object.values(byMarket).flat()
    const map = new Map<string, { signed: number; live: number; mrr: number }>()
    for (const c of all) {
      const rep = c.closer
      if (!rep) continue
      const e = map.get(rep) ?? { signed: 0, live: 0, mrr: 0 }
      if (c.cs === 'signed') e.signed += 1
      if (c.cs === 'signed' && c.ts === 'live') e.live += 1
      e.mrr += Number(c.mrr || 0)
      map.set(rep, e)
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 6)
  }, [byMarket])

  async function onFx(m: MarketKey, v: string) {
    const err = await setFxRate(m, Number(v))
    if (err) showToast(err)
    else reload()
  }

  return (
    <>
      <TopBar title="CEO Overview" />
      <div style={{ flex: 1, overflow: 'auto', padding: '0 26px 24px', animation: 'fadeIn .3s ease' }}>
        {loading && <div className="ml-empty">Loading markets…</div>}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 220, background: '#0c1920', color: '#fff', borderRadius: 15, padding: '18px 20px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#8fb3ab', marginBottom: 6 }}>
              Total recurring revenue <span style={{ opacity: 0.7, fontWeight: 500 }}>(USD est.)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 28 }}>${fmtMoney(totalUsd)}</span>
              <span style={{ fontSize: 14, color: '#8fb3ab', fontWeight: 600 }}>/mo</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.1)' }}>
              {MARKETS.map((m) => (
                <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#8fb3ab' }}>
                  1 {m.currency} = $
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    defaultValue={rates[m.key]}
                    onBlur={(e) => onFx(m.key, e.target.value)}
                    style={{
                      width: 58,
                      background: 'rgba(255,255,255,.08)',
                      border: '1px solid rgba(255,255,255,.18)',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 6px',
                      outline: 'none',
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 170, background: '#fff', border: '1px solid var(--border-2)', borderRadius: 15, padding: '18px 20px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted-3)', marginBottom: 6 }}>Total clinics</div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 28, color: 'var(--ink-2)' }}>{totalClinics}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 20 }}>
          {marketStats.map((m) => (
            <div
              key={m.key}
              onClick={() => {
                setMarket(m.key)
                setWorkspace('closer')
              }}
              style={{
                background: '#fff',
                border: '1px solid var(--border-2)',
                borderRadius: 16,
                padding: '18px 20px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>{m.flag}</span>
                {!m.live && (
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#b45309', background: '#fef8f0', border: '1px solid #fbe7c6', padding: '2px 6px', borderRadius: 6 }}>
                    PLANNED
                  </span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 10 }}>{m.label}</div>
              {m.live ? (
                <>
                  <Row label="Clinics" value={String(m.count)} />
                  <Row label="Signed" value={String(m.signed)} />
                  <Row label="Live" value={String(m.liveCount)} accent="var(--brand)" />
                  <Row label="MRR" value={`${m.currency} ${fmtMoney(m.mrrLocal)}`} />
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted-4)', fontWeight: 600 }}>Launch {MARKET_LAUNCH[m.key]}</div>
              )}
            </div>
          ))}
        </div>

        <div className="ml-card" style={{ padding: '22px 24px' }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 15, margin: '0 0 6px', color: 'var(--ink-2)' }}>
            Closer leaderboard · all markets
          </h3>
          <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 380 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1.2fr',
              gap: 12,
              padding: '12px 4px 10px',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: '#7a8891',
              borderBottom: '1px solid #eef1f3',
            }}
          >
            <span>Rep</span>
            <span>Signed</span>
            <span>Live</span>
            <span>MRR (local)</span>
          </div>
          {leaderboard.length === 0 && <div className="ml-empty">No signed clinics yet.</div>}
          {leaderboard.map((l) => (
            <div key={l.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr', gap: 12, padding: '14px 4px', borderBottom: '1px solid #f2f5f6', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 11, fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--ink-2)' }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: repColor(l.name),
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {initials(l.name)}
                </span>
                {l.name}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{l.signed}</span>
              <span style={{ fontWeight: 700, color: 'var(--brand)' }}>{l.live}</span>
              <span style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{fmtMoney(l.mrr)}</span>
            </div>
          ))}
          </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
      <span>{label}</span>
      <span style={{ color: accent ?? 'var(--ink-2)', fontWeight: 700 }}>{value}</span>
    </div>
  )
}
