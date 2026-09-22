import { useEffect, useRef, useState } from 'react'
import { cn } from './cn'

/** Alto de cada numero y de la ventana: se ven tres a la vez. */
const ITEM = 40
const VISIBLE = 3
const HEIGHT = ITEM * VISIBLE
/** Relleno arriba y abajo para que el primero y el ultimo puedan quedar centrados. */
const PAD = (HEIGHT - ITEM) / 2

const MINUTES = Array.from({ length: 11 }, (_, index) => index)
const SECONDS = Array.from({ length: 12 }, (_, index) => index * 5)

/** Posicion del numero mas cercano al valor, aunque el valor no este en la lista. */
function nearestIndex(values: readonly number[], value: number): number {
  let best = 0
  for (let index = 1; index < values.length; index += 1) {
    if (Math.abs(values[index] - value) < Math.abs(values[best] - value)) best = index
  }
  return best
}

function Wheel({
  values,
  value,
  onChange,
  label,
}: {
  values: readonly number[]
  value: number
  onChange: (value: number) => void
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const commit = useRef<number | undefined>(undefined)
  const [index, setIndex] = useState(() => nearestIndex(values, value))

  // Si el valor cambia desde fuera, la rueda se coloca en su sitio.
  // La tolerancia de media fila evita estorbar mientras el dedo arrastra.
  useEffect(() => {
    const target = nearestIndex(values, value)
    setIndex(target)
    const element = ref.current
    if (!element) return
    const top = target * ITEM
    if (Math.abs(element.scrollTop - top) > ITEM / 2) element.scrollTo({ top })
  }, [value, values])

  useEffect(() => () => window.clearTimeout(commit.current), [])

  const handleScroll = () => {
    const element = ref.current
    if (!element) return
    const next = Math.min(values.length - 1, Math.max(0, Math.round(element.scrollTop / ITEM)))
    setIndex(next)
    // Se guarda cuando la rueda se detiene, no en cada numero que pasa.
    window.clearTimeout(commit.current)
    commit.current = window.setTimeout(() => {
      if (values[next] !== value) onChange(values[next])
    }, 140)
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      role="listbox"
      aria-label={label}
      className="flex-1 min-w-0 overflow-y-auto overscroll-contain no-scrollbar snap-y snap-mandatory"
      style={{ height: HEIGHT }}
    >
      <div style={{ height: PAD }} aria-hidden />
      {values.map((item, position) => (
        <button
          key={item}
          type="button"
          role="option"
          aria-selected={position === index}
          onClick={() => onChange(item)}
          style={{ height: ITEM }}
          className={cn(
            'w-full snap-center text-center tabular-nums transition-colors duration-150',
            position === index ? 'text-[19px] font-semibold text-text' : 'text-[15px] text-muted/60',
          )}
        >
          {String(item).padStart(2, '0')}
        </button>
      ))}
      <div style={{ height: PAD }} aria-hidden />
    </div>
  )
}

/**
 * Selector de tiempo con dos ruedas: minutos y segundos.
 * Se arrastra con el dedo (o con la rueda del raton) y se suelta en el numero.
 * Tambien se puede tocar un numero para ir a el.
 */
export function DurationWheel({
  value,
  onChange,
  ariaLabel,
}: {
  /** Valor en segundos. */
  value: number
  onChange: (seconds: number) => void
  ariaLabel?: string
}) {
  const minutes = Math.floor(Math.max(0, value) / 60)
  const seconds = Math.max(0, value) % 60

  return (
    <div
      className="rounded-control bg-elevated border border-line p-2 flex flex-col gap-1"
      role="group"
      aria-label={ariaLabel}
    >
      <div className="flex gap-2">
        <span className="flex-1 text-center text-xs text-muted">min</span>
        <span className="flex-1 text-center text-xs text-muted">seg</span>
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 rounded-control bg-accent-soft border border-accent-dim"
          style={{ top: PAD, height: ITEM }}
        />
        <div className="relative flex gap-2">
          <Wheel
            label="Minutos"
            values={MINUTES}
            value={minutes}
            onChange={(next) => onChange(next * 60 + seconds)}
          />
          <Wheel
            label="Segundos"
            values={SECONDS}
            value={seconds}
            onChange={(next) => onChange(minutes * 60 + next)}
          />
        </div>
      </div>
    </div>
  )
}
