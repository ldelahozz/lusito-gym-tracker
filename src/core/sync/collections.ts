import type {
  Exercise,
  PersonalRecord,
  Routine,
  RoutineExercise,
  Session,
  SessionNote,
  SetLog,
  Settings,
} from '@/core/model/types'

/** Colecciones de Firestore, todas dentro de users/{uid}. */
export const COLLECTION_NAMES = [
  'exercises',
  'routines',
  'routineExercises',
  'sessions',
  'setLogs',
  'sessionNotes',
  'personalRecords',
  'settings',
] as const

export type CollectionName = (typeof COLLECTION_NAMES)[number]

/** Tipo de documento que guarda cada coleccion. */
export type CollectionTypes = {
  exercises: Exercise
  routines: Routine
  routineExercises: RoutineExercise
  sessions: Session
  setLogs: SetLog
  sessionNotes: SessionNote
  personalRecords: PersonalRecord
  settings: Settings
}

export type DocOf<N extends CollectionName> = CollectionTypes[N]
