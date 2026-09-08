import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { DEFAULT_FX, type MarketKey } from './constants'

export function useFxRates() {
  const [rates, setRates] = useState<Record<MarketKey, number>>(DEFAULT_FX)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('fx_rates')
      .select('market, usd_per_unit')
      .then(({ data }) => {
        if (cancelled || !data) return
        const next = { ...DEFAULT_FX }
        for (const r of data as { market: MarketKey; usd_per_unit: number }[]) {
          next[r.market] = Number(r.usd_per_unit)
        }
        setRates(next)
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  return { rates, reload }
}

export async function setFxRate(market: MarketKey, usdPerUnit: number): Promise<string | null> {
  const { error } = await supabase
    .from('fx_rates')
    .upsert({ market, usd_per_unit: usdPerUnit }, { onConflict: 'market' })
  return error ? error.message : null
}
