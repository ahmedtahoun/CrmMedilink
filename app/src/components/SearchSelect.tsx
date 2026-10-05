import { useMemo, useState } from 'react'

interface Props {
  options: readonly string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

// Searchable single-select. A value that isn't in `options` (e.g. a legacy
// one already saved on a clinic) still shows as selected.
export default function SearchSelect({ options, value, onChange, placeholder = 'Search…' }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? options.filter((o) => o.toLowerCase().includes(needle)) : options
  }, [options, q])

  function pick(v: string) {
    onChange(v)
    setOpen(false)
    setQ('')
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="ml-input"
        value={open ? q : value}
        placeholder={value || placeholder}
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
            pick(matches[0])
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
          {matches.map((o) => (
            <div
              key={o}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(o)
              }}
              style={{ padding: '9px 12px', fontSize: 13, fontWeight: o === value ? 700 : 600, color: 'var(--ink-2)', background: o === value ? '#eef4f2' : undefined, cursor: 'pointer' }}
            >
              {o}
            </div>
          ))}
          {matches.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--empty)' }}>No specialty matches “{q}”</div>}
        </div>
      )}
    </div>
  )
}
