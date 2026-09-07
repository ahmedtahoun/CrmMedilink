import type { Profile } from '../lib/types'
import ComingSoon from '../components/ComingSoon'

interface Props {
  profile: Profile
}

export default function Documents(_props: Props) {
  void _props
  return <ComingSoon title="Documents" note="Per-country shared files land in Phase 3." />
}
