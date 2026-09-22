import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/** Colores de la paleta de la app: nada claro, un solo acento. */
const ACCENT = '#4C8DFF'
const LINE = '#262B33'
const MUTED = '#8A919C'
const CANVAS = '#0D0F12'

export type ChartPoint = {
  key: string
  /** Fecha corta que va en el eje: "15 sep". */
  label: string
  value: number
}

function TooltipBox({
  active,
  payload,
  label,
  format,
  title,
}: {
  active?: boolean
  // Recharts entrega estos datos sin un tipo estrecho; aqui se validan a mano.
  payload?: ReadonlyArray<{ value?: unknown }>
  label?: unknown
  format: (value: number) => string
  title: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const raw = payload[0]?.value
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(value)) return null

  return (
    <div className="rounded-control surface-sheet px-3 py-2">
      <p className="text-xs text-muted">{String(label ?? '')}</p>
      <p className="text-sm">
        <span className="text-muted">{title}: </span>
        <span className="font-semibold tabular-nums">{format(value)}</span>
      </p>
    </div>
  )
}

/** Una linea con un punto por sesion. */
export function ProgressChart({
  title,
  points,
  format,
}: {
  title: string
  points: ChartPoint[]
  format: (value: number) => string
}) {
  if (points.length < 2) {
    return (
      <div className="h-[180px] grid place-items-center text-center px-6">
        <p className="text-sm text-muted">
          La gráfica aparece a partir de la segunda vez que hagas este ejercicio.
        </p>
      </div>
    )
  }

  const axis = {
    stroke: MUTED,
    tick: { fill: MUTED, fontSize: 11 },
    tickLine: false,
    axisLine: false,
  } as const

  return (
    <div className="h-[180px] -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="label" {...axis} minTickGap={20} />
          {/* Marcas enteras en el eje (60, 61, 62); el globo sigue mostrando el valor exacto. */}
          <YAxis
            {...axis}
            width={44}
            tickFormatter={format}
            domain={['auto', 'auto']}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: LINE }}
            content={(props) => <TooltipBox {...props} format={format} title={title} />}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={ACCENT}
            strokeWidth={2}
            dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
            // El aro del punto activo va del color del fondo: nada blanco en pantalla.
            activeDot={{ r: 5, fill: ACCENT, stroke: CANVAS, strokeWidth: 2 }}
            // Sin animacion de entrada: con ella la linea a veces no se dibuja.
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
