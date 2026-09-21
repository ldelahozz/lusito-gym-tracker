import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatMinutesSeconds,
  formatRepRange,
  formatSetLine,
  formatSigned,
  formatWeight,
} from './format'

describe('formatRepRange', () => {
  it('muestra el rango cuando hay dos números distintos', () => {
    expect(formatRepRange(6, 8)).toBe('6-8')
  })

  it('muestra un solo número cuando el rango es fijo', () => {
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

describe('formatDate y formatDateTime', () => {
  it('escribe la fecha corta', () => {
    expect(formatDate(new Date(2024, 8, 15, 19, 30).getTime())).toBe('15 sep')
  })

  it('agrega el día de la semana y la hora', () => {
    expect(formatDateTime(new Date(2024, 8, 15, 19, 30).getTime())).toBe('dom 15 sep, 19:30')
  })

  it('rellena los minutos con cero', () => {
    expect(formatDateTime(new Date(2024, 0, 1, 9, 5).getTime())).toBe('lun 1 ene, 9:05')
  })
})

describe('formatSigned', () => {
  it('pone el signo más cuando sube', () => {
    expect(formatSigned(2.5)).toBe('+2.5')
    expect(formatSigned(1)).toBe('+1')
  })

  it('usa el signo menos tipografico cuando baja', () => {
    expect(formatSigned(-1)).toBe('−1')
  })

  it('cero va sin signo, aunque venga con restos de decimales', () => {
    expect(formatSigned(0)).toBe('0')
    expect(formatSigned(0.0000001)).toBe('0')
  })
})

describe('formatSetLine', () => {
  it('escribe peso, repeticiones y RIR en una linea', () => {
    expect(formatSetLine({ weightKg: 62.5, reps: 9, rir: 1 })).toBe('62.5 kg × 9 · RIR 1')
  })
})
