/**
 * Prellenado de series desde la sesion anterior.
 *
 * Al abrir un ejercicio, cada fila llega ya con el peso, las repeticiones y el
 * RIR de la serie equivalente de la ultima vez que lo hiciste: calentamiento
 * con calentamiento y trabajo con trabajo, emparejados por posicion.
 */

export type SetType = 'warmup' | 'work'

export type PrefillSet = {
  sessionId: string
  exerciseId: string
  type: SetType
  setIndex: number
  weightKg: number
  reps: number
  rir: number
  deleted?: boolean
}

export type PrefillSession = {
  id: string
  startedAt: number
  deleted?: boolean
}

export type PrefillValues = {
  weightKg: number
  reps: number
  rir: number
}

/** Valores de arranque cuando el ejercicio es completamente nuevo. */
export const FIRST_TIME_VALUES: PrefillValues = { weightKg: 20, reps: 10, rir: 2 }

/**
 * Series del mismo ejercicio en la ultima sesion anterior a la actual.
 * Se ignoran las sesiones sin series de ese ejercicio.
 */
export function previousSessionSets<S extends PrefillSet>(
  sets: readonly S[],
  sessions: readonly PrefillSession[],
  exerciseId: string,
  currentSessionId: string,
): S[] {
  const startedAtById = new Map<string, number>()
  for (const session of sessions) {
    if (!session.deleted) startedAtById.set(session.id, session.startedAt)
  }

  const currentStartedAt = startedAtById.get(currentSessionId) ?? Number.POSITIVE_INFINITY

  let bestSessionId: string | null = null
  let bestStartedAt = Number.NEGATIVE_INFINITY

  for (const set of sets) {
    if (set.deleted) continue
    if (set.exerciseId !== exerciseId) continue
    if (set.sessionId === currentSessionId) continue
    const startedAt = startedAtById.get(set.sessionId)
    if (startedAt === undefined) continue
    if (startedAt >= currentStartedAt) continue
    if (startedAt > bestStartedAt) {
      bestStartedAt = startedAt
      bestSessionId = set.sessionId
    }
  }

  if (!bestSessionId) return []
  return sets
    .filter((set) => !set.deleted && set.exerciseId === exerciseId && set.sessionId === bestSessionId)
    .sort((a, b) => a.setIndex - b.setIndex)
}

/**
 * Serie equivalente de la sesion anterior: mismo tipo y misma posicion.
 * Si esa posicion no existe (hoy haces mas series que la vez pasada),
 * usa la ultima serie del mismo tipo.
 */
export function equivalentPreviousSet<S extends PrefillSet>(
  previousSets: readonly S[],
  type: SetType,
  setIndex: number,
): S | undefined {
  const sameType = previousSets.filter((set) => set.type === type)
  return sameType.find((set) => set.setIndex === setIndex) ?? sameType[sameType.length - 1]
}

/**
 * Valores con los que se prellena una fila.
 *
 * Orden de preferencia:
 *  1. La serie equivalente de la sesion anterior.
 *  2. La ultima serie del mismo tipo ya registrada hoy.
 *  3. El objetivo planeado en la rutina, si lo hay.
 *  4. Valores de arranque, solo la primerisima vez.
 */
export function prefillFor<S extends PrefillSet>(params: {
  previousSets: readonly S[]
  currentSets: readonly S[]
  type: SetType
  setIndex: number
  /** Objetivo planeado en la rutina, si lo hay. Solo se usa cuando no hay historial. */
  planned?: { reps: number; rir: number } | null
}): PrefillValues {
  const { previousSets, currentSets, type, setIndex, planned } = params

  const equivalent = equivalentPreviousSet(previousSets, type, setIndex)
  if (equivalent) {
    return { weightKg: equivalent.weightKg, reps: equivalent.reps, rir: equivalent.rir }
  }

  const todaySameType = currentSets
    .filter((set) => !set.deleted && set.type === type && set.setIndex < setIndex)
    .sort((a, b) => a.setIndex - b.setIndex)
  const lastToday = todaySameType[todaySameType.length - 1]
  if (lastToday) {
    return { weightKg: lastToday.weightKg, reps: lastToday.reps, rir: lastToday.rir }
  }

  if (planned) {
    return { weightKg: FIRST_TIME_VALUES.weightKg, reps: planned.reps, rir: planned.rir }
  }

  return { ...FIRST_TIME_VALUES }
}

/** Texto gris de referencia: "Anterior: 60 kg x 8 @RIR 2". */
export function previousLabel(set: PrefillSet | undefined): string | null {
  if (!set) return null
  const weight = Number.isInteger(set.weightKg) ? set.weightKg : Math.round(set.weightKg * 100) / 100
  return `Anterior: ${weight} kg x ${set.reps} @RIR ${set.rir}`
}
