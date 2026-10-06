import { CLOSER_BOARD_STAGES, CLOSER_MOVE_STAGES, CLOSER_STAGES, TRAINER_STAGES } from './constants'
import type { Clinic } from './types'
import { daysUntil, normalizePhone } from './format'

export type BoardType = 'closer' | 'trainer'

// A clinic is "closed won" — and so belongs on the trainer board — once Sales
// moves it to Commission Based OR Contract Subscription.
export const isTrainingEligible = (c: Clinic): boolean => c.cs === 'commission' || c.cs === 'signed'
/** Clinics with a contract in place (Commission Based or Contract Subscription). */
export const isSigned = isTrainingEligible
export const isLiveClinic = (c: Clinic): boolean => isSigned(c) && c.ts === 'live'

/** Full stage list, for titles/lookups — includes Leads even though it's not a board column. */
export function stageDefs(board: BoardType) {
  return board === 'closer' ? CLOSER_STAGES : TRAINER_STAGES
}

/** Stages that actually appear as pipeline board columns. */
export function boardStageDefs(board: BoardType) {
  return board === 'closer' ? CLOSER_BOARD_STAGES : TRAINER_STAGES
}

/** Stages offered by the bulk "Move to stage" action. */
export function moveStageDefs(board: BoardType) {
  return board === 'closer' ? CLOSER_MOVE_STAGES : TRAINER_STAGES
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

// A card's "activity" date is the later of when it was created and its last
// comment — plain edits / stage moves (updated_at) deliberately don't count.
export function activityAt(c: Clinic, lastCommentAt?: string | null): string {
  const created = c.created_at ?? ''
  return lastCommentAt && lastCommentAt > created ? lastCommentAt : created
}

export function filterAndSort(
  clinics: Clinic[],
  board: BoardType,
  f: PipelineFilters,
  lastComments?: Map<string, string>,
): Clinic[] {
  const act = (c: Clinic) => activityAt(c, lastComments?.get(c.id))
  const q = f.search.trim().toLowerCase()
  const priRank: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

  let out = clinics.filter((c) => {
    // Leads live on the Leads screen, not the sales pipeline board/table.
    if (board === 'closer' && c.cs === 'lead') return false
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
      case 'activity_desc':
        return act(b).localeCompare(act(a))
      case 'activity_asc':
        return act(a).localeCompare(act(b))
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

export function buildColumns(
  clinics: Clinic[],
  board: BoardType,
  f: PipelineFilters,
  lastComments?: Map<string, string>,
): Column[] {
  const filtered = filterAndSort(clinics, board, f, lastComments)
  return boardStageDefs(board).map((s) => ({
    key: s.key,
    title: s.title,
    clinics: filtered.filter((c) => clinicStage(board, c) === s.key),
  }))
}

export interface RiskFlag {
  label: string
  tone: 'warn' | 'danger'
}

/** Contracts are flagged this many days before they end. */
export const CONTRACT_ALERT_DAYS = 60

/** Days until the contract ends, for clinics with a live contract; null otherwise. */
export function contractDaysLeft(c: Clinic): number | null {
  if (c.cs !== 'signed' && c.cs !== 'commission') return null
  if (c.sub_status === 'inactive') return null
  return daysUntil(c.sub_to)
}

/** Clinics whose contract ends within CONTRACT_ALERT_DAYS (or already ended), soonest first. */
export function contractsEndingSoon(clinics: Clinic[]): { clinic: Clinic; days: number }[] {
  return clinics
    .map((clinic) => ({ clinic, days: contractDaysLeft(clinic) }))
    .filter((x): x is { clinic: Clinic; days: number } => x.days !== null && x.days <= CONTRACT_ALERT_DAYS)
    .sort((a, b) => a.days - b.days)
}

export function riskFlags(c: Clinic): RiskFlag[] {
  const flags: RiskFlag[] = []
  const cd = contractDaysLeft(c)
  if (cd !== null && cd <= CONTRACT_ALERT_DAYS) {
    flags.push(
      cd < 0
        ? { label: `Contract ended ${Math.abs(cd)}d ago`, tone: 'danger' }
        : { label: `Contract ends in ${cd}d`, tone: cd <= 14 ? 'danger' : 'warn' },
    )
  }
  const d = daysUntil(c.trial_to)
  if (d !== null) {
    if (d < 0) flags.push({ label: `Trial expired ${Math.abs(d)}d ago`, tone: 'danger' })
    else if (d <= 3) flags.push({ label: `Trial expires in ${d}d`, tone: 'warn' })
  }
  if (c.overdue) flags.push({ label: 'Overdue follow-up', tone: 'warn' })
  return flags
}

export const trialDaysLeft = (c: Clinic): number | null => daysUntil(c.trial_to)

/**
 * Clinics that share a phone number, grouped by the normalized number —
 * only numbers used by 2+ clinics are included. Used to flag likely
 * duplicate leads in the Leads screen and the CEO overview.
 */
export function findPhoneDuplicates(clinics: Clinic[]): Map<string, Clinic[]> {
  const byPhone = new Map<string, Clinic[]>()
  for (const c of clinics) {
    const p = normalizePhone(c.phone)
    if (!p) continue
    byPhone.set(p, [...(byPhone.get(p) ?? []), c])
  }
  for (const [p, list] of byPhone) if (list.length < 2) byPhone.delete(p)
  return byPhone
}
