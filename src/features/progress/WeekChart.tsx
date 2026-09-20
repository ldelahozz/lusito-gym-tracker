import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/core/ui/Card'
import type { WeekStats } from '@/core/logic/weeks'

/** Colores tomados de la paleta de la app: nada claro, un solo acento. */
const ACCENT = '#4C8DFF'
const LINE = '#262B33'
const MUTED = '#8A919C'
const CANVAS = '#0D0F12'

type Props = {
  title: string
  /** Que dato de la semana se dibuja. */
  dataKey: keyof WeekStats
  data: WeekStats[]
  kind?: 'line' | 'bar'
  /** Como se escribe el valor en el globo y en el eje. */
  format?: (value: number) => string
  /** Texto pequeño debajo del titulo. */
  hint?: string
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
    <div className="rounded-control bg-elevated border border-line px-3 py-2 shadow-lg shadow-black/40">
      <p className="text-[11px] uppercase tracking-wider text-muted">
        Semana del {String(label ?? '')}
      </p>
      <p className="text-sm">
        <span className="text-muted">{title}: </span>
        <span className="font-semibold tabular-nums">{format(value)}</span>
      </p>
    </div>
  )
}

export function WeekChart({ title, dataKey, data, kind = 'line', format, hint }: Props) {
  const show = format ?? ((value: number) => String(Math.round(value * 10) / 10))
  const hasData = data.some((week) => {
    const value = week[dataKey]
    return typeof value === 'number' && value > 0
  })

  const axis = {
    stroke: MUTED,
    tick: { fill: MUTED, fontSize: 11 },
    tickLine: false,
    axisLine: false,
  } as const

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>

      {!hasData ? (
        <div className="h-[168px] grid place-items-center">
          <p className="text-sm text-muted">Sin datos en este rango</p>
        </div>
      ) : (
        <div className="h-[168px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            {kind === 'bar' ? (
              <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={LINE} vertical={false} />
                <XAxis dataKey="label" {...axis} minTickGap={16} />
                <YAxis {...axis} width={44} tickFormatter={show} />
                <Tooltip
                  cursor={{ fill: 'rgba(76, 141, 255, 0.12)' }}
                  content={(props) => <TooltipBox {...props} format={show} title={title} />}
                />
                <Bar
                  dataKey={dataKey}
                  fill={ACCENT}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={LINE} vertical={false} />
                <XAxis dataKey="label" {...axis} minTickGap={16} />
                <YAxis {...axis} width={44} tickFormatter={show} domain={['auto', 'auto']} />
                <Tooltip
                  cursor={{ stroke: LINE }}
                  content={(props) => <TooltipBox {...props} format={show} title={title} />}
                />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={ACCENT}
                  strokeWidth={2}
                  dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
                  // El aro del punto activo va del color del fondo: nada blanco en pantalla.
                  activeDot={{ r: 5, fill: ACCENT, stroke: CANVAS, strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
