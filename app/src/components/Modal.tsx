import { useEffect } from 'react'
import Icon from './Icon'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: number
  subtitle?: string
}

export default function Modal({ title, subtitle, onClose, children, width = 640 }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="ml-overlay" onClick={onClose}>
      <div className="ml-modal" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: subtitle ? 12 : 18,
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{title}</h2>
            {subtitle && (
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--muted-4)',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 2,
            }}
          >
            <Icon name="x" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
