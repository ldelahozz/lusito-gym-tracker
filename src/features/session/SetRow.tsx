import { ArrowLeftRight, Award, Check, Trash } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { NumberField } from '@/core/ui/NumberField'
import { cn } from '@/core/ui/cn'
import { formatSetLine, formatSigned, formatWeight } from '@/core/logic/format'
import { RIR_VALUES, type SetType } from '@/core/model/types'

export type SetDraft = {
  weightKg: number
  reps: number
  rir: number
}

type Props = {
  /** Numero que ve la persona: 1, 2, 3... dentro de su tipo. */
  position: number
  type: SetType
  logged: boolean
  open: boolean
  draft: SetDraft
  /** La misma serie de la vez pasada, si existe. */
  previous: SetDraft | null
  /** Meta de la rutina para esta serie ("6-8 · RIR 2"). */
  targetText: string | null
  weightStep: number
  isRecord?: boolean
  onOpen: () => void
  onChange: (draft: SetDraft) => void
  onComplete: () => void
  onDelete: () => void
  onSwitchType: () => void
}

/** "+2.5 kg", "+1 rep", "Igual": lo que cambio frente a la vez pasada. */
function deltaOf(draft: SetDraft, previous: SetDraft | null): { text: string; up: boolean } | null {
  if (!previous) return null
  const weight = Math.round((draft.weightKg - previous.weightKg) * 100) / 100
  if (weight !== 0) return { text: `${formatSigned(weight)} kg`, up: weight > 0 }
  const reps = draft.reps - previous.reps
  if (reps !== 0) {
    return { text: `${formatSigned(reps)} ${Math.abs(reps) === 1 ? 'rep' : 'reps'}`, up: reps > 0 }
  }
  return { text: 'Igual', up: false }
}

export function SetRow({
  position,
  type,
  logged,
  open,
  draft,
  previous,
  targetText,
  weightStep,
  isRecord,
  onOpen,
  onChange,
  onComplete,
  onDelete,
  onSwitchType,
}: Props) {
  const isWork = type === 'work'

  if (!open) {
    const delta = logged ? deltaOf(draft, previous) : null
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          // Hechas: renglon delgado y tranquilo. Pendientes: apenas un contorno.
          'w-full flex items-center gap-3 px-3 rounded-control text-left',
          'transition-[background-color,transform] duration-150 active:scale-[0.99]',
          logged ? 'min-h-12 py-1.5 bg-white/[0.03]' : 'min-h-13 py-2 border border-white/[0.07]',
        )}
      >
        <span
          className={cn(
            'grid place-items-center size-7 shrink-0 rounded-full text-sm font-semibold tabular-nums',
            logged ? 'surface-glow animate-pop' : 'surface-well text-muted',
          )}
        >
          {logged ? <Check size={15} strokeWidth={2.6} /> : position}
        </span>

        <span className="flex-1 min-w-0">
          <span className={cn('block text-[15px] tabular-nums truncate', logged ? 'text-text font-medium' : 'text-muted')}>
            {formatWeight(draft.weightKg)} kg &times; {draft.reps}
            {isWork && logged ? ` · RIR ${draft.rir}` : ''}
          </span>
          {!logged && targetText && (
            <span className="block text-xs text-muted/80 truncate">Meta {targetText}</span>
          )}
        </span>

        {isRecord ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-violet bg-violet-soft border border-violet-dim px-2 py-1 rounded-full">
            <Award size={12} />
            Récord
          </span>
        ) : (
          delta && (
            <span
              className={cn(
                'shrink-0 text-xs tabular-nums px-2 py-1 rounded-full whitespace-nowrap',
                delta.up ? 'bg-accent-soft text-accent-hi' : 'text-muted',
              )}
            >
              {delta.text}
            </span>
          )
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3.5 p-3.5 rounded-card surface-card border-accent-dim/70 animate-rise">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-bold">
            {isWork ? 'Serie' : 'Calentamiento'} {position}
          </p>
          <p className="text-xs text-muted truncate">
            {previous ? `Vez pasada: ${formatSetLine(previous)}` : 'Primera vez con esta serie'}
          </p>
        </div>
        {targetText && (
          <span className="shrink-0 text-xs font-medium text-accent-hi bg-accent-soft border border-accent-dim/60 px-2.5 py-1 rounded-full">
            Meta {targetText}
          </span>
        )}
      </div>

      {/* Etiquetas a la izquierda y los campos a todo lo ancho: numeros grandes que siempre caben. */}
      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2">
        <span className="text-sm text-muted">Peso</span>
        <NumberField
          large
          value={draft.weightKg}
          onChange={(weightKg) => onChange({ ...draft, weightKg })}
          min={0}
          max={500}
          step={weightStep}
          decimals={2}
          suffix="kg"
          ariaLabel="Peso en kilos"
        />
        <span className="text-sm text-muted">Reps</span>
        <NumberField
          large
          value={draft.reps}
          onChange={(reps) => onChange({ ...draft, reps })}
          min={0}
          max={100}
          ariaLabel="Repeticiones"
        />
      </div>

      {isWork && (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="RIR: repeticiones en reserva">
          <p className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold">RIR</span>
            <span className="text-xs text-muted">Repeticiones que te quedaban</span>
          </p>
          <div className="flex gap-1.5">
            {RIR_VALUES.map((value) => {
              const selected = draft.rir === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`RIR ${value}`}
                  onClick={() => onChange({ ...draft, rir: value })}
                  className={cn(
                    'flex-1 h-12 rounded-[12px] text-base tabular-nums transition-[transform,background-color] duration-150 active:scale-95',
                    selected ? 'surface-glow font-bold' : 'surface-well text-muted',
                  )}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Button variant="primary" size="xl" block onClick={onComplete}>
        <Check size={21} strokeWidth={2.6} />
        {logged ? 'Guardar cambios' : 'Terminé serie'}
      </Button>

      <div className="flex items-center justify-between gap-2 -mt-1">
        <button
          type="button"
          onClick={onSwitchType}
          className="inline-flex items-center gap-1.5 h-11 px-1 text-sm text-muted hover:text-text transition-colors duration-150"
        >
          <ArrowLeftRight size={14} />
          {isWork ? 'Es de calentamiento' : 'Es de trabajo'}
        </button>
        {logged && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 h-11 px-1 text-sm text-muted hover:text-text transition-colors duration-150"
          >
            <Trash size={14} />
            Borrar serie
          </button>
        )}
      </div>
    </div>
  )
}
