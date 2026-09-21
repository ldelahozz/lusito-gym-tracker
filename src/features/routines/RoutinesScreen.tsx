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
  Dumbbell,
  ListChecks,
  MoreHorizontal,
  Plus,
  Trash,
} from 'lucide-react'
import { ActionSheet } from '@/core/ui/ActionSheet'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { ConfirmDialog } from '@/core/ui/ConfirmDialog'
import { EmptyState } from '@/core/ui/EmptyState'
import { IconButton } from '@/core/ui/IconButton'
import { Screen } from '@/core/ui/Screen'
import { useToast } from '@/core/ui/toast-context'
import { WEEKDAYS_SHORT, daysUsing, removeRoutineFromSplit } from '@/core/logic/weekPlan'
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
  const [menuFor, setMenuFor] = useState<Routine | null>(null)

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

  const menuIndex = menuFor ? routines.findIndex((routine) => routine.id === menuFor.id) : -1

  /** Accesos a lo que se configura aparte de las rutinas. */
  const shortcut = (to: string, Icon: typeof CalendarDays, title: string, hint: string) => (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="surface-card flex items-center gap-3 p-3 rounded-card text-left transition-transform duration-150 active:scale-[0.98] hover:border-accent-dim"
    >
      <span className="grid place-items-center size-10 rounded-control bg-accent-soft text-accent-hi shrink-0">
        <Icon size={19} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold truncate">{title}</span>
        <span className="block text-xs text-muted truncate">{hint}</span>
      </span>
    </button>
  )

  return (
    <Screen title="Rutinas" description="Arma tus rutinas aquí. Se sincronizan solas con el celular.">
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {shortcut('/rutinas/split', CalendarDays, 'Split semanal', 'Qué va cada día')}
        {shortcut('/rutinas/ejercicios', Dumbbell, 'Ejercicios', 'Tu catálogo')}
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {showArchived ? 'Todas tus rutinas' : 'Tus rutinas'}
        </h2>
        <Button variant="primary" size="sm" onClick={createRoutine}>
          <Plus size={16} />
          Nueva rutina
        </Button>
      </div>

      {routines.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={showArchived ? 'No hay rutinas archivadas' : 'Todavía no hay rutinas'}
          description="Crea una rutina, ponle nombre y agrégale los ejercicios que haces."
        />
      ) : (
        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-4">
          {routines.map((routine, index) => {
            const exerciseCount = listRoutineExercises(state, routine.id).length
            const days = daysUsing(settings.weeklySplit, routine.id).map((day) => WEEKDAYS_SHORT[day])
            return (
              <Card
                key={routine.id}
                className="flex items-center gap-1 pr-1.5 animate-rise"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/rutinas/${routine.id}`)}
                  className="flex-1 min-w-0 flex items-center gap-3 p-3.5 pr-1 text-left"
                >
                  <span className="grid place-items-center size-11 rounded-control surface-well text-accent-hi shrink-0">
                    <Dumbbell size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold truncate">{routine.name}</span>
                    <span className="block text-sm text-muted truncate">
                      {exerciseCount === 0
                        ? 'Sin ejercicios'
                        : `${exerciseCount} ${exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`}
                      {days.length > 0 && ` · ${days.join(', ')}`}
                      {routine.archived ? ' · Archivada' : ''}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-muted shrink-0" />
                </button>
                <IconButton
                  icon={MoreHorizontal}
                  label={`Opciones de ${routine.name}`}
                  onClick={() => setMenuFor(routine)}
                />
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

      <ActionSheet
        open={menuFor !== null}
        title={menuFor?.name ?? ''}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                {
                  icon: ArrowUp,
                  label: 'Subir en la lista',
                  onSelect: () => move(menuFor, -1),
                  disabled: menuIndex <= 0,
                },
                {
                  icon: ArrowDown,
                  label: 'Bajar en la lista',
                  onSelect: () => move(menuFor, 1),
                  disabled: menuIndex === routines.length - 1,
                },
                { icon: Copy, label: 'Duplicar', onSelect: () => duplicate(menuFor) },
                {
                  icon: menuFor.archived ? ArchiveRestore : Archive,
                  label: menuFor.archived ? 'Restaurar' : 'Archivar',
                  onSelect: () => toggleArchive(menuFor),
                },
                ...(routineHasHistory(state, menuFor.id)
                  ? []
                  : [{ icon: Trash, label: 'Eliminar', onSelect: () => setPendingDelete(menuFor), subtle: true }]),
              ]
            : []
        }
      />

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
