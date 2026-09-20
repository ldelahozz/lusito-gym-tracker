/**
 * Estado del entrenamiento que vive solo en este dispositivo:
 * el descanso en curso, cuantas filas de series mostrar y en que ejercicio ibas.
 *
 * No va a la nube a proposito: son cosas del momento, utiles solo aqui y ahora.
 * Se guardan para que al recargar la app o volver de otra aplicacion,
 * la pantalla retome exactamente donde estaba.
 */
import type { RestTimer } from '@/core/logic/restTimer'

const REST_KEY = 'lgt.rest'
const PLAN_KEY = 'lgt.plan'

export type SetPlan = { warmup: number; work: number }
export type SessionPlan = {
  sessionId: string
  exerciseIndex: number
  rows: Record<string, SetPlan>
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* sin espacio o modo privado: la app sigue funcionando igual */
  }
}

export function loadRestTimer(): RestTimer | null {
  const timer = read<RestTimer>(REST_KEY)
  if (!timer || typeof timer.endAt !== 'number') return null
  return timer
}

export function saveRestTimer(timer: RestTimer | null): void {
  write(REST_KEY, timer)
}

export function loadSessionPlan(sessionId: string): SessionPlan {
  const stored = read<SessionPlan>(PLAN_KEY)
  if (stored && stored.sessionId === sessionId) {
    return { sessionId, exerciseIndex: stored.exerciseIndex ?? 0, rows: stored.rows ?? {} }
  }
  return { sessionId, exerciseIndex: 0, rows: {} }
}

export function saveSessionPlan(plan: SessionPlan): void {
  write(PLAN_KEY, plan)
}

export function clearSessionState(): void {
  write(REST_KEY, null)
  write(PLAN_KEY, null)
}
