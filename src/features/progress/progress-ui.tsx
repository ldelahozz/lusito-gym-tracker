import { ArrowDown, ArrowUp, Equal, Sparkles } from 'lucide-react'
import { cn } from '@/core/ui/cn'
import { formatSetLine, formatSigned } from '@/core/logic/format'
import type { SetComparison, Trend } from '@/core/logic/progress'

const TREND_TEXT: Record<Trend['kind'], Record<'weight' | 'reps' | 'none', string>> = {
  up: { weight: 'Subió el peso', reps: 'Más repeticiones', none: 'Subió' },
  down: { weight: 'Bajó el peso', reps: 'Menos repeticiones', none: 'Bajó' },
  same: { weight: 'Igual', reps: 'Igual', none: 'Igual que la vez pasada' },
  new: { weight: 'Primera vez', reps: 'Primera vez', none: 'Primera vez' },
}

/** Veredicto del ejercicio frente a la vez anterior. Sin rojo ni verde: azul es subir, gris lo demas. */
export function TrendBadge({ trend, className }: { trend: Trend; className?: string }) {
  const Icon =
    trend.kind === 'up' ? ArrowUp : trend.kind === 'down' ? ArrowDown : trend.kind === 'new' ? Sparkles : Equal
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs whitespace-nowrap',
        trend.kind === 'up'
          ? 'bg-accent-soft text-accent'
          : 'bg-elevated text-muted border border-line',
        className,
      )}
    >
      <Icon size={13} />
      {TREND_TEXT[trend.kind][trend.reason ?? 'none']}
    </span>
  )
}

function DeltaPill({ value, unit, neutral }: { value: number; unit: string; neutral?: boolean }) {
  const up = value > 0
  return (
    <span
      className={cn(
        'inline-flex items-center h-6 px-2 rounded-full text-[11px] tabular-nums whitespace-nowrap',
        neutral
          ? 'bg-elevated text-muted border border-line'
          : up
            ? 'bg-accent-soft text-accent'
            : 'bg-elevated text-muted border border-line',
      )}
    >
      {neutral ? `${unit} ${formatSigned(value)}` : `${formatSigned(value)} ${unit}`}
    </span>
  )
}

/**
 * Una serie de hoy frente a la misma serie de la vez anterior:
 * lo que hiciste, lo que habias hecho, y la diferencia.
 */
export function SetCompareRow({
  row,
  firstTime = false,
}: {
  row: SetComparison
  /** Primera vez que se hace el ejercicio: no se marca cada serie como nueva. */
  firstTime?: boolean
}) {
  const { current, previous, weightDelta, repsDelta, rirDelta } = row
  const repsUnit = repsDelta !== null && Math.abs(repsDelta) === 1 ? 'rep' : 'reps'

  const pills = [
    current && !previous && !firstTime ? (
      <span
        key="new"
        className="inline-flex items-center h-6 px-2 rounded-full text-[11px] bg-elevated text-muted border border-line"
      >
        serie nueva
      </span>
    ) : null,
    weightDelta !== null && weightDelta !== 0 ? (
      <DeltaPill key="kg" value={weightDelta} unit="kg" />
    ) : null,
    repsDelta !== null && repsDelta !== 0 ? (
      <DeltaPill key="reps" value={repsDelta} unit={repsUnit} />
    ) : null,
    rirDelta !== null && rirDelta !== 0 ? (
      <DeltaPill key="rir" value={rirDelta} unit="RIR" neutral />
    ) : null,
    weightDelta === 0 && repsDelta === 0 && rirDelta === 0 ? (
      <span key="same" className="inline-flex items-center h-6 text-[11px] text-muted">
        igual
      </span>
    ) : null,
  ].filter(Boolean)

  return (
    <div className="flex items-start gap-3 py-2.5 border-t border-line first:border-t-0">
      <span className="grid place-items-center size-6 mt-0.5 shrink-0 rounded-full bg-elevated text-[11px] text-muted tabular-nums">
        {row.position}
      </span>

      <div className="min-w-0 flex-1">
        {current ? (
          <p className="text-sm tabular-nums">{formatSetLine(current)}</p>
        ) : (
          <p className="text-sm text-muted">No la hiciste</p>
        )}
        {previous && (
          <p className="text-xs text-muted tabular-nums mt-0.5">antes {formatSetLine(previous)}</p>
        )}
        {pills.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{pills}</div>}
      </div>
    </div>
  )
}
