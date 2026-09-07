import { useAppStore } from '../store/appStore'

export default function Toast() {
  const toast = useAppStore((s) => s.toast)
  if (!toast) return null
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#0c1920',
        color: '#fff',
        fontWeight: 700,
        fontSize: 13,
        padding: '11px 18px',
        borderRadius: 11,
        boxShadow: '0 16px 40px rgba(12,25,32,.28)',
        zIndex: 200,
        animation: 'toastIn .18s ease both',
      }}
      role="status"
    >
      {toast}
    </div>
  )
}
