/**
 * Timer de descanso entre series.
 *
 * Se guarda la hora en que debe terminar (endAt), no un contador. Si bloqueas
 * el celular o cambias de app, al volver se recalcula solo y sigue correcto.
 */

export type RestTimer = {
  /** Momento exacto en que termina el descanso. */
  endAt: number
  /** Segundos con los que arranco (para dibujar la barra de progreso). */
  totalSeconds: number
  /** Ejercicio al que pertenece, para mostrarlo en la barra. */
  exerciseId: string
}

export const REST_ADJUST_SECONDS = 15

export function startRest(exerciseId: string, seconds: number, now: number): RestTimer {
  return { endAt: now + seconds * 1000, totalSeconds: seconds, exerciseId }
}

/** Milisegundos que faltan. Nunca menos de cero. */
export function remainingMs(timer: RestTimer | null, now: number): number {
  if (!timer) return 0
  return Math.max(0, timer.endAt - now)
}

/** Segundos que faltan, redondeados hacia arriba (para que muestre 1 hasta llegar a 0). */
export function remainingSeconds(timer: RestTimer | null, now: number): number {
  return Math.ceil(remainingMs(timer, now) / 1000)
}

export function isFinished(timer: RestTimer | null, now: number): boolean {
  return timer !== null && timer.endAt <= now
}

/** Fraccion transcurrida, de 0 a 1, para la barra de progreso. */
export function restProgress(timer: RestTimer | null, now: number): number {
  if (!timer || timer.totalSeconds <= 0) return 1
  const total = timer.totalSeconds * 1000
  return Math.min(1, Math.max(0, (total - remainingMs(timer, now)) / total))
}

/**
 * Suma o resta segundos al descanso en curso.
 * Restar nunca deja el final antes de "ahora": como mucho, lo termina.
 */
export function adjustRest(timer: RestTimer | null, deltaSeconds: number, now: number): RestTimer | null {
  if (!timer) return null
  const endAt = Math.max(now, timer.endAt + deltaSeconds * 1000)
  const totalSeconds = Math.max(1, timer.totalSeconds + deltaSeconds)
  return { ...timer, endAt, totalSeconds }
}
