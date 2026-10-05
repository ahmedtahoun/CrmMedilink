import { useMemo, useState } from 'react'

interface Props {
  options: readonly string[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

// Searchable multi-select: selected items show as removable chips above the
// search box; the list filters as you type.
export default function SpecialtyPicker({ options, value, onChange, placeholder = 'Search specialty…' }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? options.filter((o) => o.toLowerCase().includes(needle)) : options
  }, [options, q])

  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])

  return (
    <div style={{ position: 'relative' }}>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {value.map((v) => (
            <span
              key={v}
              onClick={() => toggle(v)}
              title="Remove"
              style={{ padding: '4px 9px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#e3f4ee', color: '#0e6b52' }}
            >
              {v} ✕
            </span>
          ))}
        </div>
      )}
      <input
        className="ml-input"
        value={q}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches.length > 0) {
            e.preventDefault()
            toggle(matches[0])
            setQ('')
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
          {matches.map((o) => {
            const on = value.includes(o)
            return (
              <div
                key={o}
                onMouseDown={(e) => {
                  e.preventDefault()
                  toggle(o)
                }}
                style={{ padding: '9px 12px', fontSize: 13, fontWeight: on ? 700 : 600, color: on ? '#0e6b52' : 'var(--ink-2)', background: on ? '#eef4f2' : undefined, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8 }}
              >
                <span>{o}</span>
                {on && <span>✓</span>}
              </div>
            )
          })}
          {matches.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--empty)' }}>No specialty matches “{q}”</div>}
        </div>
      )}
    </div>
  )
}
