/**
 * Cambiar un ejercicio solo por hoy (por ejemplo, si la maquina esta ocupada).
 *
 * La rutina no se toca: la sesion guarda "en el lugar de este ejercicio de la
 * rutina, hoy hice este otro". El ejercicio nuevo hereda las series, rangos y
 * descansos del original, y se registra con su propio nombre e historial.
 */

/** Por cada ejercicio de la rutina (id del renglon de la rutina), el que lo reemplazo hoy. */
export type ExerciseSwaps = Record<string, string>

type SessionWithSwaps = { exerciseSwaps?: ExerciseSwaps | null }
type PlanLink = { id: string; exerciseId: string }

export type EffectiveLink<L extends PlanLink> = L & {
  /** Ejercicio de la rutina que se reemplazo hoy, si hubo cambio. */
  swappedFrom: string | null
}

export function swapsOf(session: SessionWithSwaps): ExerciseSwaps {
  const swaps = session.exerciseSwaps
  return swaps && typeof swaps === 'object' ? swaps : {}
}

/** Los ejercicios de la rutina como quedaron hoy, con los cambios aplicados. */
export function effectiveLinks<L extends PlanLink>(links: readonly L[], session: SessionWithSwaps): EffectiveLink<L>[] {
  const swaps = swapsOf(session)
  return links.map((link) => {
    const replacement = swaps[link.id]
    return replacement && replacement !== link.exerciseId
      ? { ...link, exerciseId: replacement, swappedFrom: link.exerciseId }
      : { ...link, swappedFrom: null }
  })
}

/**
 * Anota (o quita, con null) el cambio de un ejercicio. Volver a elegir el
 * original es lo mismo que quitar el cambio.
 */
export function setSwap(
  swaps: ExerciseSwaps,
  link: PlanLink,
  exerciseId: string | null,
): ExerciseSwaps {
  const next = { ...swaps }
  if (exerciseId === null || exerciseId === link.exerciseId) delete next[link.id]
  else next[link.id] = exerciseId
  return next
}

export type SwapCheck = { ok: true } | { ok: false; reason: 'already-in-session' | 'has-sets' }

/**
 * Se puede cambiar mientras no hayas registrado ninguna serie de ese ejercicio,
 * y si el nuevo no esta ya en la sesion de hoy (sus series se mezclarian).
 */
export function canSwap(params: {
  links: readonly PlanLink[]
  currentLinkId: string
  newExerciseId: string
  loggedSets: number
}): SwapCheck {
  const { links, currentLinkId, newExerciseId, loggedSets } = params
  if (loggedSets > 0) return { ok: false, reason: 'has-sets' }
  const taken = links.some((link) => link.id !== currentLinkId && link.exerciseId === newExerciseId)
  return taken ? { ok: false, reason: 'already-in-session' } : { ok: true }
}
