// Minimal client-side CSV export — no dependencies.

type Cell = string | number | boolean | null | undefined

function escapeCell(v: Cell): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const r of rows) lines.push(r.map(escapeCell).join(','))
  return lines.join('\r\n')
}

export function downloadCsv(filename: string, headers: string[], rows: Cell[][]): void {
  const csv = '﻿' + toCsv(headers, rows) // BOM so Excel reads UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Build rows from objects using an ordered list of [header, accessor] pairs. */
export function exportObjects<T>(
  filename: string,
  cols: [string, (row: T) => Cell][],
  data: T[],
): void {
  downloadCsv(
    filename,
    cols.map((c) => c[0]),
    data.map((row) => cols.map((c) => c[1](row))),
  )
}

const STAMP = () => new Date().toISOString().slice(0, 10)
export const stampedName = (base: string) => `medilink360-${base}-${STAMP()}`
