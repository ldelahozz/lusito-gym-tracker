/** Acciones sobre rutinas que se usan desde varias pantallas. */
import { newId } from '@/core/model/ids'
import type { Routine } from '@/core/model/types'
import type { CollectionName } from '@/core/sync/collections'
import type { DataState, NewDoc } from '@/core/sync/data-context'
import { listRoutineExercises, listRoutines, nextOrder } from '@/core/sync/selectors'

export type SaveEntry = { collection: CollectionName; doc: NewDoc<CollectionName> }

/** true si la rutina ya tiene entrenamientos registrados (entonces no se borra: se archiva). */
export function routineHasHistory(state: DataState, routineId: string): boolean {
  return Object.values(state.sessions).some(
    (session) => !session.deleted && session.routineId === routineId,
  )
}

/** Copia una rutina completa con todos sus ejercicios y ajustes. */
export function buildRoutineCopy(state: DataState, routine: Routine): SaveEntry[] {
  const copyId = newId()
  const entries: SaveEntry[] = [
    {
      collection: 'routines',
      doc: {
        id: copyId,
        name: `${routine.name} (copia)`,
        order: nextOrder(listRoutines(state, true)),
        archived: false,
      } as NewDoc<'routines'>,
    },
  ]

  for (const link of listRoutineExercises(state, routine.id)) {
    entries.push({
      collection: 'routineExercises',
      doc: {
        id: newId(),
        routineId: copyId,
        exerciseId: link.exerciseId,
        order: link.order,
        workSets: link.workSets.map((set) => ({ ...set })),
        warmupSets: link.warmupSets,
        restSeconds: link.restSeconds,
        warmupRestSeconds: link.warmupRestSeconds,
      } as NewDoc<'routineExercises'>,
    })
  }

  return entries
}

/**
 * Intercambia la posicion de un elemento con su vecino.
 * Devuelve los dos documentos que hay que guardar, o una lista vacia si no se puede mover.
 */
export function buildReorder<T extends { id: string; order: number }>(
  items: readonly T[],
  id: string,
  direction: -1 | 1,
): T[] {
  const index = items.findIndex((item) => item.id === id)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return []

  const current = items[index]
  const neighbour = items[targetIndex]
  return [
    { ...current, order: neighbour.order },
    { ...neighbour, order: current.order },
  ]
}
