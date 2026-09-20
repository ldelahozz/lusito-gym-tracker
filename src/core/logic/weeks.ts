/**
 * Agrupacion por semana, de lunes a domingo (semana ISO).
 *
 * Todas las graficas de Progreso se apoyan en esto: cada punto es una semana
 * completa, aunque hayas entrenado un solo dia. Las semanas sin entrenamiento
 * tambien aparecen, para que se vea el hueco en vez de disimularlo.
 *
 * Los calentamientos nunca cuentan.
 */
import { estimateOneRepMax } from './e1rm'
import { formatDate } from './format'

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export type StatSet = {
  sessionId: string
  exerciseId: string
  type: 'warmup' | 'work'
  weightKg: number
  reps: number
  rir: number
  completedAt: number
  deleted?: boolean
}

export type StatSession = {
  id: string
  routineId: string
  startedAt: number
  endedAt: number | null
  pausedMs: number
  deleted?: boolean
}

export type WeekStats = {
  /** Lunes de esa semana, a las 00:00 del dispositivo. */
  weekStart: number
  label: string
  /** null cuando esa semana no tiene series: la linea se corta en vez de caer a cero. */
  maxWeight: number | null
  bestE1rm: number | null
  avgRir: number | null
  avgDurationMs: number | null
  volume: number
  sets: number
  sessions: number
}

/** Lunes de la semana a la que pertenece una fecha, a las 00:00. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

/** Lo mismo pero en milisegundos, que es como se guardan los registros. */
export function weekStartOf(timestamp: number): number {
  return startOfWeek(new Date(timestamp)).getTime()
}

/** "15 sep" */
export function weekLabel(weekStart: number): string {
  return formatDate(weekStart)
}

/**
 * Lunes de las ultimas semanas, de la mas vieja a la actual.
 * `count` incluye la semana en curso.
 */
export function recentWeeks(count: number, now: number): number[] {
  const current = weekStartOf(now)
  const total = Math.max(1, Math.floor(count))
  return Array.from({ length: total }, (_, index) =>
    // Se suma a partir del primer lunes para no arrastrar errores de horario de verano.
    weekStartOf(current - (total - 1 - index) * WEEK_MS),
  )
}

/** Duracion real de una sesion terminada, ya descontado el tiempo en pausa. */
export function sessionDuration(session: StatSession): number | null {
  if (session.endedAt === null) return null
  return Math.max(0, session.endedAt - session.startedAt - session.pausedMs)
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0) / values.length
}

/**
 * Resume por semana las series y las sesiones que le pases.
 * Filtra tu antes por ejercicio o por rutina: aqui entra ya lo que quieres ver.
 */
export function aggregateWeeks(params: {
  sets: readonly StatSet[]
  sessions: readonly StatSession[]
  /** Cuantas semanas mostrar, contando la actual. null = desde el primer registro. */
  weeks: number | null
  now: number
}): WeekStats[] {
  const { sets, sessions, weeks, now } = params

  const workSets = sets.filter((set) => !set.deleted && set.type === 'work')
  const doneSessions = sessions.filter((session) => !session.deleted)

  let range: number[]
  if (weeks !== null) {
    range = recentWeeks(weeks, now)
  } else {
    const stamps = [
      ...workSets.map((set) => set.completedAt),
      ...doneSessions.map((session) => session.startedAt),
    ]
    if (stamps.length === 0) return []
    const first = weekStartOf(Math.min(...stamps))
    const current = weekStartOf(now)
    const count = Math.max(1, Math.round((current - first) / WEEK_MS) + 1)
    range = recentWeeks(count, now)
  }

  const from = range[0]
  const byWeek = new Map<number, { sets: StatSet[]; sessions: StatSession[] }>()
  for (const weekStart of range) byWeek.set(weekStart, { sets: [], sessions: [] })

  for (const set of workSets) {
    if (set.completedAt < from) continue
    byWeek.get(weekStartOf(set.completedAt))?.sets.push(set)
  }
  for (const session of doneSessions) {
    if (session.startedAt < from) continue
    byWeek.get(weekStartOf(session.startedAt))?.sessions.push(session)
  }

  return range.map((weekStart) => {
    const bucket = byWeek.get(weekStart) ?? { sets: [], sessions: [] }
    const durations = bucket.sessions
      .map(sessionDuration)
      .filter((value): value is number => value !== null)

    return {
      weekStart,
      label: weekLabel(weekStart),
      maxWeight: bucket.sets.length > 0 ? Math.max(...bucket.sets.map((set) => set.weightKg)) : null,
      bestE1rm:
        bucket.sets.length > 0
          ? Math.max(...bucket.sets.map((set) => estimateOneRepMax(set.weightKg, set.reps, set.rir)))
          : null,
      avgRir: average(bucket.sets.map((set) => set.rir)),
      avgDurationMs: average(durations),
      volume: bucket.sets.reduce((total, set) => total + set.weightKg * set.reps, 0),
      sets: bucket.sets.length,
      sessions: bucket.sessions.length,
    }
  })
}
