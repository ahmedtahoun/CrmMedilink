import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { EmployeeLeave, PublicHoliday } from './types'

export function useEmployeeLeaves() {
  const [leaves, setLeaves] = useState<EmployeeLeave[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('employee_leaves')
      .select('*')
      .order('start_date', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setLeaves((data as EmployeeLeave[]) ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  return { leaves, loading, reload }
}

export async function saveLeave(
  input: Partial<EmployeeLeave> & { employee_id: string; type: string; start_date: string; end_date: string },
): Promise<string | null> {
  const { id, ...rest } = input
  const { error } = id
    ? await supabase.from('employee_leaves').update(rest).eq('id', id)
    : await supabase.from('employee_leaves').insert(rest)
  return error ? error.message : null
}

export async function deleteLeave(id: string): Promise<string | null> {
  const { error } = await supabase.from('employee_leaves').delete().eq('id', id)
  return error ? error.message : null
}

export function useHolidays() {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('public_holidays')
      .select('*')
      .order('date', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setHolidays((data as PublicHoliday[]) ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  return { holidays, loading, reload }
}

export async function saveHoliday(
  input: Partial<PublicHoliday> & { country: string; name: string; date: string },
): Promise<string | null> {
  const { id, ...rest } = input
  const { error } = id
    ? await supabase.from('public_holidays').update(rest).eq('id', id)
    : await supabase.from('public_holidays').insert(rest)
  return error ? error.message : null
}

export async function deleteHoliday(id: string): Promise<string | null> {
  const { error } = await supabase.from('public_holidays').delete().eq('id', id)
  return error ? error.message : null
}

/** Inclusive calendar-day count between two ISO dates. */
export const leaveDays = (start: string, end: string): number => {
  const a = new Date(start + 'T00:00:00').getTime()
  const b = new Date(end + 'T00:00:00').getTime()
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

/** Every ISO date a leave entry spans, inclusive. */
export const leaveDateRange = (start: string, end: string): string[] => {
  const out: string[] = []
  const d = new Date(start + 'T00:00:00')
  const endTime = new Date(end + 'T00:00:00').getTime()
  while (d.getTime() <= endTime) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    d.setDate(d.getDate() + 1)
  }
  return out
}
