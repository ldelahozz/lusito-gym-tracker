import { ArrowLeftRight, Check, Trash } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { IconButton } from '@/core/ui/IconButton'
import { NumberField } from '@/core/ui/NumberField'
import { cn } from '@/core/ui/cn'
import { formatWeight } from '@/core/logic/format'
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
  previousText: string | null
  weightStep: number
  isRecord?: boolean
  onOpen: () => void
  onChange: (draft: SetDraft) => void
  onComplete: () => void
  onDelete: () => void
  onSwitchType: () => void
}

export function SetRow({
  position,
  type,
  logged,
  open,
  draft,
  previousText,
  weightStep,
  isRecord,
  onOpen,
  onChange,
  onComplete,
  onDelete,
  onSwitchType,
}: Props) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'w-full flex items-center gap-3 h-14 px-3 rounded-control text-left',
          'transition-colors duration-150',
          logged ? 'bg-surface' : 'bg-transparent border border-dashed border-line',
        )}
      >
        <span
          className={cn(
            'grid place-items-center size-8 shrink-0 rounded-full text-sm tabular-nums',
            logged ? 'bg-accent-soft text-accent' : 'text-muted',
          )}
        >
          {logged ? <Check size={16} /> : position}
        </span>

        <span className="flex-1 min-w-0">
          <span className={cn('block text-[15px] tabular-nums', logged ? 'text-text' : 'text-muted')}>
            {formatWeight(draft.weightKg)} kg &times; {draft.reps}
            {type === 'work' ? ` · RIR ${draft.rir}` : ''}
          </span>
          {!logged && previousText && (
            <span className="block text-xs text-muted/80 truncate">{previousText}</span>
          )}
        </span>

        {isRecord && (
          <span className="shrink-0 text-[11px] uppercase tracking-wider text-accent bg-accent-soft px-2 py-1 rounded-full">
            Record
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3 rounded-control bg-surface border border-accent-dim">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-muted">
          {type === 'warmup' ? 'Calentamiento' : 'Serie'} {position}
        </span>
        {previousText && <span className="text-xs text-muted truncate">{previousText}</span>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          value={draft.weightKg}
          onChange={(weightKg) => onChange({ ...draft, weightKg })}
          min={0}
          max={500}
          step={weightStep}
          decimals={2}
          suffix="kg"
          ariaLabel="Peso en kilos"
        />
        <NumberField
          value={draft.reps}
          onChange={(reps) => onChange({ ...draft, reps })}
          min={0}
          max={100}
          ariaLabel="Repeticiones"
        />
      </div>

      {type === 'work' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-muted">RIR</span>
          <div className="flex gap-1.5">
            {RIR_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...draft, rir: value })}
                className={cn(
                  'flex-1 h-12 rounded-control text-[15px] tabular-nums transition-colors duration-150',
                  draft.rir === value
                    ? 'bg-accent text-canvas font-semibold'
                    : 'bg-elevated text-muted border border-line',
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="primary" size="lg" className="flex-1" onClick={onComplete}>
          <Check size={20} />
          {logged ? 'Guardar cambios' : 'Termine serie'}
        </Button>
        <IconButton
          icon={ArrowLeftRight}
          label={type === 'warmup' ? 'Pasar a serie de trabajo' : 'Pasar a calentamiento'}
          onClick={onSwitchType}
        />
        {logged && <IconButton icon={Trash} label="Borrar serie" onClick={onDelete} />}
      </div>
    </div>
  )
}
