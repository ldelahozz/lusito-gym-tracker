import { describe, expect, it } from 'vitest'
import {
  adjustRest,
  isFinished,
  remainingMs,
  remainingSeconds,
  restProgress,
  startRest,
} from './restTimer'

const now = 1_700_000_000_000

describe('startRest', () => {
  it('guarda la hora de fin, no un contador', () => {
    const timer = startRest('press', 120, now)
    expect(timer.endAt).toBe(now + 120_000)
    expect(timer.totalSeconds).toBe(120)
    expect(timer.exerciseId).toBe('press')
  })
})

describe('remainingMs', () => {
  it('descuenta el tiempo transcurrido', () => {
    const timer = startRest('press', 120, now)
    expect(remainingMs(timer, now + 30_000)).toBe(90_000)
  })

  it('bloquear el celular no lo descuadra: se recalcula desde la hora de fin', () => {
    const timer = startRest('press', 120, now)
    // Pantalla apagada 90 segundos y de vuelta.
    expect(remainingSeconds(timer, now + 90_000)).toBe(30)
  })

  it('nunca baja de cero', () => {
    const timer = startRest('press', 60, now)
    expect(remainingMs(timer, now + 600_000)).toBe(0)
  })

  it('sin timer, no queda nada', () => {
    expect(remainingMs(null, now)).toBe(0)
    expect(isFinished(null, now)).toBe(false)
  })
})

describe('isFinished', () => {
  it('termina justo al llegar a la hora de fin', () => {
    const timer = startRest('press', 60, now)
    expect(isFinished(timer, now + 59_999)).toBe(false)
    expect(isFinished(timer, now + 60_000)).toBe(true)
    expect(isFinished(timer, now + 60_001)).toBe(true)
  })
})

describe('restProgress', () => {
  it('va de 0 a 1', () => {
    const timer = startRest('press', 100, now)
    expect(restProgress(timer, now)).toBe(0)
    expect(restProgress(timer, now + 50_000)).toBe(0.5)
    expect(restProgress(timer, now + 100_000)).toBe(1)
    expect(restProgress(timer, now + 500_000)).toBe(1)
  })

  it('un descanso de cero segundos ya esta completo', () => {
    expect(restProgress(startRest('press', 0, now), now)).toBe(1)
  })
})

describe('adjustRest', () => {
  it('suma 15 segundos', () => {
    const timer = startRest('press', 120, now)
    const longer = adjustRest(timer, 15, now)
    expect(remainingSeconds(longer, now)).toBe(135)
    expect(longer?.totalSeconds).toBe(135)
  })

  it('resta 15 segundos', () => {
    const timer = startRest('press', 120, now)
    const shorter = adjustRest(timer, -15, now)
    expect(remainingSeconds(shorter, now)).toBe(105)
  })

  it('restar de más termina el descanso, no lo deja en negativo', () => {
    const timer = startRest('press', 10, now)
    const shorter = adjustRest(timer, -60, now)
    expect(remainingMs(shorter, now)).toBe(0)
    expect(isFinished(shorter, now)).toBe(true)
  })

  it('sin timer no hace nada', () => {
    expect(adjustRest(null, 15, now)).toBeNull()
  })
})
