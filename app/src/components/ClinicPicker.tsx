import { useMemo, useState } from 'react'
import type { Clinic } from '../lib/types'

interface Props {
  clinics: Clinic[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

// Searchable clinic dropdown, A–Z. Type to filter; pick "No link" to clear.
export default function ClinicPicker({ clinics, value, onChange, placeholder = 'Search clinic…' }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const sorted = useMemo(
    () => [...clinics].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [clinics],
  )
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? sorted.filter((c) => c.name.toLowerCase().includes(needle)) : sorted
  }, [sorted, q])

  const selected = clinics.find((c) => c.id === value)

  function pick(id: string) {
    onChange(id)
    setOpen(false)
    setQ('')
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="ml-input"
        value={open ? q : selected?.name ?? ''}
        placeholder={selected ? selected.name : placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onBlur={() => {
          setOpen(false)
          setQ('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches.length > 0) {
            e.preventDefault()
            pick(matches[0].id)
          }
          if (e.key === 'Escape') {
            e.stopPropagation()
            setOpen(false)
          }
        }}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 40,
            maxHeight: 220,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid var(--border-2)',
            borderRadius: 10,
            boxShadow: '0 12px 28px rgba(20,40,45,.14)',
          }}
        >
          <div
            onMouseDown={(e) => {
              e.preventDefault()
              pick('')
            }}
            style={{ padding: '9px 12px', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer' }}
          >
            No link
          </div>
          {matches.map((c) => (
            <div
              key={c.id}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(c.id)
              }}
              style={{
                padding: '9px 12px',
                fontSize: 13,
                fontWeight: c.id === value ? 700 : 600,
                color: 'var(--ink-2)',
                cursor: 'pointer',
                background: c.id === value ? '#eef4f2' : undefined,
              }}
            >
              {c.name}
            </div>
          ))}
          {matches.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--empty)' }}>No clinic matches “{q}”</div>
          )}
        </div>
      )}
    </div>
  )
}
