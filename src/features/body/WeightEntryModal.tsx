import { useState } from 'react'
import { Button } from '@/core/ui/Button'
import { Modal } from '@/core/ui/Modal'
import { NumberField } from '@/core/ui/NumberField'
import { useToast } from '@/core/ui/toast-context'
import { formatWeight } from '@/core/logic/format'
import { newId } from '@/core/model/ids'
import { useData } from '@/core/sync/data-context'

/** Registrar el peso de hoy. Arranca con el ultimo peso, para solo ajustar. */
export function WeightEntryModal({
  open,
  lastWeight,
  onClose,
}: {
  open: boolean
  lastWeight: number | null
  onClose: () => void
}) {
  const { save } = useData()
  const { showToast } = useToast()
  const [weight, setWeight] = useState(lastWeight ?? 70)

  const submit = () => {
    save('bodyWeights', { id: newId(), measuredAt: Date.now(), weightKg: weight })
    showToast(`Peso registrado: ${formatWeight(weight)} kg`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar peso"
      description="Para comparar mejor, pésate a la misma hora, idealmente en la mañana."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit}>
            Guardar
          </Button>
        </>
      }
    >
      <NumberField
        large
        value={weight}
        onChange={setWeight}
        min={20}
        max={300}
        step={0.1}
        decimals={1}
        suffix="kg"
        ariaLabel="Tu peso en kilos"
      />
    </Modal>
  )
}
