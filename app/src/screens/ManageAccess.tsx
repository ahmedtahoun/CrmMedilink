import type { Profile, AccessMatrix } from '../lib/types'
import ComingSoon from '../components/ComingSoon'

interface Props {
  profile: Profile
  matrix: AccessMatrix
  onChange: () => void
}

export default function ManageAccess(_props: Props) {
  void _props
  return <ComingSoon title="Manage Access" note="The role × module toggle matrix lands in Phase 3." />
}
