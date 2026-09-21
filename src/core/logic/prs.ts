/**
 * Deteccion de records personales.
 *
 * Se revisa cada serie de trabajo al guardarla, comparandola contra todas las
 * series de trabajo anteriores del mismo ejercicio. Tres formas de romper un record:
 *
 *  - peso:  levantaste mas kilos que nunca.
 *  - e1rm:  tu mejor 1RM estimado (peso y repeticiones juntos).
 *  - reps:  mas repeticiones que nunca con ese peso o mas.
 *
 * Los calentamientos no cuentan, ni para marcar record ni como historial.
 * La primera vez que haces un ejercicio no hay record: no hay nada que superar.
 * Empatar tampoco es record: hay que superar la marca.
 */
import { estimateOneRepMax } from './e1rm'

export type PrKind = 'weight' | 'e1rm' | 'reps'

export type PrSet = {
  id: string
  exerciseId: string
  type: 'warmup' | 'work'
  weightKg: number
  reps: number
  rir: number
  completedAt: number
  deleted?: boolean
}

export type PrHit = {
  kind: PrKind
  /** Kilos, 1RM estimado o repeticiones, segun el tipo. */
  value: number
  setLogId: string
  exerciseId: string
  achievedAt: number
}

/** Prioridad al mostrar: el peso maximo es el mas claro de todos. */
const KIND_ORDER: PrKind[] = ['weight', 'e1rm', 'reps']

export const PR_LABELS: Record<PrKind, string> = {
  weight: 'Peso máximo',
  e1rm: 'Mejor 1RM estimado',
  reps: 'Más repeticiones',
}

/** Series de trabajo del mismo ejercicio registradas antes que esta. */
export function historyBefore<S extends PrSet>(sets: readonly S[], set: PrSet): S[] {
  return sets.filter(
    (other) =>
      !other.deleted &&
      other.type === 'work' &&
      other.exerciseId === set.exerciseId &&
      other.id !== set.id &&
      // El id desempata cuando dos series cayeron en el mismo milisegundo,
      // para que el resultado no dependa del orden en que lleguen.
      (other.completedAt < set.completedAt ||
        (other.completedAt === set.completedAt && other.id < set.id)),
  )
}

/**
 * Records que rompe esta serie. Lista vacia si no rompe ninguno.
 * `sets` puede ser el historial completo: aqui se filtra lo que corresponde.
 */
export function detectRecords(set: PrSet, sets: readonly PrSet[]): PrHit[] {
  if (set.deleted || set.type !== 'work') return []
  if (set.weightKg <= 0 || set.reps <= 0) return []

  const history = historyBefore(sets, set)
  if (history.length === 0) return []

  const hits: PrHit[] = []
  const base = { setLogId: set.id, exerciseId: set.exerciseId, achievedAt: set.completedAt }

  const bestWeight = Math.max(...history.map((item) => item.weightKg))
  if (set.weightKg > bestWeight) {
    hits.push({ ...base, kind: 'weight', value: set.weightKg })
  }

  const value = estimateOneRepMax(set.weightKg, set.reps, set.rir)
  const bestE1rm = Math.max(
    ...history.map((item) => estimateOneRepMax(item.weightKg, item.reps, item.rir)),
  )
  if (value > bestE1rm) {
    hits.push({ ...base, kind: 'e1rm', value })
  }

  // Solo cuenta como record de repeticiones si ya habias trabajado con ese peso
  // o mas: si el peso es nuevo, el record que importa es el de peso.
  const atOrAbove = history.filter((item) => item.weightKg >= set.weightKg)
  if (atOrAbove.length > 0 && atOrAbove.every((item) => item.reps < set.reps)) {
    hits.push({ ...base, kind: 'reps', value: set.reps })
  }

  return hits.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
}

/** El record mas destacado de los que rompio una serie, para la insignia y el aviso. */
export function topRecord(hits: readonly PrHit[]): PrHit | null {
  return hits[0] ?? null
}

/** Aviso breve: "Record: 82.5 kg en Press banca". */
export function recordMessage(hit: PrHit, exerciseName: string): string {
  const value =
    hit.kind === 'reps'
      ? `${hit.value} reps`
      : `${Number.isInteger(hit.value) ? hit.value : Math.round(hit.value * 100) / 100} kg`
  const what = hit.kind === 'e1rm' ? '1RM estimado' : hit.kind === 'reps' ? 'repeticiones' : 'peso'
  return `Récord de ${what}: ${value} en ${exerciseName}`
}
