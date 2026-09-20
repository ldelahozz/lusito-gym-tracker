import { describe, expect, it } from 'vitest'
import { formatDuration, formatMinutesSeconds, formatRepRange, formatWeight } from './format'

describe('formatRepRange', () => {
  it('muestra el rango cuando hay dos numeros distintos', () => {
    expect(formatRepRange(6, 8)).toBe('6-8')
  })

  it('muestra un solo numero cuando el rango es fijo', () => {
    expect(formatRepRange(8, 8)).toBe('8')
  })

  it('ordena los extremos aunque lleguen al reves', () => {
    expect(formatRepRange(12, 10)).toBe('10-12')
  })
})

describe('formatMinutesSeconds', () => {
  it('escribe los descansos en minutos y segundos', () => {
    expect(formatMinutesSeconds(150)).toBe('2:30')
    expect(formatMinutesSeconds(60)).toBe('1:00')
    expect(formatMinutesSeconds(45)).toBe('0:45')
  })

  it('nunca muestra tiempos negativos', () => {
    expect(formatMinutesSeconds(-30)).toBe('0:00')
  })
})

describe('formatDuration', () => {
  it('agrega la hora solo cuando hace falta', () => {
    expect(formatDuration(12 * 60_000 + 34_000)).toBe('12:34')
    expect(formatDuration(3_725_000)).toBe('1:02:05')
  })
})

describe('formatWeight', () => {
  it('muestra decimales solo cuando los hay', () => {
    expect(formatWeight(60)).toBe('60')
    expect(formatWeight(62.5)).toBe('62.5')
  })
})
