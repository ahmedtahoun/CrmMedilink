import type { Swatch } from '../lib/styles'

interface PillProps {
  swatch: Swatch
  children: React.ReactNode
  onClick?: () => void
  title?: string
}

export default function Pill({ swatch, children, onClick, title }: PillProps) {
  return (
    <span
      className="ml-pill"
      title={title}
      onClick={onClick}
      style={{
        background: swatch.bg,
        color: swatch.color,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {children}
    </span>
  )
}
