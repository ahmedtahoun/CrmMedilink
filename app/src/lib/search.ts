// Typo-tolerant search for clinics: ignores case / punctuation / "Dr." /
// "Clinic" / "El-", forgives small spelling differences and common
// transliteration variants (Mohamed / Muhammad), and matches phone numbers
// however they were typed (0100…, 010 02…, +20 01145 43…).

const NOISE = new Set([
  'dr', 'doctor', 'clinic', 'clinics', 'center', 'centre', 'medical', 'hospital',
  'polyclinic', 'the', 'and', 'for', 'of', 'el', 'al',
])

const plain = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim()

// Collapse spelling variants of the same sound so "Mohamed" ≈ "Muhammad".
const phonetic = (w: string): string =>
  w
    .replace(/ph/g, 'f')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/th/g, 't')
    .replace(/sh/g, 's')
    .replace(/ou|oo|o/g, 'u')
    .replace(/ee|y|e/g, 'i')
    .replace(/[cq]/g, 'k')
    .replace(/z/g, 's')
    .replace(/j/g, 'g')
    .replace(/(.)\1+/g, '$1')

const words = (s: string): string[] => plain(s).split(' ').filter(Boolean)

function lev(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (cur[j] < rowMin) rowMin = cur[j]
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

const tolerance = (len: number): number => (len <= 3 ? 0 : len <= 6 ? 1 : 2)

// ---- phone numbers --------------------------------------------------------
const COUNTRY_CODES = ['971', '966', '974', '20']

/**
 * Canonical digits of a phone number with country code and trunk "0" removed,
 * so every way of typing the same number lines up. Safe for partial input
 * (a query like "010 02" or "+20 01145 43").
 */
export function phoneKey(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  let d = trimmed.replace(/\D/g, '')
  const international = trimmed.startsWith('+') || d.startsWith('00')
  if (d.startsWith('00')) d = d.slice(2)
  if (international || d.startsWith('200') || d.length >= 12) {
    const cc = COUNTRY_CODES.find((c) => d.startsWith(c))
    if (cc) d = d.slice(cc.length)
  }
  return d.replace(/^0+/, '')
}

// A query typed with a leading 0 / +country code is the *start* of a number
// ("0100" means 010 0…, not "…100…"), so it must match from the beginning.
const startsAtBeginning = (raw: string): boolean => {
  const t = raw.trim()
  return t.startsWith('+') || t.replace(/\D/g, '').startsWith('0')
}

const isPhoneQuery = (q: string): boolean => /^[\d\s+\-().]+$/.test(q) && q.replace(/\D/g, '').length >= 3

// ---- text -----------------------------------------------------------------
export interface SearchFields {
  /** Names / area / contact — anything matched as text. */
  text: string
  phones?: (string | null | undefined)[]
}

/**
 * 0 = no match; higher = better. 3 exact words/number, 2 spelling-tolerant,
 * so callers can rank the closest matches first.
 */
export function searchScore(fields: SearchFields, query: string): number {
  const q = query.trim()
  if (!q) return 1

  let best = 0

  if (isPhoneQuery(q)) {
    const qk = phoneKey(q)
    const anchored = startsAtBeginning(q)
    if (qk.length >= 3 && (fields.phones ?? []).some((p) => (anchored ? phoneKey(p).startsWith(qk) : phoneKey(p).includes(qk)))) best = 3
  }

  let qWords = words(q)
  const qSignificant = qWords.filter((w) => !NOISE.has(w))
  if (qSignificant.length > 0) qWords = qSignificant
  if (qWords.length === 0) return best

  const hayWords = words(fields.text)
  const hay = hayWords.map(phonetic)
  const hayCompact = hay.join('')
  let exact = true
  let all = true
  for (const w of qWords) {
    const t = phonetic(w)
    if (hay.some((h) => h.includes(t))) continue
    exact = false
    const k = tolerance(t.length)
    const fuzzy = k > 0 && hay.some((h) => lev(t, h, k) <= k || lev(t, h.slice(0, t.length), k) <= k)
    // "el kady" typed with a space vs "elkady" stored (and the reverse)
    if (fuzzy || hayCompact.includes(t)) continue
    all = false
    break
  }
  if (all) best = Math.max(best, exact ? 3 : 2)
  else if (qWords.length > 1) {
    const joined = qWords.map(phonetic).join('')
    if (hayCompact.includes(joined)) best = Math.max(best, 2)
  }
  return best
}

export const matchesSearch = (fields: SearchFields, query: string): boolean => searchScore(fields, query) > 0
