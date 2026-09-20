import { useState } from 'react'
import { Video } from 'lucide-react'
import { IconButton } from '@/core/ui/IconButton'
import { Modal } from '@/core/ui/Modal'
import { useExerciseVideo } from '@/core/useExerciseVideo'

type Props = {
  exerciseId: string
  exerciseName: string
}

/**
 * Boton de video durante el entrenamiento.
 * Solo aparece si en ESTE dispositivo se guardo un video para el ejercicio.
 */
export function SessionVideoButton({ exerciseId, exerciseName }: Props) {
  const { video, url } = useExerciseVideo(exerciseId)
  const [open, setOpen] = useState(false)

  if (!video || !url) return null

  return (
    <>
      <IconButton icon={Video} label={`Ver video de ${exerciseName}`} onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={exerciseName}>
        <video
          src={url}
          controls
          autoPlay
          loop
          playsInline
          className="w-full max-h-[60vh] rounded-control bg-canvas border border-line"
        />
      </Modal>
    </>
  )
}
