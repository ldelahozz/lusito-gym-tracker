/**
 * Modelo de datos completo de la app.
 *
 * Todo cuelga de users/{uid} en Firestore y todo registro lleva los mismos
 * campos de sincronizacion: cuando se modifico, desde que dispositivo,
 * y si esta borrado (borrado logico: nunca se elimina de verdad al sincronizar).
 */
import type { DeviceKind } from '@/core/logic/conflict'

export type { DeviceKind }

export type SyncFields = {
  id: string
  /** Milisegundos del dispositivo que escribio por ultima vez. */
  updatedAt: number
  deviceId: string
  deviceKind: DeviceKind
  /** Borrado logico: sigue existiendo, pero no se muestra. */
  deleted: boolean
}

export type Exercise = SyncFields & {
  name: string
  /** Nombre sin acentos, minusculas y sin espacios de mas: evita historiales duplicados. */
  normalizedName: string
  archived: boolean
}

export type Routine = SyncFields & {
  name: string
  order: number
  archived: boolean
}

export type RepRange = {
  min: number
  max: number
}

export type RoutineExercise = SyncFields & {
  routineId: string
  exerciseId: string
  order: number
  targetSets: number
  warmupSets: number
  restSeconds: number
  repRange: RepRange | null
}

export type Session = SyncFields & {
  routineId: string
  startedAt: number
  endedAt: number | null
  /** Tiempo acumulado en pausa, en milisegundos. */
  pausedMs: number
  /** Momento en que se pauso, o null si esta corriendo. */
  pausedAt: number | null
}

export type SetType = 'warmup' | 'work'

export type SetLog = SyncFields & {
  sessionId: string
  exerciseId: string
  /** Posicion dentro de su tipo: calentamiento 0,1,2... y trabajo 0,1,2... */
  setIndex: number
  type: SetType
  weightKg: number
  reps: number
  /** Repeticiones en reserva, de 0 a 5. */
  rir: number
  completedAt: number
}

export type SessionNote = SyncFields & {
  sessionId: string
  exerciseId: string
  text: string
}

export type PrKind = 'weight' | 'e1rm' | 'reps'

export type PersonalRecord = SyncFields & {
  exerciseId: string
  kind: PrKind
  value: number
  setLogId: string
  achievedAt: number
}

export type Settings = SyncFields & {
  /** Cuanto suma o resta cada toque del boton de peso, en kg. */
  weightStep: number
  defaultWarmupSets: number
  /** Si las series de calentamiento tambien arrancan el timer de descanso. */
  warmupStartsTimer: boolean
  sound: boolean
  vibration: boolean
}

export const SETTINGS_ID = 'app'

export const DEFAULT_SETTINGS = {
  weightStep: 2.5,
  defaultWarmupSets: 2,
  warmupStartsTimer: false,
  sound: true,
  vibration: true,
} as const

export const DEFAULT_REST_SECONDS = 120
export const DEFAULT_TARGET_SETS = 3
export const RIR_VALUES = [0, 1, 2, 3, 4, 5] as const
