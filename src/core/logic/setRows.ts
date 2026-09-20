/**
 * Orden de las series dentro de un ejercicio.
 *
 * Las series se numeran 0, 1, 2... dentro de su tipo (calentamiento por un lado,
 * trabajo por otro). Si borras una del medio o cambias una de tipo, hay que
 * renumerar para que no queden huecos: de eso se encarga esto.
 */

export type SetType = 'warmup' | 'work'

export type IndexedSet = {
  id: string
  type: SetType
  setIndex: number
}

/**
 * Devuelve SOLO las series cuya posicion cambia para dejar la numeracion
 * seguida dentro de cada tipo. Si ya estaba bien, devuelve una lista vacia.
 */
export function renumberSets<T extends IndexedSet>(sets: readonly T[]): T[] {
  const changed: T[] = []

  for (const type of ['warmup', 'work'] as const) {
    const ofType = sets
      .filter((set) => set.type === type)
      .sort((a, b) => a.setIndex - b.setIndex || a.id.localeCompare(b.id))

    ofType.forEach((set, position) => {
      if (set.setIndex !== position) changed.push({ ...set, setIndex: position })
    })
  }

  return changed
}

/**
 * Cambia una serie de calentamiento a trabajo (o al reves), dejandola al final
 * de su nuevo grupo, y renumera lo que haga falta.
 * Devuelve todas las series que hay que guardar.
 */
export function switchSetType<T extends IndexedSet>(sets: readonly T[], setId: string): T[] {
  const target = sets.find((set) => set.id === setId)
  if (!target) return []

  const newType: SetType = target.type === 'warmup' ? 'work' : 'warmup'
  const lastIndexOfNewType = sets
    .filter((set) => set.type === newType && set.id !== setId)
    .reduce((max, set) => Math.max(max, set.setIndex), -1)

  const moved = { ...target, type: newType, setIndex: lastIndexOfNewType + 1 }
  const rest = sets.filter((set) => set.id !== setId)
  const renumbered = renumberSets([...rest, moved])

  // El movido siempre se guarda; los demas solo si cambiaron de posicion.
  const others = renumbered.filter((set) => set.id !== setId)
  const movedFinal = renumbered.find((set) => set.id === setId) ?? moved
  return [movedFinal, ...others]
}

/** Cuantas filas mostrar de cada tipo: las planeadas o las ya registradas, lo que sea mayor. */
export function rowCount(planned: number, loggedCount: number): number {
  return Math.max(0, Math.max(planned, loggedCount))
}
