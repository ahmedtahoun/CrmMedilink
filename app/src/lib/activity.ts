import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { MarketKey } from './constants'

export interface ActivityRow {
  id: string
  clinic_id: string
  clinic_name: string
  author: string
  type: string
  text: string
  created_at: string
  edited: boolean
}

interface ClinicCommentJoinRow {
  id: string
  clinic_id: string
  author: string
  type: string
  text: string
  created_at: string
  edited: boolean
  clinics: { name: string } | { name: string }[] | null
}

// CEO/Admin-only: every comment logged against every clinic in a market, so
// leadership can read the sales/training narrative in one place instead of
// opening each clinic. RLS already lets CEO/Admin read clinic_comments
// across every market; the .eq('clinics.market', ...) filter just scopes
// this view to whichever market is currently selected.
export function useActivityFeed(market: MarketKey) {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    const t0 = setTimeout(() => !cancelled && setLoading(true), 0)
    supabase
      .from('clinic_comments')
      .select('id, clinic_id, author, type, text, created_at, edited, clinics!inner(name)')
      .eq('clinics.market', market)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error: err }) => {
        if (cancelled) return
        clearTimeout(t0)
        setLoading(false)
        if (err) {
          setError(err.message)
          return
        }
        setError(null)
        const joined = (data ?? []) as unknown as ClinicCommentJoinRow[]
        setRows(
          joined.map((r) => {
            const clinic = Array.isArray(r.clinics) ? r.clinics[0] : r.clinics
            return {
              id: r.id,
              clinic_id: r.clinic_id,
              clinic_name: clinic?.name ?? '—',
              author: r.author,
              type: r.type,
              text: r.text,
              created_at: r.created_at,
              edited: r.edited,
            }
          }),
        )
      })
    return () => {
      cancelled = true
      clearTimeout(t0)
    }
  }, [market, tick])

  return { rows, loading, error, reload }
}
