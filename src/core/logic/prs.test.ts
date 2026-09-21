import { describe, expect, it } from 'vitest'
import { detectRecords, historyBefore, recordMessage, topRecord, type PrSet } from './prs'

let clock = 1_000
const work = (
  id: string,
  weightKg: number,
  reps: number,
  rir = 2,
  extra: Partial<PrSet> = {},
): PrSet => ({
  id,
  exerciseId: 'press',
  type: 'work',
  weightKg,
  reps,
  rir,
  completedAt: (clock += 1_000),
  ...extra,
})

const kinds = (sets: PrSet[], set: PrSet) => detectRecords(set, sets).map((hit) => hit.kind)

describe('detectRecords: casos límite', () => {
  it('la primera vez no hay récord, porque no hay nada que superar', () => {
    const first = work('a', 60, 8)
    expect(detectRecords(first, [first])).toEqual([])
  })

  it('empatar la marca no es récord', () => {
    const before = work('a', 60, 8, 2)
    const tie = work('b', 60, 8, 2)
    expect(kinds([before, tie], tie)).toEqual([])
  })

  it('los calentamientos no marcan récord', () => {
    const before = work('a', 60, 8)
    const warmup = work('b', 200, 20, 5, { type: 'warmup' })
    expect(detectRecords(warmup, [before, warmup])).toEqual([])
  })

  it('un calentamiento antiguo no cuenta como marca a superar', () => {
    const heavyWarmup = work('a', 200, 12, 0, { type: 'warmup' })
    const first = work('b', 60, 8)
    // Sigue siendo la primera serie de trabajo del ejercicio: no hay record.
    expect(kinds([heavyWarmup, first], first)).toEqual([])
  })

  it('no mezcla el historial de otros ejercicios', () => {
    const otro = work('a', 200, 10, 2, { exerciseId: 'sentadilla' })
    const first = work('b', 60, 8)
    expect(kinds([otro, first], first)).toEqual([])
  })

  it('ignora las series borradas', () => {
    const borrada = work('a', 100, 10, 0, { deleted: true })
    const nueva = work('b', 60, 8)
    expect(kinds([borrada, nueva], nueva)).toEqual([])
  })

  it('una serie sin peso o sin repeticiones no marca nada', () => {
    const before = work('a', 60, 8)
    const vacia = work('b', 0, 0)
    expect(kinds([before, vacia], vacia)).toEqual([])
  })
})

describe('detectRecords: los tres tipos', () => {
  it('más peso que nunca: récord de peso (y de 1RM estimado)', () => {
    const before = work('a', 60, 8, 2)
    const heavier = work('b', 65, 8, 2)
    expect(kinds([before, heavier], heavier)).toEqual(['weight', 'e1rm'])
  })

  it('más peso pero muchas menos reps: solo récord de peso', () => {
    const before = work('a', 60, 10, 2)
    const heavier = work('b', 62.5, 3, 2)
    expect(kinds([before, heavier], heavier)).toEqual(['weight'])
  })

  it('mismo peso y más repeticiones: récord de reps y de 1RM estimado', () => {
    const before = work('a', 60, 8, 2)
    const more = work('b', 60, 9, 2)
    expect(kinds([before, more], more)).toEqual(['e1rm', 'reps'])
  })

  it('mismas reps con más reserva: solo mejora el 1RM estimado', () => {
    const before = work('a', 60, 8, 0)
    const easier = work('b', 60, 8, 2)
    expect(kinds([before, easier], easier)).toEqual(['e1rm'])
  })

  it('menos peso y menos reps no es récord', () => {
    const before = work('a', 100, 10, 1)
    const lighter = work('b', 80, 6, 1)
    expect(kinds([before, lighter], lighter)).toEqual([])
  })

  it('el peso nuevo no cuenta además como récord de repeticiones', () => {
    const before = work('a', 60, 5, 2)
    const heavier = work('b', 80, 8, 2)
    expect(kinds([before, heavier], heavier)).not.toContain('reps')
  })
})

describe('historyBefore', () => {
  it('solo mira hacia atrás, nunca la propia serie ni las siguientes', () => {
    const first = work('a', 60, 8)
    const second = work('b', 62.5, 8)
    const third = work('c', 65, 8)
    expect(historyBefore([first, second, third], second).map((item) => item.id)).toEqual(['a'])
  })

  it('al corregir una serie vieja no se compara contra las posteriores', () => {
    const first = work('a', 60, 8)
    const second = work('b', 100, 8)
    const corrected = { ...first, weightKg: 62.5 }
    expect(kinds([corrected, second], corrected)).toEqual([])
  })

  it('el resultado no depende del orden de la lista', () => {
    const sets = [work('a', 60, 8), work('b', 62.5, 8), work('c', 65, 8)]
    const last = sets[2]
    const reversed = [...sets].reverse()
    expect(kinds(sets, last)).toEqual(kinds(reversed, last))
  })

  it('dos series en el mismo milisegundo se ordenan siempre igual', () => {
    const a = { ...work('a', 60, 8), completedAt: 5_000 }
    const b = { ...work('b', 65, 8), completedAt: 5_000 }
    expect(historyBefore([a, b], b).map((item) => item.id)).toEqual(['a'])
    expect(historyBefore([a, b], a)).toEqual([])
  })
})

describe('topRecord y recordMessage', () => {
  it('el peso máximo manda sobre los demás', () => {
    const before = work('a', 60, 8, 2)
    const heavier = work('b', 65, 12, 2)
    expect(topRecord(detectRecords(heavier, [before, heavier]))?.kind).toBe('weight')
  })

  it('sin récords no hay nada que mostrar', () => {
    expect(topRecord([])).toBeNull()
  })

  it('describe el récord en una linea', () => {
    const before = work('a', 60, 8, 2)
    const heavier = work('b', 62.5, 8, 2)
    const hit = topRecord(detectRecords(heavier, [before, heavier]))!
    expect(recordMessage(hit, 'Press banca')).toBe('Récord de peso: 62.5 kg en Press banca')
  })

  it('el récord de repeticiones se describe en repeticiones', () => {
    const before = work('a', 60, 8, 2)
    const more = work('b', 60, 10, 2)
    const hits = detectRecords(more, [before, more])
    const reps = hits.find((hit) => hit.kind === 'reps')!
    expect(recordMessage(reps, 'Press banca')).toBe('Récord de repeticiones: 10 reps en Press banca')
  })
})
