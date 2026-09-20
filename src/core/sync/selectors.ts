/**
 * Lecturas sobre la copia en memoria de los datos.
 * Todas ignoran lo borrado y devuelven las listas ya ordenadas.
 */
import { normalizeRoutineExercise, type Exercise, type LegacyRoutineExercise, type Routine, type RoutineExercise } from '@/core/model/types'
import type { DataState } from './data-context'

function visible<T extends { deleted: boolean }>(table: Record<string, T>): T[] {
  return Object.values(table).filter((item) => !item.deleted)
}

export function listRoutines(state: DataState, includeArchived = false): Routine[] {
  return visible(state.routines)
    .filter((routine) => includeArchived || !routine.archived)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'es'))
}

export function listRoutineExercises(state: DataState, routineId: string): RoutineExercise[] {
  return visible(state.routineExercises)
    .filter((link) => link.routineId === routineId)
    .sort((a, b) => a.order - b.order)
    .map((link) => normalizeRoutineExercise(link as LegacyRoutineExercise))
}

export function listExercises(state: DataState, includeArchived = false): Exercise[] {
  return visible(state.exercises)
    .filter((exercise) => includeArchived || !exercise.archived)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function getExercise(state: DataState, id: string): Exercise | undefined {
  const exercise = state.exercises[id]
  return exercise && !exercise.deleted ? exercise : undefined
}

export function exerciseName(state: DataState, id: string): string {
  return getExercise(state, id)?.name ?? 'Ejercicio borrado'
}

/** Cuantas rutinas usan un ejercicio (sin contar las borradas). */
export function countRoutinesUsing(state: DataState, exerciseId: string): number {
  const routineIds = new Set(
    visible(state.routineExercises)
      .filter((link) => link.exerciseId === exerciseId)
      .map((link) => link.routineId),
  )
  return [...routineIds].filter((id) => state.routines[id] && !state.routines[id].deleted).length
}

/** Cuantas series de trabajo se han registrado de un ejercicio. */
export function countSetsOf(state: DataState, exerciseId: string): number {
  return visible(state.setLogs).filter((log) => log.exerciseId === exerciseId && log.type === 'work')
    .length
}

/** Siguiente posicion libre para ordenar. */
export function nextOrder(items: Array<{ order: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.order), -1) + 1
}

/** Nota de un ejercicio en una sesion (la mas reciente si hubiera varias tras una fusion). */
export function findSessionNote(state: DataState, sessionId: string, exerciseId: string) {
  return visible(state.sessionNotes)
    .filter((note) => note.sessionId === sessionId && note.exerciseId === exerciseId)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
}

/** true si el ejercicio ya tiene series registradas (entonces no se borra: se archiva). */
export function exerciseHasHistory(state: DataState, exerciseId: string): boolean {
  return visible(state.setLogs).some((log) => log.exerciseId === exerciseId)
}

/** Records personales que apuntan a una serie concreta. */
export function recordsOfSet(state: DataState, setLogId: string) {
  return visible(state.personalRecords).filter((record) => record.setLogId === setLogId)
}

/** Series de una sesion, agrupadas por ejercicio en el orden en que se hicieron. */
export function sessionSetsByExercise(state: DataState, sessionId: string) {
  const sets = visible(state.setLogs).filter((log) => log.sessionId === sessionId)
  const order: string[] = []
  const groups = new Map<string, typeof sets>()

  for (const log of [...sets].sort((a, b) => a.completedAt - b.completedAt)) {
    if (!groups.has(log.exerciseId)) {
      groups.set(log.exerciseId, [])
      order.push(log.exerciseId)
    }
    groups.get(log.exerciseId)?.push(log)
  }

  return order.map((exerciseId) => ({
    exerciseId,
    sets: (groups.get(exerciseId) ?? []).sort(
      (a, b) =>
        (a.type === b.type ? 0 : a.type === 'warmup' ? -1 : 1) || a.setIndex - b.setIndex,
    ),
  }))
}
