import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type {
  Clinic,
  ClinicComment,
  ClinicTask,
  TrainingSession,
} from './types'
import type { CloserStage, MarketKey, TrainerStage } from './constants'

// ---------------------------------------------------------------------------
// Shared clinics store: one fetch + one realtime channel per market, shared by
// every component (PipelineBoard, Providers, ClinicDetailModal, CeoOverview…).
// ---------------------------------------------------------------------------
interface MarketCache {
  data: Clinic[]
  loading: boolean
  error: string | null
  loaded: boolean
  listeners: Set<() => void>
  channel: ReturnType<typeof supabase.channel> | null
}

const caches = new Map<MarketKey, MarketCache>()

function getCache(market: MarketKey): MarketCache {
  let c = caches.get(market)
  if (!c) {
    c = { data: [], loading: false, error: null, loaded: false, listeners: new Set(), channel: null }
    caches.set(market, c)
  }
  return c
}

function emit(c: MarketCache) {
  c.listeners.forEach((l) => l())
}

async function fetchMarket(market: MarketKey) {
  const c = getCache(market)
  c.loading = true
  emit(c)
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('market', market)
    .order('board_order', { ascending: true })
  c.loading = false
  c.loaded = true
  if (error) c.error = error.message
  else {
    c.error = null
    c.data = (data as Clinic[]) ?? []
  }
  emit(c)
}

function ensureChannel(market: MarketKey) {
  const c = getCache(market)
  if (c.channel) return
  const ch = supabase.channel(`clinics:${market}:${Math.random().toString(36).slice(2)}`)
  ch.on('postgres_changes', { event: '*', schema: 'public', table: 'clinics' }, (payload) => {
    const row = (payload.new ?? payload.old) as Clinic
    if (!row || row.market !== market) return
    if (payload.eventType === 'DELETE') {
      c.data = c.data.filter((x) => x.id !== row.id)
    } else {
      const next = payload.new as Clinic
      const idx = c.data.findIndex((x) => x.id === next.id)
      if (idx === -1) c.data = [...c.data, next].sort((a, b) => a.board_order - b.board_order)
      else {
        const copy = [...c.data]
        copy[idx] = next
        c.data = copy
      }
    }
    emit(c)
  })
  ch.subscribe()
  c.channel = ch
}

export interface ClinicsApi {
  clinics: Clinic[]
  loading: boolean
  error: string | null
  reload: () => void
}

export function useClinics(market: MarketKey): ClinicsApi {
  const c = getCache(market)
  const [, force] = useState(0)

  useEffect(() => {
    const cache = getCache(market)
    const rerender = () => force((n) => n + 1)
    cache.listeners.add(rerender)
    if (!cache.loaded && !cache.loading) fetchMarket(market)
    ensureChannel(market)
    return () => {
      cache.listeners.delete(rerender)
    }
  }, [market])

  const reload = useCallback(() => {
    void fetchMarket(market)
  }, [market])

  return { clinics: c.data, loading: c.loading, error: c.error, reload }
}

export async function updateClinic(id: string, patch: Partial<Clinic>): Promise<string | null> {
  const { error } = await supabase.from('clinics').update(patch).eq('id', id)
  if (error) return error.message
  // optimistic local update across all market caches
  for (const c of caches.values()) {
    const idx = c.data.findIndex((x) => x.id === id)
    if (idx !== -1) {
      const copy = [...c.data]
      copy[idx] = { ...copy[idx], ...patch }
      c.data = copy
      emit(c)
    }
  }
  return null
}

export async function moveClinicStage(
  id: string,
  board: 'closer' | 'trainer',
  stage: CloserStage | TrainerStage,
  order: number,
): Promise<string | null> {
  const patch: Partial<Clinic> =
    board === 'closer'
      ? { cs: stage as CloserStage, board_order: order, cs_date: new Date().toISOString().slice(0, 10) }
      : { ts: stage as TrainerStage, board_order: order }
  return updateClinic(id, patch)
}

export async function bulkAssign(ids: string[], rep: string, board: 'closer' | 'trainer'): Promise<string | null> {
  const patch = board === 'closer' ? { closer: rep } : { trainer: rep }
  const { error } = await supabase.from('clinics').update(patch).in('id', ids)
  if (error) return error.message
  for (const m of caches.keys()) void fetchMarket(m)
  return null
}

export async function bulkMoveStage(
  ids: string[],
  board: 'closer' | 'trainer',
  stage: CloserStage | TrainerStage,
): Promise<string | null> {
  const patch = board === 'closer' ? { cs: stage } : { ts: stage }
  const { error } = await supabase.from('clinics').update(patch).in('id', ids)
  if (error) return error.message
  for (const m of caches.keys()) void fetchMarket(m)
  return null
}

export async function createClinic(input: Partial<Clinic>): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.from('clinics').insert(input).select('id').single()
  if (error) return { error: error.message }
  if (input.market) void fetchMarket(input.market as MarketKey)
  return { id: (data as { id: string }).id }
}

// --- clinic detail sub-resources ---
export function useClinicDetail(clinicId: string | null) {
  const [comments, setComments] = useState<ClinicComment[]>([])
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [tasks, setTasks] = useState<ClinicTask[]>([])
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!clinicId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      supabase.from('clinic_comments').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
      supabase.from('training_sessions').select('*').eq('clinic_id', clinicId).order('date', { ascending: true }),
      supabase.from('clinic_tasks').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: true }),
    ]).then(([c, s, t]) => {
      if (cancelled) return
      setComments((c.data as ClinicComment[]) ?? [])
      setSessions((s.data as TrainingSession[]) ?? [])
      setTasks((t.data as ClinicTask[]) ?? [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [clinicId, tick])

  return { comments, sessions, tasks, loading, reload }
}

export async function addComment(
  clinicId: string,
  author: string,
  authorId: string | null,
  text: string,
  type: string,
): Promise<string | null> {
  const { error } = await supabase
    .from('clinic_comments')
    .insert({ clinic_id: clinicId, author, author_id: authorId, text, type })
  return error ? error.message : null
}

export async function addSession(input: Partial<TrainingSession> & { clinic_id: string }): Promise<string | null> {
  const { error } = await supabase.from('training_sessions').insert(input)
  return error ? error.message : null
}

export async function updateSession(id: string, patch: Partial<TrainingSession>): Promise<string | null> {
  const { error } = await supabase.from('training_sessions').update(patch).eq('id', id)
  return error ? error.message : null
}

export async function addTask(clinicId: string, title: string, owner: string | null, due: string | null): Promise<string | null> {
  const { error } = await supabase.from('clinic_tasks').insert({ clinic_id: clinicId, title, owner, due })
  return error ? error.message : null
}

export async function toggleTask(id: string, done: boolean): Promise<string | null> {
  const { error } = await supabase.from('clinic_tasks').update({ done }).eq('id', id)
  return error ? error.message : null
}
