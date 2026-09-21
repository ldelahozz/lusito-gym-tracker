import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Dumbbell, Plus, Trash, X } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { DurationWheel } from '@/core/ui/DurationWheel'
import { EmptyState } from '@/core/ui/EmptyState'
import { Field } from '@/core/ui/Field'
import { IconButton } from '@/core/ui/IconButton'
import { Input } from '@/core/ui/Input'
import { NumberField } from '@/core/ui/NumberField'
import { Screen } from '@/core/ui/Screen'
import { cn } from '@/core/ui/cn'
import { useToast } from '@/core/ui/toast-context'
import { formatMinutesSeconds, formatRepRange } from '@/core/logic/format'
import { newId } from '@/core/model/ids'
import {
  DEFAULT_REST_SECONDS,
  DEFAULT_TARGET_SETS,
  DEFAULT_WARMUP_REST_SECONDS,
  defaultPlannedSet,
  type PlannedSet,
  type RoutineExercise,
} from '@/core/model/types'
import { useData } from '@/core/sync/data-context'
import { exerciseName, listRoutineExercises, nextOrder } from '@/core/sync/selectors'
import { buildReorder } from './routine-actions'
import { ExercisePicker } from './ExercisePicker'
import { ExerciseVideoCard } from './ExerciseVideoCard'

function summaryOf(link: RoutineExercise): string {
  const count = link.workSets.length
  const first = link.workSets[0]
  const sameTarget =
    first &&
    link.workSets.every((set) => set.repsMin === first.repsMin && set.repsMax === first.repsMax)
  const series = `${count} ${count === 1 ? 'serie' : 'series'}`
  const parts = [
    sameTarget ? `${series} de ${formatRepRange(first.repsMin, first.repsMax)} reps` : series,
    link.warmupSets > 0 ? `${link.warmupSets} calent.` : 'sin calent.',
    `${formatMinutesSeconds(link.restSeconds)} descanso`,
  ]
  return parts.join(' · ')
}

function PlannedSetRow({
  position,
  set,
  canRemove,
  onChange,
  onRemove,
}: {
  position: number
  set: PlannedSet
  canRemove: boolean
  onChange: (next: PlannedSet) => void
  onRemove: () => void
}) {
  // El minimo nunca puede quedar por encima del maximo: el otro extremo se acomoda solo.
  const setMin = (repsMin: number) => onChange({ ...set, repsMin, repsMax: Math.max(repsMin, set.repsMax) })
  const setMax = (repsMax: number) => onChange({ ...set, repsMax, repsMin: Math.min(repsMax, set.repsMin) })

  return (
    <div className="rounded-control border border-line p-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Serie {position}</span>
        <IconButton
          icon={Trash}
          label={`Quitar serie ${position}`}
          size={15}
          className="size-8"
          disabled={!canRemove}
          onClick={onRemove}
        />
      </div>

      {/* Etiquetas arriba: asi cada campo usa todo el ancho y el numero siempre cabe. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1">
        <span className="text-xs text-muted">Reps mínimas</span>
        <span />
        <span className="text-xs text-muted">Reps máximas</span>
        <NumberField
          compact
          value={set.repsMin}
          onChange={setMin}
          min={1}
          max={100}
          ariaLabel={`Repeticiones mínimas, serie ${position}`}
        />
        <span className="text-sm text-muted">a</span>
        <NumberField
          compact
          value={set.repsMax}
          onChange={setMax}
          min={1}
          max={100}
          ariaLabel={`Repeticiones máximas, serie ${position}`}
        />

        <span className="text-xs text-muted mt-1.5 col-start-1">RIR objetivo</span>
        <NumberField
          compact
          className="col-start-1"
          value={set.rir}
          onChange={(rir) => onChange({ ...set, rir })}
          min={0}
          max={5}
          ariaLabel={`RIR objetivo, serie ${position}`}
        />
      </div>
    </div>
  )
}

function ExerciseCard({
  link,
  name,
  index,
  total,
  expanded,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: {
  link: RoutineExercise
  name: string
  index: number
  total: number
  expanded: boolean
  onToggle: () => void
  onChange: (next: RoutineExercise) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  const updateSet = (position: number, next: PlannedSet) => {
    onChange({
      ...link,
      workSets: link.workSets.map((set, i) => (i === position ? next : set)),
    })
  }

  const addSet = () => {
    const last = link.workSets[link.workSets.length - 1] ?? defaultPlannedSet()
    onChange({ ...link, workSets: [...link.workSets, { ...last }] })
  }

  const removeSet = (position: number) => {
    onChange({ ...link, workSets: link.workSets.filter((_, i) => i !== position) })
  }

  return (
    <Card className={cn('overflow-hidden', expanded && 'border-accent-dim')}>
      <div className="flex items-center gap-2 p-3 pl-4">
        <button type="button" onClick={onToggle} className="flex-1 min-w-0 text-left">
          <span className="block text-[15px] font-medium truncate">{name}</span>
          <span className="block text-sm text-muted truncate">{summaryOf(link)}</span>
        </button>
        <ChevronDown
          size={18}
          className={cn('text-muted transition-transform duration-200', expanded && 'rotate-180')}
        />
      </div>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-5 border-t border-line pt-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Series de trabajo</span>
            <div className="flex flex-col gap-2">
              {link.workSets.map((set, position) => (
                <PlannedSetRow
                  key={position}
                  position={position + 1}
                  set={set}
                  canRemove={link.workSets.length > 1}
                  onChange={(next) => updateSet(position, next)}
                  onRemove={() => removeSet(position)}
                />
              ))}
            </div>
            <Button size="sm" onClick={addSet} className="self-start">
              <Plus size={16} />
              Agregar serie
            </Button>
          </div>

          <Field label="Descanso entre series de trabajo">
            <DurationWheel
              value={link.restSeconds}
              onChange={(restSeconds) => onChange({ ...link, restSeconds })}
              ariaLabel="Descanso entre series de trabajo"
            />
          </Field>

          <Field label="Series de calentamiento">
            <NumberField
              value={link.warmupSets}
              onChange={(warmupSets) => onChange({ ...link, warmupSets })}
              min={0}
              max={10}
              suffix="series"
              ariaLabel="Series de calentamiento"
            />
          </Field>

          {link.warmupSets > 0 && (
            <Field label="Descanso entre calentamientos">
              <DurationWheel
                value={link.warmupRestSeconds}
                onChange={(warmupRestSeconds) => onChange({ ...link, warmupRestSeconds })}
                ariaLabel="Descanso entre calentamientos"
              />
            </Field>
          )}

          <ExerciseVideoCard exerciseId={link.exerciseId} exerciseName={name} />

          <div className="flex items-center gap-1 -ml-2">
            <IconButton icon={ArrowUp} label="Subir" disabled={index === 0} onClick={() => onMove(-1)} />
            <IconButton
              icon={ArrowDown}
              label="Bajar"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
            />
            <IconButton icon={Trash} label="Quitar de la rutina" onClick={onRemove} className="ml-auto" />
          </div>
        </div>
      )}
    </Card>
  )
}

export function RoutineEditor() {
  const { routineId = '' } = useParams()
  const navigate = useNavigate()
  const { state, settings, save, saveMany, remove } = useData()
  const { showToast } = useToast()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  const routine = state.routines[routineId]
  const links = useMemo(() => listRoutineExercises(state, routineId), [state, routineId])

  useEffect(() => {
    if (routine && !routine.deleted) setName(routine.name)
  }, [routine])

  if (!routine || routine.deleted) {
    return (
      <Screen title="Rutina">
        <EmptyState
          icon={Dumbbell}
          title="Esta rutina ya no existe"
          action={<Button onClick={() => navigate('/rutinas')}>Volver a Rutinas</Button>}
        />
      </Screen>
    )
  }

  const commitName = () => {
    const clean = name.trim()
    if (!clean || clean === routine.name) {
      setName(routine.name)
      return
    }
    save('routines', { ...routine, name: clean })
  }

  const addExercise = (exerciseId: string) => {
    if (links.some((link) => link.exerciseId === exerciseId)) {
      showToast('Ese ejercicio ya está en la rutina')
      return
    }
    const id = newId()
    save('routineExercises', {
      id,
      routineId,
      exerciseId,
      order: nextOrder(links),
      workSets: Array.from({ length: DEFAULT_TARGET_SETS }, defaultPlannedSet),
      warmupSets: settings.defaultWarmupSets,
      restSeconds: DEFAULT_REST_SECONDS,
      warmupRestSeconds: DEFAULT_WARMUP_REST_SECONDS,
    })
    setExpandedId(id)
    setAdding(false)
  }

  const finishEditing = () => {
    commitName()
    showToast('Rutina guardada')
    navigate('/rutinas')
  }

  const move = (link: RoutineExercise, direction: -1 | 1) => {
    const changes = buildReorder(links, link.id, direction)
    if (changes.length === 0) return
    saveMany(changes.map((doc) => ({ collection: 'routineExercises' as const, doc })))
  }

  return (
    <Screen
      title={routine.name}
      actions={
        <Button variant="ghost" onClick={() => navigate('/rutinas')}>
          <ArrowLeft size={18} />
          Rutinas
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-4">
        <Field label="Nombre de la rutina">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
            placeholder="Empuje, Pierna, Espalda..."
          />
        </Field>

        {links.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Sin ejercicios todavía"
            description="Agrega el primero con el botón de abajo. Puedes escribir cualquier nombre."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {links.map((link, index) => (
              <ExerciseCard
                key={link.id}
                link={link}
                name={exerciseName(state, link.exerciseId)}
                index={index}
                total={links.length}
                expanded={expandedId === link.id}
                onToggle={() => setExpandedId(expandedId === link.id ? null : link.id)}
                onChange={(next) => save('routineExercises', next)}
                onMove={(direction) => move(link, direction)}
                onRemove={() => {
                  remove('routineExercises', link)
                  showToast('Ejercicio quitado de la rutina')
                }}
              />
            ))}
          </div>
        )}

        {adding ? (
          <Card className="p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Agregar ejercicio</h2>
              <IconButton icon={X} label="Cancelar" size={18} onClick={() => setAdding(false)} />
            </div>
            <ExercisePicker onPick={addExercise} />
          </Card>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-2 h-14 rounded-card border border-dashed border-line text-muted hover:text-text hover:border-accent-dim transition-colors duration-150"
          >
            <Plus size={18} />
            Agregar ejercicio
          </button>
        )}

        <div className="flex flex-col items-center gap-2 pt-2">
          <Button variant="primary" size="lg" className="w-full" onClick={finishEditing}>
            <Check size={20} />
            Guardar rutina
          </Button>
          <p className="text-xs text-muted text-center">
            Cada cambio se guarda solo mientras editas, aquí o en el celular.
          </p>
        </div>
      </div>
    </Screen>
  )
}
