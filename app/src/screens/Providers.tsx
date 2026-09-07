import type { Profile } from '../lib/types'
import ComingSoon from '../components/ComingSoon'

interface Props {
  profile: Profile
  onAddClinic: () => void
}

export default function Providers(_props: Props) {
  void _props
  return <ComingSoon title="Providers" note="The provider directory and import flow land in Phase 1." />
}
