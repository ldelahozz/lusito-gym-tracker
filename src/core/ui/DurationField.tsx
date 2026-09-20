import { Minus, Plus } from 'lucide-react'
import { formatMinutesSeconds } from '@/core/logic/format'
import { cn } from './cn'

type Props = {
  /** Valor en segundos. */
  value: number
  onChange: (seconds: number) => void
  min?: number
  max?: number
  step?: number
  ariaLabel?: string
  compact?: boolean
}

/**
 * Selector de tiempo en minutos y segundos.
 * Se mueve de 15 en 15 segundos, que es como se piensan los descansos.
 */
export function DurationField({
  value,
  onChange,
  min = 0,
  max = 900,
  step = 15,
  ariaLabel,
  compact,
}: Props) {
  const bump = (direction: 1 | -1) => {
    const next = value + direction * step
    // Al subir o bajar, se alinea a multiplos del paso.
    const aligned = Math.round(next / step) * step
    onChange(Math.min(max, Math.max(min, aligned)))
  }

  return (
    <div
      className={cn('flex items-center rounded-control bg-elevated border border-line')}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={() => bump(-1)}
        disabled={value <= min}
        aria-label="Menos tiempo"
        className={cn(
          'grid place-items-center shrink-0 rounded-l-control text-muted hover:text-text',
          'disabled:opacity-25 disabled:pointer-events-none',
          compact ? 'size-10' : 'size-12',
        )}
      >
        <Minus size={compact ? 16 : 20} />
      </button>

      <span
        className={cn(
          'flex-1 text-center font-medium tabular-nums',
          compact ? 'text-[15px]' : 'text-[17px]',
        )}
      >
        {formatMinutesSeconds(value)}
      </span>

      <button
        type="button"
        onClick={() => bump(1)}
        disabled={value >= max}
        aria-label="Mas tiempo"
        className={cn(
          'grid place-items-center shrink-0 rounded-r-control text-muted hover:text-text',
          'disabled:opacity-25 disabled:pointer-events-none',
          compact ? 'size-10' : 'size-12',
        )}
      >
        <Plus size={compact ? 16 : 20} />
      </button>
    </div>
  )
}
