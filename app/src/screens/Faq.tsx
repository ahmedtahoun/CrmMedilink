import type { Profile } from '../lib/types'
import ComingSoon from '../components/ComingSoon'

interface Props {
  profile: Profile
}

export default function Faq(_props: Props) {
  void _props
  return <ComingSoon title="FAQ" note="Company, sales and implementation answers land in Phase 3." />
}
