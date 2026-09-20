import { describe, expect, it } from 'vitest'
import {
  endSession,
  isPaused,
  pauseSession,
  resumeSession,
  sessionElapsedMs,
  type SessionTimes,
} from './sessionDuration'

const MINUTE = 60_000
const start = 1_000_000

const running: SessionTimes = { startedAt: start, endedAt: null, pausedMs: 0, pausedAt: null }

describe('sessionElapsedMs', () => {
  it('cuenta el tiempo desde que empezo', () => {
    expect(sessionElapsedMs(running, start + 10 * MINUTE)).toBe(10 * MINUTE)
  })

  it('no cuenta el tiempo ya acumulado en pausas', () => {
    const session = { ...running, pausedMs: 3 * MINUTE }
    expect(sessionElapsedMs(session, start + 10 * MINUTE)).toBe(7 * MINUTE)
  })

  it('mientras esta pausada, el tiempo se queda quieto', () => {
    const session = { ...running, pausedAt: start + 5 * MINUTE }
    expect(sessionElapsedMs(session, start + 8 * MINUTE)).toBe(5 * MINUTE)
    expect(sessionElapsedMs(session, start + 30 * MINUTE)).toBe(5 * MINUTE)
  })

  it('una sesion terminada muestra siempre lo mismo', () => {
    const session = { ...running, endedAt: start + 45 * MINUTE }
    expect(sessionElapsedMs(session, start + 999 * MINUTE)).toBe(45 * MINUTE)
  })

  it('nunca devuelve un tiempo negativo', () => {
    expect(sessionElapsedMs(running, start - 5 * MINUTE)).toBe(0)
  })
})

describe('pausar y reanudar', () => {
  it('bloquear el celular no afecta: el calculo usa marcas de tiempo', () => {
    // Empieza, pasan 20 minutos con la pantalla apagada, y al volver el tiempo es correcto.
    expect(sessionElapsedMs(running, start + 20 * MINUTE)).toBe(20 * MINUTE)
  })

  it('acumula varias pausas', () => {
    let session: SessionTimes = running
    session = pauseSession(session, start + 10 * MINUTE)
    session = resumeSession(session, start + 12 * MINUTE)
    session = pauseSession(session, start + 20 * MINUTE)
    session = resumeSession(session, start + 23 * MINUTE)
    expect(session.pausedMs).toBe(5 * MINUTE)
    expect(sessionElapsedMs(session, start + 30 * MINUTE)).toBe(25 * MINUTE)
  })

  it('pausar dos veces seguidas no cambia nada', () => {
    const paused = pauseSession(running, start + MINUTE)
    expect(pauseSession(paused, start + 5 * MINUTE)).toEqual(paused)
  })

  it('reanudar sin estar pausada no cambia nada', () => {
    expect(resumeSession(running, start + MINUTE)).toEqual(running)
  })

  it('isPaused distingue correctamente', () => {
    expect(isPaused(running)).toBe(false)
    expect(isPaused(pauseSession(running, start))).toBe(true)
    expect(isPaused({ ...running, pausedAt: start, endedAt: start + MINUTE })).toBe(false)
  })
})

describe('endSession', () => {
  it('guarda el momento de fin', () => {
    const ended = endSession(running, start + 40 * MINUTE)
    expect(ended.endedAt).toBe(start + 40 * MINUTE)
    expect(sessionElapsedMs(ended, start + 100 * MINUTE)).toBe(40 * MINUTE)
  })

  it('si estaba pausada, cierra la pausa antes de terminar', () => {
    const paused = pauseSession(running, start + 10 * MINUTE)
    const ended = endSession(paused, start + 15 * MINUTE)
    expect(ended.pausedAt).toBeNull()
    expect(ended.pausedMs).toBe(5 * MINUTE)
    expect(sessionElapsedMs(ended, start + 60 * MINUTE)).toBe(10 * MINUTE)
  })

  it('terminar dos veces no cambia la hora de fin', () => {
    const ended = endSession(running, start + MINUTE)
    expect(endSession(ended, start + 99 * MINUTE)).toEqual(ended)
  })
})
