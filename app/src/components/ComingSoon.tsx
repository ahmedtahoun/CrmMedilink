interface ComingSoonProps {
  title: string
  note?: string
}

export default function ComingSoon({ title, note }: ComingSoonProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 40,
        animation: 'fadeIn .3s ease',
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 24,
          background: 'linear-gradient(150deg,#e3f4ee,#d3ece2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-head)',
          fontWeight: 700,
          fontSize: 34,
          color: '#0e9270',
          marginBottom: 22,
        }}
      >
        M
      </div>
      <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 22, color: 'var(--ink)', margin: '0 0 10px' }}>
        {title}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 420, margin: 0, lineHeight: 1.6 }}>
        {note || 'This workspace is being built. Check back soon.'}
      </p>
    </div>
  )
}
