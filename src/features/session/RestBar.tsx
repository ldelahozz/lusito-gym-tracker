import { createPortal } from 'react-dom'
import { PictureInPicture2 } from 'lucide-react'
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
  /** Lo que sigue: "Serie 3 · 82.5 kg × 6" o el siguiente ejercicio. */
  nextUp: string
  /** true si la barra de abajo esta visible: el descanso flota encima de ella. */
  aboveNav?: boolean
  onAdjust: (deltaSeconds: number) => void
  onSkip: () => void
  /** Abre el temporizador flotante; sin esto (dispositivo sin soporte) no hay boton. */
  onFloat?: () => void
}

/**
 * Tarjeta flotante abajo con la cuenta regresiva del descanso.
 * Se calcula con la hora de fin, asi que sigue correcta tras bloquear el celular.
 */
export function RestBar({ timer, now, nextUp, aboveNav, onAdjust, onSkip, onFloat }: Props) {
  const remaining = remainingMs(timer, now)
  const progress = restProgress(timer, now)
  const finished = remaining === 0

  // Se dibuja directo sobre la pagina: asi ninguna animacion de la pantalla la mueve.
  return createPortal(
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
          'pointer-events-auto mx-auto max-w-xl flex flex-col gap-2.5 p-3 rounded-[22px]',
          'surface-glass border shadow-[0_18px_40px_-14px_rgb(0_0_0/0.95)] animate-rise',
          finished ? 'border-accent-dim animate-glow' : 'border-line',
        )}
      >
        {/* Arriba: tiempo, que sigue y el boton flotante. Abajo: ajustar o saltar. */}
        <div className="flex items-center gap-3">
          <ProgressRing value={1 - progress} size={60} stroke={5}>
            <span
              className={cn(
                'text-[17px] font-bold tracking-tight tabular-nums',
                finished && 'text-accent-hi',
              )}
            >
              {formatDuration(remaining)}
            </span>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">{finished ? '¡A la siguiente!' : 'Descansa'}</p>
            <p className="text-sm text-muted truncate">
              Sigue: <span className="text-text">{nextUp}</span>
            </p>
          </div>
          {onFloat && !finished && (
            <button
              type="button"
              onClick={onFloat}
              aria-label="Temporizador flotante: sigue viéndolo en otras apps"
              className="shrink-0 flex flex-col items-center justify-center gap-0.5 size-14 -my-1 rounded-control surface-key text-accent-hi active:scale-95 transition-transform duration-100"
            >
              <PictureInPicture2 size={19} />
              <span className="text-xs text-muted">Flotante</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" onClick={() => onAdjust(-REST_ADJUST_SECONDS)} disabled={finished}>
            −{REST_ADJUST_SECONDS} s
          </Button>
          <Button size="sm" onClick={() => onAdjust(REST_ADJUST_SECONDS)}>
            +{REST_ADJUST_SECONDS} s
          </Button>
          <Button size="sm" variant={finished ? 'primary' : 'secondary'} onClick={onSkip}>
            {finished ? 'Listo' : 'Saltar'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
