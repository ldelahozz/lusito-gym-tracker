import { Button } from '@/core/ui/Button'
import { ProgressRing } from '@/core/ui/ProgressRing'
import { cn } from '@/core/ui/cn'
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
  /** true si la barra de abajo esta visible: el descanso flota encima de ella. */
  aboveNav?: boolean
  onAdjust: (deltaSeconds: number) => void
  onSkip: () => void
}

/**
 * Tarjeta flotante abajo con la cuenta regresiva del descanso.
 * Se calcula con la hora de fin, asi que sigue correcta tras bloquear el celular.
 */
export function RestBar({ timer, now, exerciseName, aboveNav, onAdjust, onSkip }: Props) {
  const remaining = remainingMs(timer, now)
  const progress = restProgress(timer, now)
  const finished = remaining === 0

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-30 px-3 pb-safe pointer-events-none md:bottom-4',
        aboveNav ? 'bottom-[4.5rem]' : 'bottom-3',
      )}
    >
      <div
        role="timer"
        aria-live="off"
        className={cn(
          'pointer-events-auto mx-auto max-w-xl flex items-center gap-3 p-2.5 pr-3 rounded-[22px]',
          'surface-glass border shadow-[0_18px_40px_-14px_rgb(0_0_0/0.95)] animate-rise',
          finished ? 'border-accent-dim animate-glow' : 'border-line',
        )}
      >
        <ProgressRing value={1 - progress} size={64} stroke={5}>
          <span
            className={cn(
              'text-[17px] font-extrabold tracking-tight tabular-nums',
              finished && 'text-accent-hi',
            )}
          >
            {formatDuration(remaining)}
          </span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{finished ? '¡A la siguiente!' : 'Descansa'}</p>
          <p className="text-xs text-muted truncate">{exerciseName}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="px-2.5"
            onClick={() => onAdjust(-REST_ADJUST_SECONDS)}
            disabled={finished}
          >
            −{REST_ADJUST_SECONDS}
          </Button>
          <Button size="sm" className="px-2.5" onClick={() => onAdjust(REST_ADJUST_SECONDS)}>
            +{REST_ADJUST_SECONDS}
          </Button>
          <Button size="sm" variant={finished ? 'primary' : 'secondary'} onClick={onSkip}>
            {finished ? 'Listo' : 'Saltar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
