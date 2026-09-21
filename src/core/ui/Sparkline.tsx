import { useId } from 'react'

type Props = {
  values: number[]
  width?: number
  height?: number
  label?: string
}

/**
 * Mini grafica de linea, sin ejes: solo la forma de como ha ido.
 * Dibujada a mano para no cargar la libreria de graficas en la pantalla principal.
 */
export function Sparkline({ values, width = 96, height = 36, label }: Props) {
  const id = useId()
  if (values.length < 2) return null

  const pad = 3
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((value, index) => ({
    x: pad + (index / (values.length - 1)) * (width - pad * 2),
    // Si todo es igual, la linea va a media altura.
    y: max === min ? height / 2 : pad + (1 - (value - min) / span) * (height - pad * 2),
  }))
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const area = `${line} L${points[points.length - 1].x.toFixed(1)} ${height} L${points[0].x.toFixed(1)} ${height} Z`
  const last = points[points.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4c8dff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8a74ff" />
        </linearGradient>
        <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6f6bff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#6f6bff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id}-area)`} />
      <path d={line} fill="none" stroke={`url(#${id}-line)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="3" fill="#8a74ff" stroke="#0d0f12" strokeWidth="1.5" />
    </svg>
  )
}
