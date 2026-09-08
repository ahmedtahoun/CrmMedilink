import { useMemo, useState } from 'react'
import type { Expense, Invoice, Profile, Quotation } from '../lib/types'
import { MARKET_BY_KEY, MONTHS, type MarketKey } from '../lib/constants'
import { useAppStore } from '../store/appStore'
import { useClinics } from '../lib/clinics'
import {
  useExpenses,
  useInvoices,
  useQuotations,
  useRevenueCells,
  cycleInvoiceStatus,
  cycleQuotationStatus,
  deleteFinance,
  setRevenueCell,
} from '../lib/finance'
import { docTotals, fmtMoney, num, shortDay } from '../lib/format'
import Pill from '../components/Pill'
import Icon from '../components/Icon'
import ExportButton from '../components/ExportButton'
import { exportObjects, downloadCsv, stampedName } from '../lib/csv'
import FinanceModal, { type FinanceKind } from '../modals/FinanceModal'

interface Props {
  profile: Profile
}

const STATUS_SWATCH: Record<string, { color: string; bg: string }> = {
  Draft: { color: '#475569', bg: '#eef1f4' },
  Sent: { color: '#b45309', bg: '#fbf1e0' },
  Paid: { color: '#15803d', bg: '#e7f5ec' },
  Overdue: { color: '#dc2626', bg: '#fdecec' },
  Accepted: { color: '#15803d', bg: '#e7f5ec' },
  Declined: { color: '#dc2626', bg: '#fdecec' },
}

const docTotal = (d: Invoice | Quotation) =>
  docTotals(d.line_items ?? [], d.discount_pct, d.tax_pct).total

export default function Finance({ profile }: Props) {
  void profile
  const market = useAppStore((s) => s.market) as MarketKey
  const tab = useAppStore((s) => s.financeTab)
  const setTab = useAppStore((s) => s.setFinanceTab)
  const showToast = useAppStore((s) => s.showToast)
  const cur = MARKET_BY_KEY[market].currency

  const { clinics } = useClinics(market)
  const { rows: invoices, reload: reloadInv } = useInvoices(market)
  const { rows: quotations, reload: reloadQuot } = useQuotations(market)
  const { rows: expenses, reload: reloadExp } = useExpenses(market)

  const [modal, setModal] = useState<{ kind: FinanceKind; editing: Invoice | Quotation | Expense | null } | null>(null)

  const tabs = [
    { key: 'revenue', label: 'Overview' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'quotations', label: 'Quotations' },
    { key: 'expenses', label: 'Expenses' },
  ] as const

  const subtitle: Record<string, string> = {
    revenue: 'Monthly recurring revenue per clinic. Type into any month cell — totals update instantly.',
    invoices: 'Bill clinics for training delivered. Click a status pill to advance it.',
    quotations: 'Pre-sale quotes. Same shape as invoices, minus a due date.',
    expenses: 'Trainer travel, materials and tooling costs.',
  }

  const addLabel: Record<string, string> = { invoices: '+ New Invoice', quotations: '+ New Quotation', expenses: '+ New Expense' }
  const addKind: Record<string, FinanceKind> = { invoices: 'invoice', quotations: 'quotation', expenses: 'expense' }

  const clinicName = (id: string | null) => clinics.find((c) => c.id === id)?.name ?? ''
  const { cells: revCells } = useRevenueCells(market, new Date().getFullYear())

  function doExport() {
    if (tab === 'invoices' || tab === 'quotations') {
      const rows = tab === 'invoices' ? invoices : quotations
      exportObjects<(typeof rows)[number]>(
        stampedName(`${tab}-${market}`),
        [
          ['Clinic', (r) => clinicName(r.clinic_id)],
          ['Reference', (r) => r.reference],
          ['Issue date', (r) => r.issue_date],
          [tab === 'invoices' ? 'Due date' : 'Valid until', (r) => (r as Invoice).due_date ?? (r as Quotation).valid_until],
          ['Status', (r) => r.status],
          ['Discount %', (r) => r.discount_pct],
          ['Tax %', (r) => r.tax_pct],
          ['Total', (r) => docTotal(r)],
          ['Currency', () => cur],
        ],
        rows,
      )
    } else if (tab === 'expenses') {
      exportObjects<Expense>(
        stampedName(`expenses-${market}`),
        [
          ['Description', (r) => r.description],
          ['Category', (r) => r.category],
          ['Vendor', (r) => r.vendor],
          ['Date', (r) => r.date],
          ['Amount', (r) => r.amount],
          ['Currency', () => cur],
        ],
        expenses,
      )
    } else {
      // revenue grid
      const revClinics = clinics.filter((c) => c.cs === 'commission' || c.cs === 'signed')
      const cell = (cid: string, m: number) => revCells.find((x) => x.clinic_id === cid && x.month === m)?.amount ?? 0
      downloadCsv(
        stampedName(`revenue-${market}-${new Date().getFullYear()}`),
        ['Clinic', ...MONTHS, 'Total'],
        revClinics.map((c) => {
          const months = MONTHS.map((_m, i) => cell(c.id, i + 1))
          return [c.name, ...months, months.reduce((a, b) => a + b, 0)]
        }),
      )
    }
  }

  const exportDisabled =
    (tab === 'invoices' && invoices.length === 0) ||
    (tab === 'quotations' && quotations.length === 0) ||
    (tab === 'expenses' && expenses.length === 0) ||
    (tab === 'revenue' && clinics.filter((c) => c.cs === 'commission' || c.cs === 'signed').length === 0)

  return (
    <>
      <div style={{ padding: '22px 26px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 23, letterSpacing: '-.6px', margin: 0, color: 'var(--ink)' }}>
              Finance <span style={{ color: 'var(--brand)', fontWeight: 600 }}>— {MARKET_BY_KEY[market].label}</span>
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 0' }}>{subtitle[tab]}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <ExportButton onClick={doExport} disabled={exportDisabled} />
            {tab !== 'revenue' && (
              <button className="ml-btn" onClick={() => setModal({ kind: addKind[tab], editing: null })}>
                <Icon name="plus" size={15} strokeWidth={2.6} />
                {addLabel[tab]}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, background: 'var(--tab-track)', padding: 4, borderRadius: 11, marginBottom: 20, width: 'fit-content' }}>
          {tabs.map((t) => (
            <div
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 15px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: tab === t.key ? '#fff' : 'transparent',
                color: tab === t.key ? 'var(--ink)' : 'var(--muted-2)',
              }}
            >
              {t.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 26px 30px' }}>
        {tab === 'revenue' && <RevenueTab market={market} cur={cur} clinics={clinics} />}

        {tab === 'invoices' && (
          <DocTab
            cur={cur}
            rows={invoices}
            kind="invoice"
            clinics={clinics}
            emptyText="No invoices yet."
            onEdit={(r) => setModal({ kind: 'invoice', editing: r })}
            onDelete={async (id) => {
              await deleteFinance('invoice', id)
              reloadInv()
            }}
            onCycle={async (r) => {
              const err = await cycleInvoiceStatus(r.id, r.status)
              if (err) showToast(err)
              else reloadInv()
            }}
          />
        )}

        {tab === 'quotations' && (
          <DocTab
            cur={cur}
            rows={quotations}
            kind="quotation"
            clinics={clinics}
            emptyText="No quotations yet."
            onEdit={(r) => setModal({ kind: 'quotation', editing: r })}
            onDelete={async (id) => {
              await deleteFinance('quotation', id)
              reloadQuot()
            }}
            onCycle={async (r) => {
              const err = await cycleQuotationStatus(r.id, r.status)
              if (err) showToast(err)
              else reloadQuot()
            }}
          />
        )}

        {tab === 'expenses' && (
          <ExpensesTab
            cur={cur}
            rows={expenses}
            onEdit={(r) => setModal({ kind: 'expense', editing: r })}
            onDelete={async (id) => {
              await deleteFinance('expense', id)
              reloadExp()
            }}
          />
        )}
      </div>

      {modal && (
        <FinanceModal
          kind={modal.kind}
          editing={modal.editing}
          onClose={() => setModal(null)}
          onSaved={() => {
            reloadInv()
            reloadQuot()
            reloadExp()
          }}
        />
      )}
    </>
  )
}

function KpiRow({ kpis }: { kpis: { label: string; value: string; accent?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 18 }}>
      {kpis.map((k) => (
        <div key={k.label} className="ml-card" style={{ borderRadius: 13, padding: '15px 17px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted-4)', marginBottom: 7 }}>
            {k.label}
          </div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 24, letterSpacing: '-.6px', color: k.accent ?? 'var(--ink)' }}>
            {k.value}
          </div>
        </div>
      ))}
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: 'var(--muted)',
  padding: '12px 14px',
  borderBottom: '1px solid var(--border-2)',
}
const td: React.CSSProperties = { padding: '10px 14px' }

function DocTab({
  cur,
  rows,
  kind,
  clinics,
  emptyText,
  onEdit,
  onDelete,
  onCycle,
}: {
  cur: string
  rows: (Invoice | Quotation)[]
  kind: 'invoice' | 'quotation'
  clinics: { id: string; name: string }[]
  emptyText: string
  onEdit: (r: Invoice | Quotation) => void
  onDelete: (id: string) => void
  onCycle: (r: Invoice | Quotation) => void
}) {
  const clinicName = (id: string | null) => clinics.find((c) => c.id === id)?.name ?? '—'
  const totalAll = rows.reduce((a, r) => a + docTotal(r), 0)
  const paid = rows.filter((r) => (r as Invoice).status === 'Paid' || (r as Quotation).status === 'Accepted').reduce((a, r) => a + docTotal(r), 0)
  const outstanding = totalAll - paid

  const kpis =
    kind === 'invoice'
      ? [
          { label: 'Total invoiced', value: `${cur} ${fmtMoney(totalAll)}` },
          { label: 'Paid', value: `${cur} ${fmtMoney(paid)}`, accent: 'var(--ok)' },
          { label: 'Outstanding', value: `${cur} ${fmtMoney(outstanding)}`, accent: 'var(--warn)' },
        ]
      : [
          { label: 'Total quoted', value: `${cur} ${fmtMoney(totalAll)}` },
          { label: 'Accepted', value: `${cur} ${fmtMoney(paid)}`, accent: 'var(--ok)' },
          { label: 'Open', value: `${cur} ${fmtMoney(outstanding)}`, accent: 'var(--warn)' },
        ]

  return (
    <>
      <KpiRow kpis={kpis} />
      <div className="ml-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt-2)' }}>
              <th style={th}>{kind === 'invoice' ? 'Invoice #' : 'Quote #'}</th>
              <th style={th}>Clinic</th>
              <th style={th}>{kind === 'invoice' ? 'Due' : 'Date'}</th>
              <th style={{ ...th, textAlign: 'right' }}>Amount</th>
              <th style={th}>Status</th>
              <th style={{ ...th, borderBottom: '1px solid var(--border-2)' }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ ...td, fontWeight: 700, color: 'var(--ink)' }}>
                  {kind === 'invoice' ? 'INV' : 'QUO'}-{String(i + 1).padStart(3, '0')}
                </td>
                <td style={{ ...td, color: 'var(--text)' }}>{clinicName(r.clinic_id)}</td>
                <td style={{ ...td, color: 'var(--muted)' }}>
                  {shortDay(kind === 'invoice' ? (r as Invoice).due_date : r.issue_date)}
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--ink)' }}>{cur} {fmtMoney(docTotal(r))}</td>
                <td style={td}>
                  <span onClick={() => onCycle(r)}>
                    <Pill swatch={STATUS_SWATCH[r.status] ?? STATUS_SWATCH.Draft}>{r.status}</Pill>
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span onClick={() => onEdit(r)} style={{ cursor: 'pointer', color: 'var(--brand)', fontWeight: 700, fontSize: 12, marginRight: 12 }}>
                    Edit
                  </span>
                  <span onClick={() => onDelete(r.id)} style={{ cursor: 'pointer', color: 'var(--danger)', fontWeight: 700, fontSize: 12 }}>
                    Delete
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="ml-empty" style={{ padding: 26 }}>{emptyText}</div>}
      </div>
    </>
  )
}

function ExpensesTab({
  cur,
  rows,
  onEdit,
  onDelete,
}: {
  cur: string
  rows: Expense[]
  onEdit: (r: Expense) => void
  onDelete: (id: string) => void
}) {
  const total = rows.reduce((a, r) => a + num(r.amount), 0)
  const thisMonth = rows
    .filter((r) => (r.date ?? '').slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((a, r) => a + num(r.amount), 0)

  return (
    <>
      <KpiRow
        kpis={[
          { label: 'Total logged', value: `${cur} ${fmtMoney(total)}` },
          { label: 'This month', value: `${cur} ${fmtMoney(thisMonth)}`, accent: 'var(--warn)' },
        ]}
      />
      <div className="ml-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt-2)' }}>
              <th style={th}>Description</th>
              <th style={th}>Category</th>
              <th style={th}>Vendor</th>
              <th style={th}>Date</th>
              <th style={{ ...th, textAlign: 'right' }}>Amount</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ ...td, fontWeight: 700, color: 'var(--ink)' }}>{r.description}</td>
                <td style={{ ...td, color: 'var(--text)' }}>{r.category}</td>
                <td style={{ ...td, color: 'var(--muted)' }}>{r.vendor || '—'}</td>
                <td style={{ ...td, color: 'var(--muted)' }}>{shortDay(r.date)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--ink)' }}>{cur} {fmtMoney(r.amount)}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span onClick={() => onEdit(r)} style={{ cursor: 'pointer', color: 'var(--brand)', fontWeight: 700, fontSize: 12, marginRight: 12 }}>
                    Edit
                  </span>
                  <span onClick={() => onDelete(r.id)} style={{ cursor: 'pointer', color: 'var(--danger)', fontWeight: 700, fontSize: 12 }}>
                    Delete
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="ml-empty" style={{ padding: 26 }}>No expenses logged yet.</div>}
      </div>
    </>
  )
}

function RevenueTab({
  market,
  cur,
  clinics,
}: {
  market: MarketKey
  cur: string
  clinics: { id: string; name: string; cs: string }[]
}) {
  const year = new Date().getFullYear()
  const showToast = useAppStore((s) => s.showToast)
  const { cells, reload } = useRevenueCells(market, year)

  // revenue rows: clinics that reached commission/signed
  const revClinics = useMemo(
    () => clinics.filter((c) => c.cs === 'commission' || c.cs === 'signed'),
    [clinics],
  )

  const value = (clinicId: string, month: number) =>
    cells.find((x) => x.clinic_id === clinicId && x.month === month)?.amount ?? 0

  const rowTotal = (clinicId: string) => MONTHS.reduce((a, _m, i) => a + value(clinicId, i + 1), 0)
  const colTotal = (month: number) => revClinics.reduce((a, c) => a + value(c.id, month), 0)
  const grand = revClinics.reduce((a, c) => a + rowTotal(c.id), 0)

  async function commit(clinicId: string, month: number, raw: string) {
    const err = await setRevenueCell(clinicId, market, year, month, num(raw))
    if (err) showToast(err)
    else reload()
  }

  const kpis = [
    { label: 'Annualised revenue', value: `${cur} ${fmtMoney(grand)}` },
    { label: 'Billing clinics', value: String(revClinics.length) },
    { label: 'Avg / clinic / mo', value: `${cur} ${fmtMoney(revClinics.length ? grand / revClinics.length / 12 : 0)}` },
  ]

  return (
    <>
      <KpiRow kpis={kpis} />
      {revClinics.length === 0 ? (
        <div className="ml-empty" style={{ padding: 26 }}>
          No billing clinics yet. Move a clinic to Commission Based or Contract Subscription first.
        </div>
      ) : (
        <div className="ml-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1180, fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt-2)' }}>
                  <th style={{ ...th, position: 'sticky', left: 0, background: 'var(--surface-alt-2)', minWidth: 210 }}>Clinic</th>
                  {MONTHS.map((m) => (
                    <th key={m} style={{ ...th, textAlign: 'right' }}>
                      {m}
                    </th>
                  ))}
                  <th style={{ ...th, textAlign: 'right', color: 'var(--brand-strong)', background: '#f0f7f4' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {revClinics.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <td style={{ ...td, position: 'sticky', left: 0, background: '#fff', fontWeight: 600, color: 'var(--ink)', maxWidth: 230, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.name}
                    </td>
                    {MONTHS.map((_m, i) => (
                      <td key={i} style={{ padding: '5px 6px', textAlign: 'right' }}>
                        <input
                          defaultValue={value(c.id, i + 1) || ''}
                          onBlur={(e) => commit(c.id, i + 1, e.target.value)}
                          inputMode="numeric"
                          placeholder="0"
                          style={{
                            width: 84,
                            textAlign: 'right',
                            fontFamily: 'inherit',
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: 'var(--text)',
                            border: '1px solid transparent',
                            borderRadius: 7,
                            padding: '6px 8px',
                            outline: 'none',
                            background: '#f6f8f9',
                          }}
                        />
                      </td>
                    ))}
                    <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--brand-strong)', background: '#f8fbfa', whiteSpace: 'nowrap' }}>
                      {fmtMoney(rowTotal(c.id))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--surface-alt-2)', borderTop: '2px solid #e0e6e9' }}>
                  <td style={{ ...td, position: 'sticky', left: 0, background: 'var(--surface-alt-2)', fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--ink)' }}>Total</td>
                  {MONTHS.map((_m, i) => (
                    <td key={i} style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {fmtMoney(colTotal(i + 1))}
                    </td>
                  ))}
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--brand-strong)', background: '#eef6f2', whiteSpace: 'nowrap' }}>
                    {fmtMoney(grand)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
