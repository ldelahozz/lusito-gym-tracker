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

/** Objetivo de una serie planeada dentro de una rutina. */
export type PlannedSet = {
  /** Repeticiones objetivo. */
  reps: number
  /** RIR objetivo (repeticiones en reserva). */
  rir: number
}

export type RoutineExercise = SyncFields & {
  routineId: string
  exerciseId: string
  order: number
  /** Una entrada por serie de trabajo, cada una con su propio objetivo. */
  workSets: PlannedSet[]
  /** Cuantas series de calentamiento se proponen. */
  warmupSets: number
  /** Descanso entre series de trabajo, en segundos. */
  restSeconds: number
  /** Descanso entre series de calentamiento, normalmente mas corto. */
  warmupRestSeconds: number
}

/** Forma antigua del registro, para poder leer rutinas creadas antes del cambio. */
export type LegacyRoutineExercise = RoutineExercise & {
  targetSets?: number
  repRange?: { min: number; max: number } | null
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
export const DEFAULT_WARMUP_REST_SECONDS = 60
export const DEFAULT_TARGET_SETS = 3
export const DEFAULT_TARGET_REPS = 8
export const DEFAULT_TARGET_RIR = 2
export const RIR_VALUES = [0, 1, 2, 3, 4, 5] as const

export function defaultPlannedSet(): PlannedSet {
  return { reps: DEFAULT_TARGET_REPS, rir: DEFAULT_TARGET_RIR }
}

/**
 * Completa los campos que falten en un ejercicio de rutina.
 * Sirve para leer rutinas guardadas con la forma anterior (numero de series
 * y rango de reps) y convertirlas a la nueva (una serie por entrada).
 */
export function normalizeRoutineExercise(raw: LegacyRoutineExercise): RoutineExercise {
  const workSets =
    Array.isArray(raw.workSets) && raw.workSets.length > 0
      ? raw.workSets.map((set) => ({
          reps: set?.reps ?? DEFAULT_TARGET_REPS,
          rir: set?.rir ?? DEFAULT_TARGET_RIR,
        }))
      : Array.from({ length: Math.max(1, raw.targetSets ?? DEFAULT_TARGET_SETS) }, () => ({
          reps: raw.repRange?.min ?? DEFAULT_TARGET_REPS,
          rir: DEFAULT_TARGET_RIR,
        }))

  return {
    id: raw.id,
    updatedAt: raw.updatedAt,
    deviceId: raw.deviceId,
    deviceKind: raw.deviceKind,
    deleted: raw.deleted,
    routineId: raw.routineId,
    exerciseId: raw.exerciseId,
    order: raw.order,
    workSets,
    warmupSets: raw.warmupSets ?? 0,
    restSeconds: raw.restSeconds ?? DEFAULT_REST_SECONDS,
    warmupRestSeconds: raw.warmupRestSeconds ?? DEFAULT_WARMUP_REST_SECONDS,
  }
}
