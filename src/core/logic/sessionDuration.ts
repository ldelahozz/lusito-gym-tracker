/**
 * Duracion de una sesion de entrenamiento.
 *
 * Nunca se usa un contador que avance solo: todo se calcula a partir de marcas
 * de tiempo guardadas. Asi, si bloqueas el celular o cambias de app, al volver
 * el tiempo mostrado sigue siendo el correcto.
 */

export type SessionTimes = {
  /** Cuando empezo la sesion. */
  startedAt: number
  /** Cuando termino, o null si sigue en curso. */
  endedAt: number | null
  /** Tiempo ya acumulado en pausas, en milisegundos. */
  pausedMs: number
  /** Cuando se pauso, o null si esta corriendo. */
  pausedAt: number | null
}

/** Tiempo efectivo de entrenamiento, sin contar las pausas. */
export function sessionElapsedMs(session: SessionTimes, now: number): number {
  const end = session.endedAt ?? now
  const openPause = session.pausedAt === null ? 0 : Math.max(0, end - session.pausedAt)
  return Math.max(0, end - session.startedAt - session.pausedMs - openPause)
}

export function isPaused(session: SessionTimes): boolean {
  return session.pausedAt !== null && session.endedAt === null
}

/** Pausa la sesion. Si ya estaba pausada o terminada, no cambia nada. */
export function pauseSession<T extends SessionTimes>(session: T, now: number): T {
  if (session.endedAt !== null || session.pausedAt !== null) return session
  return { ...session, pausedAt: now }
}

/** Reanuda la sesion y suma al acumulado el tiempo que estuvo pausada. */
export function resumeSession<T extends SessionTimes>(session: T, now: number): T {
  if (session.endedAt !== null || session.pausedAt === null) return session
  return {
    ...session,
    pausedMs: session.pausedMs + Math.max(0, now - session.pausedAt),
    pausedAt: null,
  }
}

/** Termina la sesion. Si estaba pausada, cierra tambien esa pausa. */
export function endSession<T extends SessionTimes>(session: T, now: number): T {
  if (session.endedAt !== null) return session
  const closed = session.pausedAt === null ? session : resumeSession(session, now)
  return { ...closed, endedAt: now }
}
