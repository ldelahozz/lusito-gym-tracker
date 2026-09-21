import { useMemo, useState } from 'react'
import { AlertTriangle, Trash } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { ConfirmDialog } from '@/core/ui/ConfirmDialog'
import { Input } from '@/core/ui/Input'
import { Modal } from '@/core/ui/Modal'
import { useToast } from '@/core/ui/toast-context'
import {
  purgeExercise,
  purgeRoutine,
  purgeTraining,
  type PurgePlan,
  type PurgeTables,
} from '@/core/logic/purge'
import { daysUsing, removeRoutineFromSplit } from '@/core/logic/weekPlan'
import { useData } from '@/core/sync/data-context'
import { listExercises, listRoutines } from '@/core/sync/selectors'
import { clearSessionState } from '@/features/session/session-storage'

/** Palabra que hay que escribir para borrar todos los entrenamientos. */
const WIPE_WORD = 'BORRAR'

type Pending = {
  title: string
  description: string
  plan: PurgePlan
  done: string
  after?: () => void
}

function historyText(plan: PurgePlan): string {
  if (plan.sessions === 0 && plan.sets === 0) return 'No tiene entrenamientos registrados.'
  const parts: string[] = []
  if (plan.sessions > 0) parts.push(`${plan.sessions} ${plan.sessions === 1 ? 'sesión' : 'sesiones'}`)
  if (plan.sets > 0) parts.push(`${plan.sets} ${plan.sets === 1 ? 'serie' : 'series'}`)
  return `Se borran también ${parts.join(' y ')}.`
}

export function DangerZone() {
  const { state, settings, save, destroy } = useData()
  const { showToast } = useToast()
  const [pending, setPending] = useState<Pending | null>(null)
  const [wipeOpen, setWipeOpen] = useState(false)
  const [typed, setTyped] = useState('')

  const tables = state as unknown as PurgeTables
  const archivedRoutines = useMemo(() => listRoutines(state, true).filter((item) => item.archived), [state])
  const archivedExercises = useMemo(
    () => listExercises(state, true).filter((item) => item.archived),
    [state],
  )
  const trainingPlan = useMemo(() => purgeTraining(tables), [tables])

  const run = (plan: PurgePlan, message: string, after?: () => void) => {
    // Se borra en segundo plano: la pantalla cambia al instante, con o sin internet.
    void destroy(plan.targets).catch(() =>
      showToast('Parte del borrado no llegó a la nube. Se reintenta cuando vuelva la conexión.'),
    )
    after?.()
    showToast(message)
  }

  const askRoutine = (routineId: string, name: string) => {
    const plan = purgeRoutine(tables, routineId)
    setPending({
      title: `Borrar «${name}» para siempre`,
      description: `${historyText(plan)} Desaparece de todos tus dispositivos y no se puede deshacer, salvo con un respaldo.`,
      plan,
      done: 'Rutina borrada para siempre',
      after: () => {
        if (daysUsing(settings.weeklySplit, routineId).length > 0) {
          save('settings', { ...settings, weeklySplit: removeRoutineFromSplit(settings.weeklySplit, routineId) })
        }
      },
    })
  }

  const askExercise = (exerciseId: string, name: string) => {
    const plan = purgeExercise(tables, exerciseId)
    setPending({
      title: `Borrar «${name}» para siempre`,
      description: `${historyText(plan)} Sale también de las rutinas donde esté. No se puede deshacer, salvo con un respaldo.`,
      plan,
      done: 'Ejercicio borrado para siempre',
    })
  }

  const confirmWipe = () => {
    run(trainingPlan, 'Entrenamientos borrados', clearSessionState)
    setWipeOpen(false)
    setTyped('')
  }

  return (
    <Card className="p-4 flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-muted shrink-0 mt-0.5" />
        <p className="text-sm text-muted leading-relaxed">
          Lo que borres aquí desaparece de la nube y de todos tus dispositivos. No se puede deshacer,
          salvo que tengas un respaldo. Exporta uno antes si tienes duda.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-medium">Todos los entrenamientos</p>
        <p className="text-sm text-muted leading-relaxed">
          Borra todas tus sesiones, series, notas y récords. Tus rutinas, ejercicios y ajustes se
          quedan: sirve para empezar de cero después de hacer pruebas.
        </p>
        <Button
          className="self-start"
          disabled={trainingPlan.targets.length === 0}
          onClick={() => setWipeOpen(true)}
        >
          <Trash size={16} />
          {trainingPlan.targets.length === 0 ? 'No hay entrenamientos' : 'Borrar todos los entrenamientos'}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-medium">Rutinas archivadas</p>
        {archivedRoutines.length === 0 ? (
          <p className="text-sm text-muted">
            No hay. Para borrar una rutina para siempre, primero archívala en Rutinas.
          </p>
        ) : (
          archivedRoutines.map((routine) => (
            <div
              key={routine.id}
              className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-control bg-elevated border border-line"
            >
              <span className="flex-1 min-w-0 text-sm truncate">{routine.name}</span>
              <Button size="sm" variant="ghost" onClick={() => askRoutine(routine.id, routine.name)}>
                <Trash size={15} />
                Borrar
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-medium">Ejercicios archivados</p>
        {archivedExercises.length === 0 ? (
          <p className="text-sm text-muted">
            No hay. Para borrar un ejercicio para siempre, primero archívalo en Rutinas &rsaquo; Ejercicios.
          </p>
        ) : (
          archivedExercises.map((exercise) => (
            <div
              key={exercise.id}
              className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-control bg-elevated border border-line"
            >
              <span className="flex-1 min-w-0 text-sm truncate">{exercise.name}</span>
              <Button size="sm" variant="ghost" onClick={() => askExercise(exercise.id, exercise.name)}>
                <Trash size={15} />
                Borrar
              </Button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ''}
        description={pending?.description ?? ''}
        confirmLabel="Borrar para siempre"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) run(pending.plan, pending.done, pending.after)
          setPending(null)
        }}
      />

      <Modal
        open={wipeOpen}
        onClose={() => {
          setWipeOpen(false)
          setTyped('')
        }}
        title="Borrar todos los entrenamientos"
        description={`Se borran ${trainingPlan.sessions} ${trainingPlan.sessions === 1 ? 'sesión' : 'sesiones'} y ${trainingPlan.sets} ${trainingPlan.sets === 1 ? 'serie' : 'series'}, con sus notas y récords. Tus rutinas y ejercicios se quedan.`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setWipeOpen(false)
                setTyped('')
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={typed.trim().toUpperCase() !== WIPE_WORD}
              onClick={confirmWipe}
            >
              Borrar todo
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-relaxed">
            Para confirmar escribe <span className="font-semibold">{WIPE_WORD}</span>:
          </p>
          <Input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={WIPE_WORD}
            autoCapitalize="characters"
            autoComplete="off"
            aria-label={`Escribe ${WIPE_WORD} para confirmar`}
          />
        </div>
      </Modal>
    </Card>
  )
}
