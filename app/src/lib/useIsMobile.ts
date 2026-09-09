import { useEffect, useState } from 'react'

const QUERY = '(max-width: 640px)'

/** true on phone-width viewports. Updates on resize / orientation change. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return mobile
}
