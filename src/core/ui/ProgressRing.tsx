import { useId, type ReactNode } from 'react'

type Props = {
  /** De 0 a 1. */
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
  label?: string
}

/** Anillo de avance con degradado azul a violeta. El contenido va al centro. */
export function ProgressRing({ value, size = 56, stroke = 6, children, label }: Props) {
  const id = useId()
  const radius = (size - stroke) / 2
  const length = 2 * Math.PI * radius
  const clamped = Math.min(1, Math.max(0, value))

  return (
    <div
      className="relative grid place-items-center shrink-0"
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6aa2ff" />
            <stop offset="100%" stopColor="#8a74ff" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#232a36" strokeWidth={stroke} />
        {clamped > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={length}
            strokeDashoffset={length * (1 - clamped)}
            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22, 0.61, 0.36, 1)' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}
