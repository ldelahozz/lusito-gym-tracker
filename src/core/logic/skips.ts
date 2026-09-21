/**
 * Ejercicios saltados.
 *
 * Una sesion guarda la lista de ejercicios que te saltaste. Se marca de dos formas:
 *  - A mano, con "Saltar ejercicio" durante el entrenamiento.
 *  - Sola, al terminar la sesion: todo ejercicio de la rutina sin ninguna serie
 *    de trabajo cuenta como saltado, porque eso es lo que paso.
 *
 * Si marcas una serie de trabajo en un ejercicio que habias saltado, deja de
 * contar como saltado: al final si lo hiciste.
 */

type SkipSet = {
  sessionId: string
  exerciseId: string
  type: 'warmup' | 'work'
  deleted?: boolean
}

type SkipSession = {
  id: string
  routineId: string
  startedAt: number
  endedAt: number | null
  deleted?: boolean
  skippedExerciseIds?: readonly string[] | null
}

/** Lista de saltados de una sesion. Las sesiones viejas no la traen: cuentan como vacia. */
export function skippedOf(session: Pick<SkipSession, 'skippedExerciseIds'> | undefined): string[] {
  const list = session?.skippedExerciseIds
  return Array.isArray(list) ? list.filter((id) => typeof id === 'string' && id.length > 0) : []
}

/** Marca o desmarca un ejercicio como saltado. Devuelve una lista nueva, sin repetidos. */
export function setSkipped(list: readonly string[], exerciseId: string, skipped: boolean): string[] {
  const rest = list.filter((id) => id !== exerciseId)
  return skipped ? [...rest, exerciseId] : rest
}

/** true si ese ejercicio ya tiene al menos una serie de trabajo en la sesion. */
export function hasWorkSets(sets: readonly SkipSet[], sessionId: string, exerciseId: string): boolean {
  return sets.some(
    (set) =>
      !set.deleted && set.type === 'work' && set.sessionId === sessionId && set.exerciseId === exerciseId,
  )
}

/**
 * Lista definitiva al terminar la sesion, en el orden de la rutina:
 * todo lo que no tiene ninguna serie de trabajo. Lo marcado a mano que al
 * final si se hizo, sale de la lista.
 */
export function finalSkipped(params: {
  /** Ejercicios de la rutina, en su orden. */
  planned: readonly string[]
  /** Lo que se marco a mano durante la sesion. */
  marked: readonly string[]
  sets: readonly SkipSet[]
  sessionId: string
}): string[] {
  const { planned, marked, sets, sessionId } = params
  const candidates = [...planned, ...marked.filter((id) => !planned.includes(id))]
  return [...new Set(candidates)].filter((exerciseId) => !hasWorkSets(sets, sessionId, exerciseId))
}

/**
 * Si en tu sesion anterior de esta misma rutina te saltaste este ejercicio,
 * devuelve esa sesion. Sirve para avisarte al entrenar.
 */
export function skippedLastTime<S extends SkipSession>(params: {
  sessions: readonly S[]
  routineId: string
  exerciseId: string
  currentSessionId: string
}): S | null {
  const { sessions, routineId, exerciseId, currentSessionId } = params
  const current = sessions.find((session) => session.id === currentSessionId)
  const before = current?.startedAt ?? Number.POSITIVE_INFINITY

  const previous = sessions
    .filter(
      (session) =>
        !session.deleted &&
        session.endedAt !== null &&
        session.routineId === routineId &&
        session.id !== currentSessionId &&
        session.startedAt < before,
    )
    .sort((a, b) => b.startedAt - a.startedAt)[0]

  return previous && skippedOf(previous).includes(exerciseId) ? previous : null
}
