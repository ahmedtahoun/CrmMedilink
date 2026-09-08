import { CLOSER_STAGES, TRAINER_STAGES } from './constants'
import type { Clinic } from './types'
import { daysUntil } from './format'

export type BoardType = 'closer' | 'trainer'

// A clinic is "closed won" — and so belongs on the trainer board — once Sales
// moves it to Commission Based OR Contract Subscription.
export const isTrainingEligible = (c: Clinic): boolean => c.cs === 'commission' || c.cs === 'signed'

export function stageDefs(board: BoardType) {
  return board === 'closer' ? CLOSER_STAGES : TRAINER_STAGES
}

export function stageTitle(board: BoardType, key: string): string {
  return stageDefs(board).find((s) => s.key === key)?.title ?? '—'
}

/** Which stage bucket a clinic lives in for a given board. */
export function clinicStage(board: BoardType, c: Clinic): string | null {
  if (board === 'closer') return c.cs
  // trainer board = every commission/subscription clinic; ts null => first stage
  if (!isTrainingEligible(c)) return null
  return c.ts ?? 'handoff'
}

export interface PipelineFilters {
  search: string
  priority: string
  category: string
  sort: string
  repFilter: string
}

export function filterAndSort(clinics: Clinic[], board: BoardType, f: PipelineFilters): Clinic[] {
  const q = f.search.trim().toLowerCase()
  const priRank: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

  let out = clinics.filter((c) => {
    if (board === 'trainer' && !isTrainingEligible(c)) return false
    if (f.priority !== 'all' && c.pri !== f.priority) return false
    if (f.category !== 'all' && c.cat !== f.category) return false
    if (f.repFilter !== 'all') {
      const rep = board === 'closer' ? c.closer : c.trainer
      if (rep !== f.repFilter) return false
    }
    if (q) {
      const hay = `${c.name} ${c.contact ?? ''} ${c.area ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  out = [...out].sort((a, b) => {
    switch (f.sort) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'recent':
        return (b.created_at ?? '').localeCompare(a.created_at ?? '')
      case 'mrr':
        return b.mrr - a.mrr
      case 'priority':
      default: {
        const p = (priRank[a.pri] ?? 3) - (priRank[b.pri] ?? 3)
        return p !== 0 ? p : a.board_order - b.board_order
      }
    }
  })
  return out
}

export interface Column {
  key: string
  title: string
  clinics: Clinic[]
}

export function buildColumns(clinics: Clinic[], board: BoardType, f: PipelineFilters): Column[] {
  const filtered = filterAndSort(clinics, board, f)
  return stageDefs(board).map((s) => ({
    key: s.key,
    title: s.title,
    clinics: filtered.filter((c) => clinicStage(board, c) === s.key),
  }))
}

export interface RiskFlag {
  label: string
  tone: 'warn' | 'danger'
}

export function riskFlags(c: Clinic): RiskFlag[] {
  const flags: RiskFlag[] = []
  const d = daysUntil(c.trial_to)
  if (d !== null) {
    if (d < 0) flags.push({ label: `Trial expired ${Math.abs(d)}d ago`, tone: 'danger' })
    else if (d <= 3) flags.push({ label: `Trial expires in ${d}d`, tone: 'warn' })
  }
  if (c.overdue) flags.push({ label: 'Overdue follow-up', tone: 'warn' })
  return flags
}

export const trialDaysLeft = (c: Clinic): number | null => daysUntil(c.trial_to)
