import { describe, expect, it } from 'vitest'
import {
  FIRST_TIME_VALUES,
  equivalentPreviousSet,
  prefillFor,
  previousLabel,
  previousSessionSets,
  type PrefillSet,
} from './prefill'

const sessions = [
  { id: 's1', startedAt: 1_000 },
  { id: 's2', startedAt: 2_000 },
  { id: 'hoy', startedAt: 3_000 },
]

const set = (
  sessionId: string,
  type: PrefillSet['type'],
  setIndex: number,
  weightKg: number,
  reps: number,
  rir = 2,
  exerciseId = 'press',
): PrefillSet => ({ sessionId, exerciseId, type, setIndex, weightKg, reps, rir })

const history: PrefillSet[] = [
  set('s1', 'warmup', 0, 20, 12),
  set('s1', 'work', 0, 50, 8),
  set('s2', 'warmup', 0, 20, 10),
  set('s2', 'warmup', 1, 40, 8),
  set('s2', 'work', 0, 60, 8, 2),
  set('s2', 'work', 1, 60, 7, 1),
  set('s2', 'work', 0, 30, 12, 3, 'otro'),
]

describe('previousSessionSets', () => {
  it('toma las series de la ultima sesion anterior', () => {
    const previous = previousSessionSets(history, sessions, 'press', 'hoy')
    expect(previous.map((item) => `${item.type}${item.setIndex}`)).toEqual([
      'warmup0',
      'work0',
      'warmup1',
      'work1',
    ])
    expect(previous.every((item) => item.sessionId === 's2')).toBe(true)
  })

  it('no mezcla otros ejercicios', () => {
    const previous = previousSessionSets(history, sessions, 'otro', 'hoy')
    expect(previous).toHaveLength(1)
    expect(previous[0].weightKg).toBe(30)
  })

  it('ignora la sesion actual', () => {
    const conHoy = [...history, set('hoy', 'work', 0, 999, 1)]
    const previous = previousSessionSets(conHoy, sessions, 'press', 'hoy')
    expect(previous.some((item) => item.weightKg === 999)).toBe(false)
  })

  it('ignora sesiones y series borradas', () => {
    const borrada = [...history, { ...set('s3', 'work', 0, 999, 1), deleted: true }]
    const previous = previousSessionSets(
      borrada,
      [...sessions, { id: 's3', startedAt: 2_500 }],
      'press',
      'hoy',
    )
    expect(previous.every((item) => item.sessionId === 's2')).toBe(true)
  })

  it('la primera vez no hay nada anterior', () => {
    expect(previousSessionSets([], sessions, 'press', 'hoy')).toEqual([])
  })
})

describe('equivalentPreviousSet: calentamiento con calentamiento', () => {
  const previous = previousSessionSets(history, sessions, 'press', 'hoy')

  it('empareja por tipo y posicion', () => {
    expect(equivalentPreviousSet(previous, 'warmup', 1)?.weightKg).toBe(40)
    expect(equivalentPreviousSet(previous, 'work', 0)?.weightKg).toBe(60)
    expect(equivalentPreviousSet(previous, 'work', 1)?.reps).toBe(7)
  })

  it('nunca prellena una serie de trabajo con un calentamiento', () => {
    expect(equivalentPreviousSet(previous, 'work', 0)?.type).toBe('work')
    expect(equivalentPreviousSet(previous, 'warmup', 0)?.type).toBe('warmup')
  })

  it('si hoy haces mas series, usa la ultima del mismo tipo', () => {
    expect(equivalentPreviousSet(previous, 'work', 5)?.reps).toBe(7)
    expect(equivalentPreviousSet(previous, 'warmup', 9)?.weightKg).toBe(40)
  })
})

describe('prefillFor', () => {
  const previous = previousSessionSets(history, sessions, 'press', 'hoy')

  it('usa la serie equivalente de la sesion anterior', () => {
    expect(prefillFor({ previousSets: previous, currentSets: [], type: 'work', setIndex: 1 })).toEqual({
      weightKg: 60,
      reps: 7,
      rir: 1,
    })
  })

  it('sin historial previo, repite lo ya hecho hoy', () => {
    const today = [set('hoy', 'work', 0, 72.5, 6, 1)]
    expect(prefillFor({ previousSets: [], currentSets: today, type: 'work', setIndex: 1 })).toEqual({
      weightKg: 72.5,
      reps: 6,
      rir: 1,
    })
  })

  it('la primerisima vez usa los valores de arranque', () => {
    expect(prefillFor({ previousSets: [], currentSets: [], type: 'work', setIndex: 0 })).toEqual(
      FIRST_TIME_VALUES,
    )
  })

  it('no toma de hoy una serie posterior a la que se esta llenando', () => {
    const today = [set('hoy', 'work', 3, 100, 3, 0)]
    expect(prefillFor({ previousSets: [], currentSets: today, type: 'work', setIndex: 1 })).toEqual(
      FIRST_TIME_VALUES,
    )
  })
})

describe('previousLabel', () => {
  it('describe la serie anterior en una linea', () => {
    expect(previousLabel(set('s2', 'work', 0, 60, 8, 2))).toBe('Anterior: 60 kg x 8 @RIR 2')
  })

  it('muestra decimales solo cuando los hay', () => {
    expect(previousLabel(set('s2', 'work', 0, 62.5, 8, 2))).toBe('Anterior: 62.5 kg x 8 @RIR 2')
  })

  it('sin serie anterior no muestra nada', () => {
    expect(previousLabel(undefined)).toBeNull()
  })
})
