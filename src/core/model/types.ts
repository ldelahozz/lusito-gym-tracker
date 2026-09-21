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
  /** Minimo del rango de repeticiones objetivo. */
  repsMin: number
  /** Maximo del rango. Si es igual al minimo, el objetivo es un numero fijo. */
  repsMax: number
  /** RIR objetivo (repeticiones en reserva). */
  rir: number
}

/** Forma antigua de una serie planeada: un solo numero de repeticiones. */
export type LegacyPlannedSet = {
  reps?: number
  repsMin?: number
  repsMax?: number
  rir?: number
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
export type LegacyRoutineExercise = Omit<RoutineExercise, 'workSets'> & {
  workSets?: LegacyPlannedSet[]
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
  /** Ejercicios que te saltaste. Las sesiones viejas no lo traen. */
  skippedExerciseIds?: string[]
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
  /** Que rutina toca cada dia, de lunes a domingo. null es descanso. */
  weeklySplit: (string | null)[]
  /** Cuando se exporto el ultimo respaldo, o null si nunca. */
  lastExportAt: number | null
}

export const SETTINGS_ID = 'app'

export const DEFAULT_SETTINGS = {
  weightStep: 2.5,
  defaultWarmupSets: 2,
  warmupStartsTimer: false,
  sound: true,
  vibration: true,
  weeklySplit: [null, null, null, null, null, null, null] as (string | null)[],
  lastExportAt: null as number | null,
} as const

export const DEFAULT_REST_SECONDS = 120
export const DEFAULT_WARMUP_REST_SECONDS = 60
export const DEFAULT_TARGET_SETS = 3
export const DEFAULT_TARGET_REPS = 8
export const DEFAULT_TARGET_RIR = 2
export const RIR_VALUES = [0, 1, 2, 3, 4, 5] as const

export function defaultPlannedSet(): PlannedSet {
  return { repsMin: DEFAULT_TARGET_REPS, repsMax: DEFAULT_TARGET_REPS, rir: DEFAULT_TARGET_RIR }
}

/** Convierte una serie planeada de cualquier version a la forma actual. */
export function normalizePlannedSet(raw: LegacyPlannedSet | null | undefined): PlannedSet {
  const min = raw?.repsMin ?? raw?.reps ?? DEFAULT_TARGET_REPS
  const max = raw?.repsMax ?? raw?.reps ?? min
  return {
    repsMin: Math.min(min, max),
    repsMax: Math.max(min, max),
    rir: raw?.rir ?? DEFAULT_TARGET_RIR,
  }
}

/**
 * Completa los campos que falten en un ejercicio de rutina.
 * Sirve para leer rutinas guardadas con la forma anterior (numero de series
 * y rango de reps) y convertirlas a la nueva (una serie por entrada).
 */
export function normalizeRoutineExercise(raw: LegacyRoutineExercise): RoutineExercise {
  const workSets =
    Array.isArray(raw.workSets) && raw.workSets.length > 0
      ? raw.workSets.map(normalizePlannedSet)
      : Array.from({ length: Math.max(1, raw.targetSets ?? DEFAULT_TARGET_SETS) }, () =>
          normalizePlannedSet({
            repsMin: raw.repRange?.min ?? DEFAULT_TARGET_REPS,
            repsMax: raw.repRange?.max ?? raw.repRange?.min ?? DEFAULT_TARGET_REPS,
            rir: DEFAULT_TARGET_RIR,
          }),
        )

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
