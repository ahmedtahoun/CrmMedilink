import Modal from '../components/Modal'

interface Props {
  onClose: () => void
}

export default function AddClinicModal({ onClose }: Props) {
  return (
    <Modal title="Add clinic" subtitle="The full new-clinic form lands in Phase 1." onClose={onClose}>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>
        This will capture clinic details, healthcare info, location & contact, pipeline assignment and
        subscription setup — matching the prototype's Add-clinic modal.
      </p>
    </Modal>
  )
}
