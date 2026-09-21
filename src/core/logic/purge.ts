/**
 * Borrado definitivo: que registros desaparecen con cada accion de la zona de
 * borrado en Ajustes.
 *
 * A diferencia del borrado normal (que solo marca "borrado" para que se
 * sincronice), esto elimina los registros de la nube y de todos los
 * dispositivos. Por eso cada funcion devuelve la lista exacta, para mostrar
 * cuanto se va a borrar antes de hacerlo, y para probarla.
 *
 * Tambien se llevan los registros que ya estaban marcados como borrados: es
 * limpieza de verdad.
 */
import type { CollectionName } from '@/core/sync/collections'

type Doc = { id: string; [key: string]: unknown }

export type PurgeTables = Record<CollectionName, Record<string, Doc>>

export type PurgeTarget = { collection: CollectionName; id: string }

export type PurgePlan = {
  targets: PurgeTarget[]
  sessions: number
  sets: number
}

function all(tables: PurgeTables, name: CollectionName): Doc[] {
  return Object.values(tables[name] ?? {})
}

/** Series, notas y records de un conjunto de sesiones. */
function sessionContents(tables: PurgeTables, sessionIds: Set<string>): PurgeTarget[] {
  const setIds = new Set<string>()
  const targets: PurgeTarget[] = []
  for (const log of all(tables, 'setLogs')) {
    if (!sessionIds.has(String(log.sessionId))) continue
    setIds.add(log.id)
    targets.push({ collection: 'setLogs', id: log.id })
  }
  for (const note of all(tables, 'sessionNotes')) {
    if (sessionIds.has(String(note.sessionId))) targets.push({ collection: 'sessionNotes', id: note.id })
  }
  for (const record of all(tables, 'personalRecords')) {
    if (setIds.has(String(record.setLogId))) {
      targets.push({ collection: 'personalRecords', id: record.id })
    }
  }
  return targets
}

function countOf(targets: PurgeTarget[], collection: CollectionName): number {
  return targets.filter((target) => target.collection === collection).length
}

function plan(targets: PurgeTarget[]): PurgePlan {
  return { targets, sessions: countOf(targets, 'sessions'), sets: countOf(targets, 'setLogs') }
}

/** Una rutina con todo su historial: sus ejercicios asignados, sesiones, series, notas y records. */
export function purgeRoutine(tables: PurgeTables, routineId: string): PurgePlan {
  const sessionIds = new Set(
    all(tables, 'sessions')
      .filter((session) => session.routineId === routineId)
      .map((session) => session.id),
  )
  const targets: PurgeTarget[] = []
  if (tables.routines[routineId]) targets.push({ collection: 'routines', id: routineId })
  for (const link of all(tables, 'routineExercises')) {
    if (link.routineId === routineId) targets.push({ collection: 'routineExercises', id: link.id })
  }
  for (const id of sessionIds) targets.push({ collection: 'sessions', id })
  targets.push(...sessionContents(tables, sessionIds))
  return plan(targets)
}

/**
 * Un ejercicio con todo su historial: sus series, notas y records, y su lugar
 * en las rutinas. Las sesiones quedan, con los demas ejercicios que tengan.
 */
export function purgeExercise(tables: PurgeTables, exerciseId: string): PurgePlan {
  const targets: PurgeTarget[] = []
  if (tables.exercises[exerciseId]) targets.push({ collection: 'exercises', id: exerciseId })
  const byExercise: CollectionName[] = ['routineExercises', 'setLogs', 'sessionNotes', 'personalRecords']
  for (const name of byExercise) {
    for (const doc of all(tables, name)) {
      if (doc.exerciseId === exerciseId) targets.push({ collection: name, id: doc.id })
    }
  }
  return plan(targets)
}

/**
 * Todos los entrenamientos: sesiones, series, notas y records.
 * Se quedan las rutinas, los ejercicios y los ajustes, para empezar de cero sin
 * tener que armar todo otra vez.
 */
export function purgeTraining(tables: PurgeTables): PurgePlan {
  const sessionIds = new Set(all(tables, 'sessions').map((session) => session.id))
  const targets: PurgeTarget[] = [...sessionIds].map((id) => ({ collection: 'sessions' as const, id }))
  targets.push(...sessionContents(tables, sessionIds))
  // Series o records sueltos (de sesiones que ya no existen) tambien se van.
  const listed = new Set(targets.map((target) => `${target.collection}/${target.id}`))
  const loose: CollectionName[] = ['setLogs', 'sessionNotes', 'personalRecords']
  for (const name of loose) {
    for (const doc of all(tables, name)) {
      if (!listed.has(`${name}/${doc.id}`)) targets.push({ collection: name, id: doc.id })
    }
  }
  return plan(targets)
}
