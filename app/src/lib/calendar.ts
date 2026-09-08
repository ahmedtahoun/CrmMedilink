import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { CalendarEvent } from './types'
import type { MarketKey } from './constants'

export function useCalendarEvents(market: MarketKey) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('calendar_events')
      .select('*')
      .eq('market', market)
      .order('date', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setEvents((data as CalendarEvent[]) ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [market, tick])

  useEffect(() => {
    const ch = supabase
      .channel(`cal:${market}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => reload())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [market, reload])

  return { events, loading, reload }
}

export async function saveCalendarEvent(
  input: Partial<CalendarEvent> & { title: string; date: string; market: MarketKey },
): Promise<string | null> {
  const { id, ...rest } = input
  const { error } = id
    ? await supabase.from('calendar_events').update(rest).eq('id', id)
    : await supabase.from('calendar_events').insert(rest)
  return error ? error.message : null
}

export async function deleteCalendarEvent(id: string): Promise<string | null> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  return error ? error.message : null
}

export async function toggleCalendarEventDone(id: string, done: boolean): Promise<string | null> {
  const { error } = await supabase.from('calendar_events').update({ done }).eq('id', id)
  return error ? error.message : null
}
