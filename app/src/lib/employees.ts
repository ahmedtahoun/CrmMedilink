import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Employee } from './types'

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data, error: e }) => {
        if (cancelled) return
        if (e) setError(e.message)
        else {
          setEmployees((data as Employee[]) ?? [])
          setError(null)
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  return { employees, loading, error, reload }
}

export async function upsertEmployee(input: Partial<Employee>): Promise<string | null> {
  const { error } = await supabase.from('employees').upsert(input)
  return error ? error.message : null
}

export async function deleteEmployee(id: string): Promise<string | null> {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  return error ? error.message : null
}
