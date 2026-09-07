import type { Profile } from '../lib/types'
import ComingSoon from '../components/ComingSoon'

interface Props {
  profile: Profile
}

export default function Hr(_props: Props) {
  void _props
  return <ComingSoon title="HR" note="The employee directory lands in Phase 3." />
}
