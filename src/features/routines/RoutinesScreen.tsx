import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Copy,
  CalendarDays,
  ListChecks,
  Plus,
  Trash,
} from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { ConfirmDialog } from '@/core/ui/ConfirmDialog'
import { EmptyState } from '@/core/ui/EmptyState'
import { IconButton } from '@/core/ui/IconButton'
import { Screen } from '@/core/ui/Screen'
import { useToast } from '@/core/ui/toast-context'
import { daysUsing, removeRoutineFromSplit } from '@/core/logic/weekPlan'
import { newId } from '@/core/model/ids'
import type { Routine } from '@/core/model/types'
import { useData } from '@/core/sync/data-context'
import { listRoutineExercises, listRoutines, nextOrder } from '@/core/sync/selectors'
import { buildReorder, buildRoutineCopy, routineHasHistory } from './routine-actions'

export function RoutinesScreen() {
  const { state, settings, save, saveMany, remove } = useData()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [showArchived, setShowArchived] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Routine | null>(null)

  const routines = useMemo(() => listRoutines(state, showArchived), [state, showArchived])
  const archivedCount = useMemo(
    () => listRoutines(state, true).filter((routine) => routine.archived).length,
    [state],
  )

  const createRoutine = () => {
    const id = newId()
    save('routines', {
      id,
      name: 'Rutina nueva',
      order: nextOrder(listRoutines(state, true)),
      archived: false,
    })
    navigate(`/rutinas/${id}`)
  }

  const duplicate = (routine: Routine) => {
    saveMany(buildRoutineCopy(state, routine))
    showToast('Rutina duplicada')
  }

  const move = (routine: Routine, direction: -1 | 1) => {
    const changes = buildReorder(routines, routine.id, direction)
    if (changes.length === 0) return
    saveMany(changes.map((doc) => ({ collection: 'routines' as const, doc })))
  }

  const toggleArchive = (routine: Routine) => {
    save('routines', { ...routine, archived: !routine.archived })
    showToast(routine.archived ? 'Rutina restaurada' : 'Rutina archivada')
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    for (const link of listRoutineExercises(state, pendingDelete.id)) {
      remove('routineExercises', link)
    }
    remove('routines', pendingDelete)
    // Si estaba en el split semanal, ese dia queda en descanso.
    if (daysUsing(settings.weeklySplit, pendingDelete.id).length > 0) {
      save('settings', {
        ...settings,
        weeklySplit: removeRoutineFromSplit(settings.weeklySplit, pendingDelete.id),
      })
    }
    setPendingDelete(null)
    showToast('Rutina eliminada')
  }

  return (
    <Screen
      title="Rutinas"
      description="Arma tus rutinas aquí. Se sincronizan solas con el celular."
      actions={
        <>
          <Button onClick={() => navigate('/rutinas/split')}>
            <CalendarDays size={18} />
            Split semanal
          </Button>
          <Button onClick={() => navigate('/rutinas/ejercicios')}>Ejercicios</Button>
          <Button variant="primary" onClick={createRoutine}>
            <Plus size={18} />
            Nueva rutina
          </Button>
        </>
      }
    >
      {routines.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={showArchived ? 'No hay rutinas archivadas' : 'Todavía no hay rutinas'}
          description="Crea una rutina, ponle nombre y agrégale los ejercicios que haces."
          action={
            <Button variant="primary" onClick={createRoutine}>
              <Plus size={18} />
              Nueva rutina
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
          {routines.map((routine, index) => {
            const exerciseCount = listRoutineExercises(state, routine.id).length
            const hasHistory = routineHasHistory(state, routine.id)
            return (
              <Card key={routine.id} className="p-3 pl-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/rutinas/${routine.id}`)}
                  className="flex items-center gap-3 text-left min-w-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium truncate">{routine.name}</span>
                    <span className="block text-sm text-muted">
                      {exerciseCount === 0
                        ? 'Sin ejercicios'
                        : `${exerciseCount} ${exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`}
                      {routine.archived ? ' · Archivada' : ''}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-muted shrink-0" />
                </button>

                <div className="flex items-center gap-1 -ml-2">
                  <IconButton
                    icon={ArrowUp}
                    label="Subir"
                    disabled={index === 0}
                    onClick={() => move(routine, -1)}
                  />
                  <IconButton
                    icon={ArrowDown}
                    label="Bajar"
                    disabled={index === routines.length - 1}
                    onClick={() => move(routine, 1)}
                  />
                  <IconButton icon={Copy} label="Duplicar" onClick={() => duplicate(routine)} />
                  <IconButton
                    icon={routine.archived ? ArchiveRestore : Archive}
                    label={routine.archived ? 'Restaurar' : 'Archivar'}
                    onClick={() => toggleArchive(routine)}
                  />
                  {!hasHistory && (
                    <IconButton
                      icon={Trash}
                      label="Eliminar"
                      onClick={() => setPendingDelete(routine)}
                    />
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {archivedCount > 0 && (
        <div className="mt-6 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? 'Ocultar archivadas' : `Ver archivadas (${archivedCount})`}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar rutina"
        description={`Se elimina "${pendingDelete?.name ?? ''}". No tiene entrenamientos registrados, así que no pierdes historial.`}
        confirmLabel="Eliminar"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Screen>
  )
}
