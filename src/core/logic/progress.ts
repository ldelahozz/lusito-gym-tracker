/**
 * Progreso sesion contra sesion.
 *
 * La pregunta que responde es la del gimnasio: "hoy hice mas que la vez
 * pasada?". Cada vez que hiciste un ejercicio se compara con la anterior,
 * serie por serie, y se dice si subiste.
 *
 * Subir es lo que se busca en la progresion doble:
 *   1. Mas peso que la vez anterior.
 *   2. Si el peso es el mismo, mas repeticiones en total.
 * El RIR se muestra, pero no decide: hacerlo mas pesado o mas facil no cambia
 * lo que levantaste.
 *
 * Solo cuentan series de trabajo de sesiones terminadas.
 */
import { estimateOneRepMax } from './e1rm'

export type ProgressSet = {
  id: string
  sessionId: string
  exerciseId: string
  type: 'warmup' | 'work'
  setIndex: number
  weightKg: number
  reps: number
  rir: number
  deleted?: boolean
}

export type ProgressSession = {
  id: string
  routineId: string
  startedAt: number
  endedAt: number | null
  deleted?: boolean
}

/** Una vez que hiciste un ejercicio. */
export type ExerciseSession<S extends ProgressSet = ProgressSet> = {
  sessionId: string
  routineId: string
  startedAt: number
  /** Series de trabajo, en orden. */
  sets: S[]
  topWeight: number
  bestE1rm: number
  totalReps: number
  volume: number
}

export type SetComparison<S extends ProgressSet = ProgressSet> = {
  /** 1, 2, 3... */
  position: number
  current: S | null
  previous: S | null
  /** null cuando falta una de las dos series. */
  weightDelta: number | null
  repsDelta: number | null
  rirDelta: number | null
}

export type TrendKind = 'up' | 'down' | 'same' | 'new'

export type Trend = {
  kind: TrendKind
  /** Que lo decidio: el peso o las repeticiones. null si no hay con que comparar o quedo igual. */
  reason: 'weight' | 'reps' | null
}

/** Redondeo a dos decimales para que 62.5 - 60 no de 2.4999999. */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Sesiones terminadas y no borradas, de la mas vieja a la mas nueva. */
export function finishedSessions<T extends ProgressSession>(
  sessions: readonly T[],
  routineId?: string,
): T[] {
  return sessions
    .filter(
      (session) =>
        !session.deleted &&
        session.endedAt !== null &&
        (routineId === undefined || session.routineId === routineId),
    )
    .sort((a, b) => a.startedAt - b.startedAt)
}

/**
 * Cada vez que hiciste un ejercicio, de la mas vieja a la mas nueva.
 * Con `routineId`, solo dentro de esa rutina.
 */
export function exerciseHistory<S extends ProgressSet>(params: {
  sets: readonly S[]
  sessions: readonly ProgressSession[]
  exerciseId: string
  routineId?: string
}): ExerciseSession<S>[] {
  const { sets, sessions, exerciseId, routineId } = params
  const valid = new Map(finishedSessions(sessions, routineId).map((session) => [session.id, session]))

  const bySession = new Map<string, S[]>()
  for (const set of sets) {
    if (set.deleted || set.type !== 'work' || set.exerciseId !== exerciseId) continue
    if (!valid.has(set.sessionId)) continue
    const list = bySession.get(set.sessionId)
    if (list) list.push(set)
    else bySession.set(set.sessionId, [set])
  }

  const result: ExerciseSession<S>[] = []
  for (const [sessionId, list] of bySession) {
    const session = valid.get(sessionId)
    if (!session) continue
    const ordered = [...list].sort((a, b) => a.setIndex - b.setIndex)
    result.push({
      sessionId,
      routineId: session.routineId,
      startedAt: session.startedAt,
      sets: ordered,
      topWeight: Math.max(...ordered.map((set) => set.weightKg)),
      bestE1rm: Math.max(...ordered.map((set) => estimateOneRepMax(set.weightKg, set.reps, set.rir))),
      totalReps: ordered.reduce((total, set) => total + set.reps, 0),
      volume: ordered.reduce((total, set) => total + set.weightKg * set.reps, 0),
    })
  }
  return result.sort((a, b) => a.startedAt - b.startedAt)
}

/** Serie 1 con serie 1, serie 2 con serie 2... Si una sesion tuvo mas series, las demas quedan solas. */
export function compareSets<S extends ProgressSet>(
  current: readonly S[],
  previous: readonly S[],
): SetComparison<S>[] {
  const length = Math.max(current.length, previous.length)
  return Array.from({ length }, (_, index) => {
    const now = current[index] ?? null
    const before = previous[index] ?? null
    const both = now !== null && before !== null
    return {
      position: index + 1,
      current: now,
      previous: before,
      weightDelta: both ? round2(now.weightKg - before.weightKg) : null,
      repsDelta: both ? now.reps - before.reps : null,
      rirDelta: both ? now.rir - before.rir : null,
    }
  })
}

/** Subiste, bajaste o quedaste igual respecto a la vez anterior. */
export function trendBetween(
  current: ExerciseSession | undefined,
  previous: ExerciseSession | undefined,
): Trend {
  if (!current || !previous) return { kind: 'new', reason: null }

  const weight = round2(current.topWeight - previous.topWeight)
  if (weight > 0) return { kind: 'up', reason: 'weight' }
  if (weight < 0) return { kind: 'down', reason: 'weight' }

  const reps = current.totalReps - previous.totalReps
  if (reps > 0) return { kind: 'up', reason: 'reps' }
  if (reps < 0) return { kind: 'down', reason: 'reps' }

  return { kind: 'same', reason: null }
}

/** La vez anterior a una sesion dada, dentro del historial de un ejercicio. */
export function previousOf<S extends ProgressSet>(
  history: readonly ExerciseSession<S>[],
  sessionId: string,
): ExerciseSession<S> | undefined {
  const index = history.findIndex((item) => item.sessionId === sessionId)
  return index > 0 ? history[index - 1] : undefined
}

export type RoutineSummary = {
  sessions: number
  lastAt: number | null
  up: number
  same: number
  down: number
  /** Ejercicios hechos por primera vez en esa rutina. */
  fresh: number
}

/**
 * Resumen de una rutina: en tu ultima sesion, cuantos ejercicios subieron,
 * cuantos quedaron igual y cuantos bajaron frente a la vez anterior.
 */
export function routineSummary(params: {
  sets: readonly ProgressSet[]
  sessions: readonly ProgressSession[]
  routineId: string
}): RoutineSummary {
  const { sets, sessions, routineId } = params
  const done = finishedSessions(sessions, routineId)
  const last = done[done.length - 1]
  const summary: RoutineSummary = {
    sessions: done.length,
    lastAt: last?.startedAt ?? null,
    up: 0,
    same: 0,
    down: 0,
    fresh: 0,
  }
  if (!last) return summary

  const exerciseIds = new Set(
    sets
      .filter((set) => !set.deleted && set.type === 'work' && set.sessionId === last.id)
      .map((set) => set.exerciseId),
  )

  for (const exerciseId of exerciseIds) {
    const history = exerciseHistory({ sets, sessions, exerciseId, routineId })
    const current = history.find((item) => item.sessionId === last.id)
    const trend = trendBetween(current, previousOf(history, last.id))
    if (trend.kind === 'up') summary.up += 1
    else if (trend.kind === 'down') summary.down += 1
    else if (trend.kind === 'same') summary.same += 1
    else summary.fresh += 1
  }
  return summary
}
