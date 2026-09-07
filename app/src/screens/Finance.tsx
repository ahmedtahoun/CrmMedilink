import type { Profile } from '../lib/types'
import ComingSoon from '../components/ComingSoon'

interface Props {
  profile: Profile
}

export default function Finance(_props: Props) {
  void _props
  return <ComingSoon title="Finance" note="Revenue, invoices, quotations and expenses land in Phase 2." />
}
