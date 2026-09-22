import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from './cn'

type Props = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  /** Cuantos decimales mostrar (el peso usa 1, las repeticiones 0). */
  decimals?: number
  className?: string
  ariaLabel?: string
  /** Version mas baja, para pantallas de configuracion donde hay muchos campos. */
  compact?: boolean
  /** Numeros grandes, para leerlos de un vistazo mientras entrenas. */
  large?: boolean
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Control de numero con botones grandes de mas y menos.
 * Tambien se puede tocar el numero para escribirlo con el teclado.
 */
export function NumberField({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  decimals = 0,
  className,
  ariaLabel,
  compact,
  large,
}: Props) {
  const [text, setText] = useState(() => value.toFixed(decimals))
  const [editing, setEditing] = useState(false)
  /** Cada toque de + o - hace que el numero entre desde abajo o desde arriba. */
  const [tick, setTick] = useState({ count: 0, direction: 1 })

  useEffect(() => {
    if (!editing) setText(decimals > 0 ? String(round(value, decimals)) : String(value))
  }, [value, decimals, editing])

  const commit = (raw: string) => {
    const parsed = Number(raw.replace(',', '.'))
    if (Number.isFinite(parsed)) {
      onChange(round(Math.min(max, Math.max(min, parsed)), decimals))
    }
    setEditing(false)
  }

  const bump = (direction: 1 | -1) => {
    onChange(round(Math.min(max, Math.max(min, value + direction * step)), decimals))
    setTick((current) => ({ count: current.count + 1, direction }))
  }

  // Los botones se angostan un poco si falta espacio, pero el numero siempre se ve completo.
  const buttonClass = cn(
    'surface-key grid place-items-center shrink min-w-8 rounded-[10px] text-muted hover:text-text',
    'transition-transform duration-100 active:scale-90',
    'disabled:opacity-30 disabled:pointer-events-none',
    compact ? 'h-10 w-10' : large ? 'h-12 w-12' : 'h-11 w-11',
  )
  const iconSize = compact ? 15 : large ? 22 : 18

  return (
    <div
      className={cn(
        'surface-well flex items-center gap-1 rounded-control',
        compact ? 'p-1' : 'p-1.5',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => bump(-1)}
        disabled={value <= min}
        aria-label="Restar"
        className={buttonClass}
      >
        <Minus size={iconSize} />
      </button>

      {/* Tocar cualquier parte del centro abre el teclado; numero y unidad van juntos al centro. */}
      <label className="flex-1 flex items-baseline justify-center gap-1 min-w-min cursor-text">
        <span
          key={tick.count}
          className={cn('inline-flex', tick.count > 0 && 'animate-num-tick')}
          style={{ '--dir': tick.direction } as React.CSSProperties}
        >
          <input
            value={text}
            aria-label={ariaLabel}
            inputMode="decimal"
            style={{ width: `${Math.max(text.length, 1) + 0.5}ch` }}
            onFocus={(event) => {
              setEditing(true)
              event.currentTarget.select()
            }}
            onChange={(event) => setText(event.target.value)}
            onBlur={(event) => commit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
            className={cn(
              'min-w-0 bg-transparent text-center tabular-nums outline-none',
              compact && 'text-[15px] font-medium',
              !compact && !large && 'text-[17px] font-semibold',
              large && 'text-[28px] leading-none font-bold tracking-tight',
            )}
          />
        </span>
        {suffix && (
          <span className={cn('shrink-0 pr-1 text-muted', large ? 'text-sm font-medium' : 'text-xs')}>
            {suffix}
          </span>
        )}
      </label>

      <button
        type="button"
        onClick={() => bump(1)}
        disabled={value >= max}
        aria-label="Sumar"
        className={buttonClass}
      >
        <Plus size={iconSize} />
      </button>
    </div>
  )
}
