import { COMPANY, MARKET_BY_KEY, type MarketKey } from './constants'
import type { Clinic, Invoice, LineItem, Quotation } from './types'
import { docTotals, fmtMoney } from './format'

type Kind = 'invoice' | 'quotation'

const INK = '#16242d'
const MUTED = '#66757e'
const BRAND = '#0e9b76'

interface Meta {
  docNumber: string
}

// jsPDF (~500KB) is loaded on demand so it never touches the initial bundle.
export async function generateFinancePdf(
  kind: Kind,
  doc: Invoice | Quotation,
  clinic: Clinic | undefined,
  market: MarketKey,
  meta: Meta,
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const cur = MARKET_BY_KEY[market].currency
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const M = 48
  let y = M

  const title = kind === 'invoice' ? 'INVOICE' : 'QUOTATION'
  const items: LineItem[] = doc.line_items ?? []
  const t = docTotals(items, doc.discount_pct, doc.tax_pct)

  // ---- header: company block (left) + doc title (right) ----
  pdf.setFont('helvetica', 'bold').setFontSize(20).setTextColor(INK)
  pdf.text(COMPANY.name, M, y + 4)
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(MUTED)
  pdf.text(COMPANY.tagline, M, y + 20)
  COMPANY.addressLines.forEach((line, i) => pdf.text(line, M, y + 34 + i * 12))

  pdf.setFont('helvetica', 'bold').setFontSize(24).setTextColor(BRAND)
  pdf.text(title, pageW - M, y + 6, { align: 'right' })
  pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(INK)
  pdf.text(`# ${meta.docNumber}`, pageW - M, y + 24, { align: 'right' })

  y += 34 + COMPANY.addressLines.length * 12 + 24

  // ---- bill-to + meta table ----
  pdf.setDrawColor(221, 227, 230).setLineWidth(1)
  pdf.line(M, y, pageW - M, y)
  y += 20

  pdf.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED)
  pdf.text('BILL TO', M, y)
  pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(INK)
  const billLines = [
    clinic?.name ?? '—',
    clinic?.contact ?? '',
    [clinic?.area, clinic?.street].filter(Boolean).join(', '),
    [clinic?.phone, clinic?.email].filter(Boolean).join(' · '),
  ].filter(Boolean)
  billLines.forEach((line, i) => pdf.text(String(line), M, y + 16 + i * 13))

  const metaRows: [string, string][] = [
    [kind === 'invoice' ? 'Issue date' : 'Date', fmtDate(doc.issue_date)],
    [
      kind === 'invoice' ? 'Due date' : 'Valid until',
      fmtDate(kind === 'invoice' ? (doc as Invoice).due_date : (doc as Quotation).valid_until),
    ],
    ['Reference', doc.reference || '—'],
    ['Status', doc.status],
  ]
  autoTable(pdf, {
    startY: y,
    margin: { left: pageW - M - 200, right: M },
    tableWidth: 200,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 0, right: 0 }, textColor: INK },
    columnStyles: { 0: { textColor: MUTED, fontStyle: 'bold' }, 1: { halign: 'right' } },
    body: metaRows,
  })

  y = Math.max(y + 16 + billLines.length * 13, (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 24

  // ---- line items ----
  autoTable(pdf, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Description', 'Qty', `Unit price (${cur})`, `Amount (${cur})`]],
    body: items.map((li) => [
      li.description || '—',
      String(li.qty),
      fmtMoney(li.unit_price),
      fmtMoney(li.qty * li.unit_price),
    ]),
    headStyles: { fillColor: [12, 25, 32], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 6, textColor: INK },
    columnStyles: {
      1: { halign: 'right', cellWidth: 50 },
      2: { halign: 'right', cellWidth: 90 },
      3: { halign: 'right', cellWidth: 90 },
    },
    alternateRowStyles: { fillColor: [246, 248, 249] },
  })

  y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14

  // ---- totals ----
  const totalRows: [string, string][] = [
    ['Subtotal', `${cur} ${fmtMoney(t.subtotal)}`],
    [`Discount (${doc.discount_pct || 0}%)`, `- ${cur} ${fmtMoney(t.discount)}`],
    [`Tax (${doc.tax_pct || 0}%)`, `+ ${cur} ${fmtMoney(t.tax)}`],
  ]
  autoTable(pdf, {
    startY: y,
    margin: { left: pageW - M - 230, right: M },
    tableWidth: 230,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 0, right: 0 }, textColor: MUTED },
    columnStyles: { 1: { halign: 'right' } },
    body: totalRows,
  })
  y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
  pdf.setDrawColor(221, 227, 230)
  pdf.line(pageW - M - 230, y, pageW - M, y)
  y += 16
  pdf.setFont('helvetica', 'bold').setFontSize(12).setTextColor(INK)
  pdf.text('Total', pageW - M - 230, y)
  pdf.text(`${cur} ${fmtMoney(t.total)}`, pageW - M, y, { align: 'right' })
  y += 30

  // ---- notes + terms ----
  if (doc.notes) {
    pdf.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED)
    pdf.text('NOTES', M, y)
    pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(INK)
    const noteLines = pdf.splitTextToSize(doc.notes, pageW - M * 2)
    pdf.text(noteLines, M, y + 14)
    y += 14 + noteLines.length * 12 + 12
  }

  pdf.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED)
  pdf.text('TERMS', M, y)
  pdf.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(MUTED)
  const terms = kind === 'invoice' ? COMPANY.paymentTerms : COMPANY.quotationTerms
  pdf.text(pdf.splitTextToSize(terms, pageW - M * 2), M, y + 13)

  // ---- footer ----
  const footY = pdf.internal.pageSize.getHeight() - 30
  pdf.setFontSize(8).setTextColor(MUTED)
  pdf.text(`${COMPANY.name} · ${title} ${meta.docNumber}`, M, footY)
  pdf.text('Generated from the MediLink360 CRM', pageW - M, footY, { align: 'right' })

  pdf.save(`${kind === 'invoice' ? 'Invoice' : 'Quotation'}-${meta.docNumber}.pdf`)
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
