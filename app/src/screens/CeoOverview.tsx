import type { Profile } from '../lib/types'
import ComingSoon from '../components/ComingSoon'

interface Props {
  profile: Profile
}

export default function CeoOverview(_props: Props) {
  void _props
  return <ComingSoon title="CEO Overview" note="Exec KPIs, market cards and revenue trend land in Phase 1." />
}
