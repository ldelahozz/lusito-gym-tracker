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
}: Props) {
  const [text, setText] = useState(() => value.toFixed(decimals))
  const [editing, setEditing] = useState(false)

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
  }

  // Los botones se angostan un poco si falta espacio, pero el numero siempre se ve completo.
  const buttonClass = cn(
    'grid place-items-center shrink min-w-8 text-muted hover:text-text',
    'disabled:opacity-25 disabled:pointer-events-none',
    compact ? 'h-10 w-10' : 'h-12 w-12',
  )

  return (
    <div className={cn('flex items-center gap-1 rounded-control bg-elevated border border-line', className)}>
      <button
        type="button"
        onClick={() => bump(-1)}
        disabled={value <= min}
        aria-label="Restar"
        className={cn(buttonClass, 'rounded-l-control')}
      >
        <Minus size={compact ? 16 : 20} />
      </button>

      <div className="flex-1 flex items-baseline justify-center gap-1 min-w-min">
        <input
          value={text}
          aria-label={ariaLabel}
          inputMode="decimal"
          style={{ minWidth: `${Math.max(text.length, 1) + 0.5}ch` }}
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
            'w-full min-w-0 bg-transparent text-center font-medium tabular-nums outline-none',
            compact ? 'text-[15px]' : 'text-[17px]',
          )}
        />
        {suffix && <span className="text-xs text-muted shrink-0 pr-1">{suffix}</span>}
      </div>

      <button
        type="button"
        onClick={() => bump(1)}
        disabled={value >= max}
        aria-label="Sumar"
        className={cn(buttonClass, 'rounded-r-control')}
      >
        <Plus size={compact ? 16 : 20} />
      </button>
    </div>
  )
}
