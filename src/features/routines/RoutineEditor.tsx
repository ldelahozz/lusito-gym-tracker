import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, Dumbbell, Trash } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { EmptyState } from '@/core/ui/EmptyState'
import { Field } from '@/core/ui/Field'
import { IconButton } from '@/core/ui/IconButton'
import { Input } from '@/core/ui/Input'
import { NumberField } from '@/core/ui/NumberField'
import { Screen } from '@/core/ui/Screen'
import { cn } from '@/core/ui/cn'
import { useToast } from '@/core/ui/toast-context'
import { newId } from '@/core/model/ids'
import { DEFAULT_REST_SECONDS, DEFAULT_TARGET_SETS, type RoutineExercise } from '@/core/model/types'
import { useData } from '@/core/sync/data-context'
import { exerciseName, listRoutineExercises, nextOrder } from '@/core/sync/selectors'
import { formatRest } from '@/core/logic/format'
import { buildReorder } from './routine-actions'
import { ExercisePicker } from './ExercisePicker'

function summaryOf(link: RoutineExercise): string {
  const parts = [
    `${link.targetSets} ${link.targetSets === 1 ? 'serie' : 'series'}`,
    link.warmupSets > 0 ? `${link.warmupSets} calent.` : 'sin calent.',
    `${formatRest(link.restSeconds)} descanso`,
  ]
  if (link.repRange) parts.push(`${link.repRange.min}-${link.repRange.max} reps`)
  return parts.join(' · ')
}

function ExerciseRow({
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
  const range = link.repRange

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
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-line pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Series de trabajo">
              <NumberField
                value={link.targetSets}
                onChange={(value) => onChange({ ...link, targetSets: value })}
                min={1}
                max={20}
                ariaLabel="Series de trabajo"
              />
            </Field>
            <Field label="Calentamiento">
              <NumberField
                value={link.warmupSets}
                onChange={(value) => onChange({ ...link, warmupSets: value })}
                min={0}
                max={10}
                ariaLabel="Series de calentamiento"
              />
            </Field>
          </div>

          <Field label="Descanso" hint={`Cuenta regresiva de ${formatRest(link.restSeconds)} al terminar cada serie.`}>
            <NumberField
              value={link.restSeconds}
              onChange={(value) => onChange({ ...link, restSeconds: value })}
              min={0}
              max={600}
              step={15}
              suffix="s"
              ariaLabel="Segundos de descanso"
            />
          </Field>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-wider text-muted">Rango de reps</span>
              <Button
                size="sm"
                variant={range ? 'secondary' : 'ghost'}
                onClick={() =>
                  onChange({ ...link, repRange: range ? null : { min: 8, max: 12 } })
                }
              >
                {range ? 'Quitar' : 'Agregar'}
              </Button>
            </div>
            {range && (
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  value={range.min}
                  onChange={(value) =>
                    onChange({ ...link, repRange: { min: value, max: Math.max(value, range.max) } })
                  }
                  min={1}
                  max={50}
                  ariaLabel="Repeticiones minimas"
                />
                <NumberField
                  value={range.max}
                  onChange={(value) =>
                    onChange({ ...link, repRange: { min: Math.min(range.min, value), max: value } })
                  }
                  min={1}
                  max={50}
                  ariaLabel="Repeticiones maximas"
                />
              </div>
            )}
          </div>

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
      showToast('Ese ejercicio ya esta en la rutina')
      return
    }
    const id = newId()
    save('routineExercises', {
      id,
      routineId,
      exerciseId,
      order: nextOrder(links),
      targetSets: DEFAULT_TARGET_SETS,
      warmupSets: settings.defaultWarmupSets,
      restSeconds: DEFAULT_REST_SECONDS,
      repRange: null,
    })
    setExpandedId(id)
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
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[1fr_320px] md:items-start md:gap-8">
        <div className="flex flex-col gap-4 min-w-0">
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
              title="Sin ejercicios todavia"
              description="Agrega el primero con el buscador. Puedes escribir cualquier nombre."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {links.map((link, index) => (
                <ExerciseRow
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
        </div>

        <Card className="p-4 flex flex-col gap-3 md:sticky md:top-8">
          <h2 className="text-sm font-semibold">Agregar ejercicio</h2>
          <ExercisePicker onPick={addExercise} />
        </Card>
      </div>
    </Screen>
  )
}
