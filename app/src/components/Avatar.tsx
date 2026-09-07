import { initials, repColor } from '../lib/styles'

interface AvatarProps {
  name: string
  size?: number
  color?: string
}

export default function Avatar({ name, size = 22, color }: AvatarProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color || repColor(name),
        color: '#fff',
        fontSize: size * 0.42,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </span>
  )
}
