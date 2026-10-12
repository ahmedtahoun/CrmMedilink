import { safeUrl } from '../lib/format'
import Icon from './Icon'

interface Props {
  url: string | null | undefined
  name?: string | null
  /** With a label it renders as a pill button; without, a compact icon button. */
  label?: string
}

// One-click jump to a clinic's contract folder (Drive / OneDrive). Safe to
// drop on clickable cards: it never triggers the card's own click or drag.
export default function FolderLink({ url, name, label }: Props) {
  const href = safeUrl(url)
  if (!href) return null
  const title = name ? `Open folder: ${name}` : 'Open contract folder'
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={title}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        height: 24,
        minWidth: 24,
        padding: label ? '0 10px' : 0,
        borderRadius: label ? 20 : 8,
        background: '#e3f4ee',
        color: '#0e7d5f',
        border: '1px solid #bfe4d5',
        fontSize: 11.5,
        fontWeight: 700,
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      <Icon name="external" size={13} strokeWidth={2.4} />
      {label}
    </a>
  )
}
