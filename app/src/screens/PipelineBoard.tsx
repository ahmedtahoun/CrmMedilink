import type { Profile } from '../lib/types'
import ComingSoon from '../components/ComingSoon'

interface Props {
  profile: Profile
  boardType: 'closer' | 'trainer'
  onAddClinic: () => void
}

export default function PipelineBoard(props: Props) {
  return (
    <ComingSoon
      title={props.boardType === 'trainer' ? 'Trainer pipeline' : 'Sales pipeline'}
      note="The kanban board, table, calendar and analytics views land in Phase 1."
    />
  )
}
