import { DEFAULT_FX, MARKET_BY_KEY, type MarketKey } from './constants'

export const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Thousands-separated integer-ish money, no decimals (matches prototype `fmt`).
export const fmtMoney = (v: unknown): string =>
  num(v).toLocaleString('en-US', { maximumFractionDigits: 0 })

export const fmtCurrency = (v: unknown, market: MarketKey): string =>
  `${MARKET_BY_KEY[market].currency} ${fmtMoney(v)}`

export const fmtUsd = (v: unknown): string => `$${fmtMoney(v)}`

export const toUsd = (
  amountLocal: unknown,
  market: MarketKey,
  fx: Partial<Record<MarketKey, number>> = {},
): number => num(amountLocal) * (fx[market] ?? DEFAULT_FX[market])

export const todayStr = (): string => new Date().toISOString().slice(0, 10)

export const localDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const currentMonthCursor = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// "6 Jul" style short label used on cards
export const shortDay = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`
}

export const daysUntil = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  const target = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso).getTime()
  const now = new Date(todayStr() + 'T00:00:00').getTime()
  return Math.round((target - now) / 86400000)
}

export const lineItemsTotal = (
  items: { qty?: unknown; unit_price?: unknown; price?: unknown }[],
): number =>
  items.reduce((a, li) => a + num(li.qty) * num(li.unit_price ?? li.price), 0)

export interface DocTotals {
  subtotal: number
  discount: number
  taxable: number
  tax: number
  total: number
}
export const docTotals = (
  items: { qty?: unknown; unit_price?: unknown; price?: unknown }[],
  discountPct: unknown,
  taxPct: unknown,
): DocTotals => {
  const subtotal = lineItemsTotal(items)
  const discount = subtotal * (num(discountPct) / 100)
  const taxable = subtotal - discount
  const tax = taxable * (num(taxPct) / 100)
  return { subtotal, discount, taxable, tax, total: taxable + tax }
}
