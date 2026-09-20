import { useRef } from 'react'
import { Trash, Video } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { IconButton } from '@/core/ui/IconButton'
import { useExerciseVideo } from '@/core/useExerciseVideo'
import { formatBytes } from '@/core/videoStore'

type Props = {
  exerciseId: string
  exerciseName: string
}

/**
 * Video de referencia del ejercicio, opcional.
 * Se guarda solo en este dispositivo; sirve para recordar como se hace.
 */
export function ExerciseVideoCard({ exerciseId, exerciseName }: Props) {
  const { video, url, loading, error, save, remove } = useExerciseVideo(exerciseId)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-muted">Video de referencia</span>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void save(file)
          event.target.value = ''
        }}
      />

      {loading ? (
        <p className="text-sm text-muted">Buscando...</p>
      ) : video && url ? (
        <div className="flex flex-col gap-2">
          <video
            src={url}
            controls
            playsInline
            preload="metadata"
            aria-label={`Video de ${exerciseName}`}
            className="w-full max-h-64 rounded-control bg-canvas border border-line"
          />
          <div className="flex items-center gap-2">
            <p className="flex-1 text-xs text-muted truncate">
              {video.name} · {formatBytes(video.size)}
            </p>
            <Button size="sm" onClick={() => inputRef.current?.click()}>
              Cambiar
            </Button>
            <IconButton icon={Trash} label="Quitar video" size={16} className="size-10" onClick={() => void remove()} />
          </div>
        </div>
      ) : (
        <Button size="sm" className="self-start" onClick={() => inputRef.current?.click()}>
          <Video size={16} />
          Elegir video
        </Button>
      )}

      {error && <p className="text-sm text-muted">{error}</p>}

      <p className="text-xs text-muted leading-relaxed">
        Opcional. Se guarda solo en este dispositivo: no se sube a la nube, no ocupa espacio de tu
        cuenta y no entra en el respaldo.
      </p>
    </div>
  )
}
