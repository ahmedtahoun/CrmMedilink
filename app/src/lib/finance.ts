import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Expense, Invoice, LineItem, Quotation, RevenueCell } from './types'
import type { MarketKey } from './constants'
import { todayStr } from './format'

type Kind = 'invoice' | 'quotation' | 'expense'

// ---------------------------------------------------------------------------
// Invoices + Quotations (each with line items)
// ---------------------------------------------------------------------------
export function useInvoices(market: MarketKey) {
  const [rows, setRows] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('invoices')
      .select('*, line_items:invoice_line_items(*)')
      .eq('market', market)
      .order('issue_date', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setRows(autoOverdue((data as Invoice[]) ?? []))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [market, tick])

  return { rows, loading, reload }
}

// Draft/Sent invoices past their due date read as Overdue (prototype line 4000).
function autoOverdue(rows: Invoice[]): Invoice[] {
  const t = todayStr()
  return rows.map((r) =>
    (r.status === 'Sent' || r.status === 'Draft') && r.due_date && r.due_date < t
      ? { ...r, status: 'Overdue' as const }
      : r,
  )
}

export function useQuotations(market: MarketKey) {
  const [rows, setRows] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('quotations')
      .select('*, line_items:quotation_line_items(*)')
      .eq('market', market)
      .order('issue_date', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setRows((data as Quotation[]) ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [market, tick])

  return { rows, loading, reload }
}

export function useExpenses(market: MarketKey) {
  const [rows, setRows] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('expenses')
      .select('*')
      .eq('market', market)
      .order('date', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setRows((data as Expense[]) ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [market, tick])

  return { rows, loading, reload }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
interface DocInput {
  id?: string
  clinic_id: string | null
  reference: string | null
  issue_date: string | null
  due_date?: string | null
  valid_until?: string | null
  status: string
  discount_pct: number
  tax_pct: number
  notes: string | null
  market: MarketKey
  line_items: LineItem[]
}

export async function saveInvoice(input: DocInput): Promise<string | null> {
  return saveDoc('invoice', input)
}
export async function saveQuotation(input: DocInput): Promise<string | null> {
  return saveDoc('quotation', input)
}

async function saveDoc(kind: 'invoice' | 'quotation', input: DocInput): Promise<string | null> {
  const table = kind === 'invoice' ? 'invoices' : 'quotations'
  const itemsTable = kind === 'invoice' ? 'invoice_line_items' : 'quotation_line_items'
  const fk = kind === 'invoice' ? 'invoice_id' : 'quotation_id'

  const head: Record<string, unknown> = {
    clinic_id: input.clinic_id,
    reference: input.reference,
    issue_date: input.issue_date,
    ...(kind === 'invoice' ? { due_date: input.due_date ?? null } : { valid_until: input.valid_until ?? null }),
    status: input.status,
    discount_pct: input.discount_pct,
    tax_pct: input.tax_pct,
    notes: input.notes,
    market: input.market,
  }

  let docId = input.id
  if (docId) {
    const { error } = await supabase.from(table).update(head).eq('id', docId)
    if (error) return error.message
    await supabase.from(itemsTable).delete().eq(fk, docId)
  } else {
    const { data, error } = await supabase.from(table).insert(head).select('id').single()
    if (error) return error.message
    docId = (data as { id: string }).id
  }

  const items = input.line_items
    .filter((li) => li.description.trim() || li.qty || li.unit_price)
    .map((li, i) => ({ [fk]: docId, description: li.description, qty: li.qty, unit_price: li.unit_price, sort: i }))
  if (items.length) {
    const { error } = await supabase.from(itemsTable).insert(items)
    if (error) return error.message
  }
  return null
}

export async function saveExpense(input: {
  id?: string
  description: string
  category: string
  vendor: string | null
  date: string | null
  amount: number
  notes: string | null
  market: MarketKey
}): Promise<string | null> {
  const { id, ...rest } = input
  const { error } = id
    ? await supabase.from('expenses').update(rest).eq('id', id)
    : await supabase.from('expenses').insert(rest)
  return error ? error.message : null
}

/**
 * Next quotation reference — a per-day serial: `YYYY/MM/DD/NNN`.
 * NNN restarts at 001 each calendar day, counting existing quotations whose
 * reference already uses today's prefix.
 */
export async function nextQuotationRef(issueDate?: string | null): Promise<string> {
  const base = issueDate || todayStr() // YYYY-MM-DD
  const prefix = base.replaceAll('-', '/') // YYYY/MM/DD
  const { data } = await supabase
    .from('quotations')
    .select('reference')
    .like('reference', `${prefix}/%`)
  let max = 0
  for (const row of (data as { reference: string | null }[]) ?? []) {
    const n = Number(row.reference?.split('/').pop())
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}/${String(max + 1).padStart(3, '0')}`
}

export async function deleteFinance(kind: Kind, id: string): Promise<string | null> {
  const table = kind === 'invoice' ? 'invoices' : kind === 'quotation' ? 'quotations' : 'expenses'
  const { error } = await supabase.from(table).delete().eq('id', id)
  return error ? error.message : null
}

export async function cycleInvoiceStatus(id: string, current: string): Promise<string | null> {
  const order = ['Draft', 'Sent', 'Paid', 'Overdue']
  const next = order[(order.indexOf(current) + 1) % order.length]
  const { error } = await supabase.from('invoices').update({ status: next }).eq('id', id)
  return error ? error.message : null
}

export async function cycleQuotationStatus(id: string, current: string): Promise<string | null> {
  const order = ['Draft', 'Sent', 'Accepted', 'Declined']
  const next = order[(order.indexOf(current) + 1) % order.length]
  const { error } = await supabase.from('quotations').update({ status: next }).eq('id', id)
  return error ? error.message : null
}

// ---------------------------------------------------------------------------
// Revenue-by-clinic-by-month grid
// ---------------------------------------------------------------------------
export function useRevenueCells(market: MarketKey, year: number) {
  const [cells, setCells] = useState<RevenueCell[]>([])
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('revenue_cells')
      .select('*')
      .eq('market', market)
      .eq('year', year)
      .then(({ data }) => {
        if (cancelled) return
        setCells((data as RevenueCell[]) ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [market, year, tick])

  return { cells, reload }
}

export async function setRevenueCell(
  clinicId: string,
  market: MarketKey,
  year: number,
  month: number,
  amount: number,
): Promise<string | null> {
  const { error } = await supabase
    .from('revenue_cells')
    .upsert({ clinic_id: clinicId, market, year, month, amount }, { onConflict: 'clinic_id,year,month' })
  return error ? error.message : null
}
