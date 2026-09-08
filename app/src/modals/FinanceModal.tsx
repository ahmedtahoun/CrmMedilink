import { useEffect, useMemo, useState } from 'react'
import type { Expense, Invoice, LineItem, Quotation } from '../lib/types'
import {
  EXPENSE_CATEGORY_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  QUOTATION_STATUS_OPTIONS,
  type MarketKey,
} from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { useClinics } from '../lib/clinics'
import { nextQuotationRef, saveExpense, saveInvoice, saveQuotation } from '../lib/finance'
import { generateFinancePdf } from '../lib/pdf'
import { addDays, docTotals, fmtMoney, num, todayStr } from '../lib/format'

const QUOTE_VALID_DAYS = 30
import Modal from '../components/Modal'
import Icon from '../components/Icon'

export type FinanceKind = 'invoice' | 'quotation' | 'expense'

interface Props {
  kind: FinanceKind
  editing?: Invoice | Quotation | Expense | null
  onClose: () => void
  onSaved: () => void
}

const emptyRow = (): LineItem => ({ description: '', qty: 1, unit_price: 0 })

export default function FinanceModal({ kind, editing, onClose, onSaved }: Props) {
  const market = useAppStore((s) => s.market) as MarketKey
  const showToast = useAppStore((s) => s.showToast)
  const { clinics } = useClinics(market)
  const [saving, setSaving] = useState(false)

  const doc = kind !== 'expense' ? (editing as Invoice | Quotation | null) : null
  const exp = kind === 'expense' ? (editing as Expense | null) : null

  const [clinicId, setClinicId] = useState(doc?.clinic_id ?? '')
  const [reference, setReference] = useState(doc?.reference ?? '')
  const [issueDate, setIssueDate] = useState(doc?.issue_date ?? todayStr())
  const [dueDate, setDueDate] = useState((doc as Invoice | null)?.due_date ?? '')
  const [validUntil, setValidUntil] = useState(
    (doc as Quotation | null)?.valid_until ??
      (kind === 'quotation' && !editing ? addDays(doc?.issue_date ?? todayStr(), QUOTE_VALID_DAYS) : ''),
  )
  const [status, setStatus] = useState(
    doc?.status ?? (kind === 'invoice' ? 'Draft' : kind === 'quotation' ? 'Draft' : ''),
  )
  const [discountPct, setDiscountPct] = useState(String(doc?.discount_pct ?? 0))
  const [taxPct, setTaxPct] = useState(String(doc?.tax_pct ?? 0))
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [items, setItems] = useState<LineItem[]>(
    doc?.line_items?.length ? doc.line_items.map((li) => ({ ...li })) : [emptyRow()],
  )

  // expense fields
  const [description, setDescription] = useState(exp?.description ?? '')
  const [category, setCategory] = useState(exp?.category ?? EXPENSE_CATEGORY_OPTIONS[0])
  const [vendor, setVendor] = useState(exp?.vendor ?? '')
  const [expDate, setExpDate] = useState(exp?.date ?? todayStr())
  const [amount, setAmount] = useState(String(exp?.amount ?? ''))

  const hasLineItems = kind !== 'expense'
  const isNewQuote = kind === 'quotation' && !editing
  const totals = useMemo(() => docTotals(items, discountPct, taxPct), [items, discountPct, taxPct])

  // New quotation: auto serial reference (YYYY/MM/DD/NNN) keyed to the issue date.
  useEffect(() => {
    if (!isNewQuote) return
    let cancelled = false
    nextQuotationRef(issueDate).then((ref) => {
      if (!cancelled) setReference(ref)
    })
    return () => {
      cancelled = true
    }
  }, [isNewQuote, issueDate])

  // Keep the 30-day validity in step with the issue date for a new quotation.
  function onIssueDate(v: string) {
    setIssueDate(v)
    if (isNewQuote) setValidUntil(addDays(v, QUOTE_VALID_DAYS))
  }

  const title = `${editing ? 'Edit' : 'New'} ${kind === 'invoice' ? 'invoice' : kind === 'quotation' ? 'quotation' : 'expense'}`

  function setItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)))
  }

  async function save() {
    setSaving(true)
    let err: string | null
    if (kind === 'expense') {
      if (!description.trim()) {
        setSaving(false)
        return showToast('Add a description')
      }
      err = await saveExpense({
        id: exp?.id,
        description: description.trim(),
        category,
        vendor: vendor || null,
        date: expDate || null,
        amount: num(amount),
        notes: notes || null,
        market,
      })
    } else {
      const payload = {
        id: doc?.id,
        clinic_id: clinicId || null,
        reference: reference || null,
        issue_date: issueDate || null,
        status,
        discount_pct: num(discountPct),
        tax_pct: num(taxPct),
        notes: notes || null,
        market,
        line_items: items,
      }
      err =
        kind === 'invoice'
          ? await saveInvoice({ ...payload, due_date: dueDate || null })
          : await saveQuotation({ ...payload, valid_until: validUntil || null })
    }
    setSaving(false)
    if (err) return showToast(err)
    showToast('Saved')
    onSaved()
    onClose()
  }

  return (
    <Modal title={title} onClose={onClose}>
      {kind === 'expense' ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <label className="ml-label">Description</label>
            <input className="ml-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Trainer flight to Cairo" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="ml-label">Category</label>
              <select className="ml-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {EXPENSE_CATEGORY_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="ml-label">Vendor (optional)</label>
              <input className="ml-input" value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </div>
            <div>
              <label className="ml-label">Date</label>
              <input className="ml-input" type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
            </div>
            <div>
              <label className="ml-label">Amount</label>
              <input className="ml-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="ml-label">Clinic</label>
              <select className="ml-select" value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
                <option value="">Select a clinic…</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ml-label">{kind === 'quotation' ? 'Quotation No.' : 'PO / reference'}</label>
              <input
                className="ml-input"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                readOnly={isNewQuote}
                placeholder={kind === 'quotation' ? 'auto' : 'optional'}
                style={isNewQuote ? { background: 'var(--surface-alt-2)', color: 'var(--muted-2)' } : undefined}
                title={isNewQuote ? 'Auto-generated serial: YYYY/MM/DD/NNN' : undefined}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="ml-label">{kind === 'invoice' ? 'Issue date' : 'Date'}</label>
              <input className="ml-input" type="date" value={issueDate} onChange={(e) => onIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="ml-label">
                {kind === 'invoice' ? 'Due date' : `Valid until${isNewQuote ? ` (+${QUOTE_VALID_DAYS}d)` : ''}`}
              </label>
              <input
                className="ml-input"
                type="date"
                value={kind === 'invoice' ? dueDate : validUntil}
                onChange={(e) => (kind === 'invoice' ? setDueDate(e.target.value) : setValidUntil(e.target.value))}
              />
            </div>
            <div>
              <label className="ml-label">Status</label>
              <select className="ml-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {(kind === 'invoice' ? INVOICE_STATUS_OPTIONS : QUOTATION_STATUS_OPTIONS).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {hasLineItems && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted-4)', marginBottom: 8 }}>
            Line items
          </div>
          <div style={{ border: '1px solid var(--border-2)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 66px 96px 96px 26px',
                gap: 8,
                padding: '8px 10px',
                background: 'var(--surface-alt)',
                borderBottom: '1px solid var(--border-2)',
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--muted-4)',
              }}
            >
              <span>Description</span>
              <span>Qty</span>
              <span>Price</span>
              <span style={{ textAlign: 'right' }}>Total</span>
              <span />
            </div>
            {items.map((li, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 66px 96px 96px 26px',
                  gap: 8,
                  padding: '7px 10px',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-soft)',
                }}
              >
                <input className="ml-input" style={inputSm} value={li.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="e.g. Onboarding training — 2 days" />
                <input className="ml-input" style={inputSm} type="number" value={li.qty} onChange={(e) => setItem(i, { qty: num(e.target.value) })} />
                <input className="ml-input" style={inputSm} type="number" value={li.unit_price} onChange={(e) => setItem(i, { unit_price: num(e.target.value) })} placeholder="0" />
                <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: 'var(--text)' }}>{fmtMoney(li.qty * li.unit_price)}</span>
                {items.length > 1 ? (
                  <span onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ cursor: 'pointer', color: 'var(--muted-4)', fontSize: 16, textAlign: 'center' }}>
                    ×
                  </span>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
          <div
            onClick={() => setItems([...items, emptyRow()])}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--brand)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', marginBottom: 16 }}
          >
            <Icon name="plus" size={13} strokeWidth={2.6} />
            Add line item
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px', marginBottom: 16 }}>
            <div>
              <label className="ml-label">Discount %</label>
              <input className="ml-input" type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="ml-label">Tax %</label>
              <input className="ml-input" type="number" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div style={{ background: '#f7f9f9', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12.5 }}>
            <TotalRow label="Subtotal" value={fmtMoney(totals.subtotal)} />
            <TotalRow label="Discount" value={`− ${fmtMoney(totals.discount)}`} />
            <TotalRow label="Tax" value={`+ ${fmtMoney(totals.tax)}`} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', marginTop: 4, borderTop: '1px solid var(--border-2)', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
              <span>Total</span>
              <span>{fmtMoney(totals.total)}</span>
            </div>
          </div>
        </>
      )}

      <div style={{ marginBottom: 16 }}>
        <label className="ml-label">Notes (optional)</label>
        <textarea className="ml-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {hasLineItems && editing && (
          <button
            className="ml-btn ml-btn--ghost"
            onClick={() => {
              void generateFinancePdf(
                kind as 'invoice' | 'quotation',
                {
                  ...(editing as Invoice | Quotation),
                  clinic_id: clinicId || null,
                  reference: reference || null,
                  issue_date: issueDate || null,
                  ...(kind === 'invoice' ? { due_date: dueDate || null } : { valid_until: validUntil || null }),
                  status: status as never,
                  discount_pct: num(discountPct),
                  tax_pct: num(taxPct),
                  notes: notes || null,
                  line_items: items,
                },
                clinics.find((c) => c.id === clinicId),
                market,
                { docNumber: reference || (editing as { id: string }).id.slice(0, 8).toUpperCase() },
              ).catch((e) => console.error(e))
            }}
            style={{ flexShrink: 0, padding: 11 }}
          >
            <Icon name="download" size={14} strokeWidth={2.3} />
            PDF
          </button>
        )}
        <button className="ml-btn" onClick={save} disabled={saving} style={{ flex: 1, padding: 11 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}

const inputSm: React.CSSProperties = { padding: '7px 9px', fontSize: 12.5, borderRadius: 7 }

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: 'var(--muted-2)' }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
