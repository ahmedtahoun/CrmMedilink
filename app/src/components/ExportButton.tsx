import Icon from './Icon'

interface ExportButtonProps {
  onClick: () => void
  label?: string
  disabled?: boolean
}

export default function ExportButton({ onClick, label = 'Export CSV', disabled }: ExportButtonProps) {
  return (
    <button
      className="ml-btn ml-btn--ghost"
      onClick={onClick}
      disabled={disabled}
      style={{ fontSize: 13, flexShrink: 0, opacity: disabled ? 0.5 : 1 }}
      title={disabled ? 'Nothing to export' : label}
    >
      <Icon name="download" size={14} strokeWidth={2.3} />
      {label}
    </button>
  )
}
