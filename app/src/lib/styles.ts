// Colour maps transcribed verbatim from MediLink360 Pitch.dc.html
// (catStyle / priStyle / repColor / eventTypeStyle / eventPriorityStyle / stageColorFor)

export interface Swatch { color: string; bg: string }

const CAT_MAP: Record<string, [string, string]> = {
  General: ['#15803d', '#e7f5ec'],
  Pediatrics: ['#0d9488', '#e2f4f2'],
  Dental: ['#4f46e5', '#ebeafd'],
  Dermatology: ['#db2777', '#fbe7f1'],
  Cardiology: ['#dc2626', '#fdeaea'],
  Gynecology: ['#9333ea', '#f2e8fc'],
  Ophthalmology: ['#0891b2', '#e2f3f8'],
  Polyclinic: ['#2563eb', '#e7f0fe'],
}
export const catStyle = (c: string): Swatch => {
  const v = CAT_MAP[c] || ['#475569', '#eef1f4']
  return { color: v[0], bg: v[1] }
}

const PRI_MAP: Record<string, [string, string]> = {
  High: ['#dc2626', '#fdecec'],
  Medium: ['#b45309', '#fbf1e0'],
  Low: ['#15803d', '#e7f5ec'],
}
export const priStyle = (p: string): Swatch => {
  const v = PRI_MAP[p] || ['#475569', '#eef1f4']
  return { color: v[0], bg: v[1] }
}

const REP_COLORS: Record<string, string> = {
  Ahmed: '#0e766e',
  Mona: '#7c3aed',
  Layla: '#b45309',
  Nourhan: '#0369a1',
  Youssef: '#be123c',
  Omar: '#15803d',
  Fatima: '#9333ea',
}
export const repColor = (n: string): string => {
  if (REP_COLORS[n]) return REP_COLORS[n]
  // deterministic fallback for names not in the seed set
  let h = 0
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360
  return `hsl(${h} 45% 38%)`
}

const EVENT_TYPE: Record<string, string> = {
  Task: '#4f46e5',
  Meeting: '#0e9b76',
  'Follow-up': '#b45309',
  Reminder: '#c2367b',
}
export const eventTypeStyle = (t: string): string => EVENT_TYPE[t] || '#647680'

const EVENT_PRI: Record<string, string> = {
  High: '#dc2626',
  Medium: '#b45309',
  Low: '#15803d',
}
export const eventPriorityStyle = (p: string): string => EVENT_PRI[p] || '#647680'

export const stageColorFor = (cs: string, ts: string | null): Swatch => {
  if (cs !== 'signed' && cs !== 'commission') return { color: '#2563eb', bg: '#eff6ff' }
  if (!ts || ts === 'handoff' || ts === 'scheduled') return { color: '#7c3aed', bg: '#f2e8fc' }
  if (ts === 'reception' || ts === 'followup') return { color: '#0891b2', bg: '#e0f7fa' }
  if (ts === 'live') return { color: '#15803d', bg: '#e7f5ec' }
  return { color: '#64748b', bg: '#eef1f4' }
}

export const ROLE_BADGE: Record<string, Swatch> = {
  CEO: { color: '#0e766e', bg: '#e3f4ee' },
  Admin: { color: '#4f46e5', bg: '#ebeafd' },
  Sales: { color: '#b45309', bg: '#fbf1e0' },
  Trainer: { color: '#0369a1', bg: '#e2f3f8' },
}

export const initials = (name: string): string =>
  (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
