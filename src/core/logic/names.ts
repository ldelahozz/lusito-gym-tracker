/**
 * Normalizacion y fusion de nombres de ejercicios.
 *
 * El objetivo es que "Press Banca", "press banca" y "  press  bánca " sean
 * el mismo ejercicio, para no terminar con tres historiales separados.
 */

/** Deja el nombre comparable: sin acentos, en minusculas y sin espacios de mas. */
export function normalizeExerciseName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Limpia el nombre que se guarda y se muestra (conserva acentos y mayusculas). */
export function cleanExerciseName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

export type NamedExercise = {
  id: string
  name: string
  normalizedName: string
  archived?: boolean
  deleted?: boolean
}

/** Busca un ejercicio existente con el mismo nombre, ignorando acentos y mayusculas. */
export function findExerciseByName<T extends NamedExercise>(
  exercises: readonly T[],
  rawName: string,
): T | undefined {
  const normalized = normalizeExerciseName(rawName)
  if (!normalized) return undefined
  return exercises.find((exercise) => !exercise.deleted && exercise.normalizedName === normalized)
}

/** Sugerencias para el autocompletado, ordenadas: primero las que empiezan igual. */
export function suggestExercises<T extends NamedExercise>(
  exercises: readonly T[],
  query: string,
  limit = 8,
): T[] {
  const normalized = normalizeExerciseName(query)
  const available = exercises.filter((exercise) => !exercise.deleted && !exercise.archived)
  if (!normalized) return available.slice(0, limit)

  const starts: T[] = []
  const contains: T[] = []
  for (const exercise of available) {
    if (exercise.normalizedName.startsWith(normalized)) starts.push(exercise)
    else if (exercise.normalizedName.includes(normalized)) contains.push(exercise)
  }
  return [...starts, ...contains].slice(0, limit)
}

export type MergeableLink = {
  id: string
  exerciseId: string
}

export type RoutineLink = MergeableLink & {
  routineId: string
}

export type MergePlan = {
  /** Registros que cambian de ejercicio (historial que se conserva). */
  reassign: {
    routineExercises: string[]
    setLogs: string[]
    sessionNotes: string[]
    personalRecords: string[]
  }
  /** Entradas de rutina que sobran porque el destino ya estaba en esa misma rutina. */
  dropRoutineExercises: string[]
  /** El ejercicio de origen se marca como borrado al final. */
  removeExerciseId: string
}

/**
 * Calcula que hay que cambiar para fusionar dos ejercicios en uno solo,
 * conservando todo el historial. No toca nada: solo devuelve el plan.
 */
export function planExerciseMerge(params: {
  sourceId: string
  targetId: string
  routineExercises: readonly RoutineLink[]
  setLogs: readonly MergeableLink[]
  sessionNotes: readonly MergeableLink[]
  personalRecords: readonly MergeableLink[]
}): MergePlan {
  const { sourceId, targetId, routineExercises, setLogs, sessionNotes, personalRecords } = params

  if (sourceId === targetId) {
    throw new Error('No se puede fusionar un ejercicio consigo mismo')
  }

  const routinesWithTarget = new Set(
    routineExercises.filter((link) => link.exerciseId === targetId).map((link) => link.routineId),
  )

  const reassignRoutineExercises: string[] = []
  const dropRoutineExercises: string[] = []
  for (const link of routineExercises) {
    if (link.exerciseId !== sourceId) continue
    // Si el ejercicio destino ya esta en esa rutina, la entrada de origen sobra.
    if (routinesWithTarget.has(link.routineId)) dropRoutineExercises.push(link.id)
    else reassignRoutineExercises.push(link.id)
  }

  const idsOf = (links: readonly MergeableLink[]) =>
    links.filter((link) => link.exerciseId === sourceId).map((link) => link.id)

  return {
    reassign: {
      routineExercises: reassignRoutineExercises,
      setLogs: idsOf(setLogs),
      sessionNotes: idsOf(sessionNotes),
      personalRecords: idsOf(personalRecords),
    },
    dropRoutineExercises,
    removeExerciseId: sourceId,
  }
}
