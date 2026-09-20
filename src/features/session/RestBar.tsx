import { SkipForward } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { formatDuration } from '@/core/logic/format'
import {
  REST_ADJUST_SECONDS,
  remainingMs,
  restProgress,
  type RestTimer,
} from '@/core/logic/restTimer'

type Props = {
  timer: RestTimer
  now: number
  exerciseName: string
  onAdjust: (deltaSeconds: number) => void
  onSkip: () => void
}

/**
 * Barra fija abajo con la cuenta regresiva del descanso.
 * Se calcula con la hora de fin, asi que sigue correcta tras bloquear el celular.
 */
export function RestBar({ timer, now, exerciseName, onAdjust, onSkip }: Props) {
  const remaining = remainingMs(timer, now)
  const progress = restProgress(timer, now)
  const finished = remaining === 0

  return (
    <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-30 border-t border-line bg-elevated pb-safe">
      <div
        className="h-0.5 bg-accent transition-[width] duration-1000 ease-linear"
        style={{ width: `${(1 - progress) * 100}%` }}
      />
      <div className="mx-auto max-w-5xl flex items-center gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted truncate">
            {finished ? 'Descanso terminado' : `Descanso · ${exerciseName}`}
          </p>
          <p className="text-2xl font-semibold tabular-nums leading-tight">
            {formatDuration(remaining)}
          </p>
        </div>

        <Button size="sm" onClick={() => onAdjust(-REST_ADJUST_SECONDS)} disabled={finished}>
          -{REST_ADJUST_SECONDS}s
        </Button>
        <Button size="sm" onClick={() => onAdjust(REST_ADJUST_SECONDS)}>
          +{REST_ADJUST_SECONDS}s
        </Button>
        <Button size="sm" variant={finished ? 'primary' : 'secondary'} onClick={onSkip}>
          <SkipForward size={16} />
          {finished ? 'Listo' : 'Saltar'}
        </Button>
      </div>
    </div>
  )
}
