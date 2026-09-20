/**
 * Split semanal: que rutina toca cada dia de la semana.
 *
 * La semana empieza en lunes, que es como se cuenta aqui. Un dia sin rutina
 * asignada es un dia de descanso. Nada obliga a nada: el split solo propone
 * la rutina del dia, siempre puedes entrenar otra cosa.
 */

export const WEEKDAYS = [
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
  'Domingo',
] as const

export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'] as const

export const DAYS_IN_WEEK = 7

/** Que rutina toca cada dia, de lunes a domingo. null es descanso. */
export type WeekSplit = (string | null)[]

/** El reloj del sistema cuenta 0 = domingo; aqui 0 = lunes. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % DAYS_IN_WEEK
}

/**
 * Deja el split siempre con siete dias.
 * Protege de lo guardado en versiones viejas o de datos a medias.
 */
export function normalizeSplit(raw: unknown): WeekSplit {
  const list = Array.isArray(raw) ? raw : []
  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
    const value: unknown = list[index]
    return typeof value === 'string' && value.length > 0 ? value : null
  })
}

/** Asigna (o quita, con null) la rutina de un dia. Devuelve un split nuevo. */
export function setDayRoutine(
  split: WeekSplit,
  dayIndex: number,
  routineId: string | null,
): WeekSplit {
  const next = normalizeSplit(split)
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= DAYS_IN_WEEK) return next
  next[dayIndex] = routineId && routineId.length > 0 ? routineId : null
  return next
}

/** true si no hay ni un solo dia asignado. */
export function isSplitEmpty(split: unknown): boolean {
  return normalizeSplit(split).every((day) => day === null)
}

/** Dias en los que se repite una rutina, de lunes a domingo. */
export function daysUsing(split: unknown, routineId: string): number[] {
  const days: number[] = []
  normalizeSplit(split).forEach((id, index) => {
    if (id === routineId) days.push(index)
  })
  return days
}

/** Quita una rutina de todos los dias en los que estuviera. */
export function removeRoutineFromSplit(split: unknown, routineId: string): WeekSplit {
  return normalizeSplit(split).map((id) => (id === routineId ? null : id))
}
