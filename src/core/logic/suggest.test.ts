import { describe, expect, it } from 'vitest'
import { incrementFor, suggestProgression } from './suggest'

const range = (repsMin: number, repsMax: number, rir = 2) => ({ repsMin, repsMax, rir })
const set = (setIndex: number, weightKg: number, reps: number, rir = 2) => ({ setIndex, weightKg, reps, rir })

describe('incrementFor', () => {
  it('sube alrededor de 2.5%, redondeado al paso de peso', () => {
    expect(incrementFor(140, 2.5)).toBe(2.5)
    expect(incrementFor(200, 2.5)).toBe(5)
  })

  it('nunca menos de un paso', () => {
    expect(incrementFor(12, 2.5)).toBe(2.5)
    expect(incrementFor(60, 1)).toBe(2)
  })
})

describe('suggestProgression', () => {
  const targets = [range(6, 8), range(6, 8), range(6, 8)]

  it('tope del rango en todas las series con el RIR planeado: sube y vuelve al mínimo de reps', () => {
    const result = suggestProgression({
      previous: [set(0, 60, 8), set(1, 60, 8), set(2, 60, 8, 3)],
      targets,
      weightStep: 2.5,
    })
    expect(result).toEqual({
      kind: 'increase',
      increment: 2.5,
      sets: [
        { weightKg: 62.5, reps: 6, rir: 2 },
        { weightKg: 62.5, reps: 6, rir: 2 },
        { weightKg: 62.5, reps: 6, rir: 2 },
      ],
    })
  })

  it('respeta series con pesos distintos', () => {
    const result = suggestProgression({
      previous: [set(0, 100, 8), set(1, 90, 8)],
      targets: [range(6, 8), range(6, 8)],
      weightStep: 2.5,
    })
    expect(result?.kind === 'increase' && result.sets.map((item) => item.weightKg)).toEqual([102.5, 92.5])
  })

  it('llegó al tope pero más cerca del fallo de lo planeado: mismo peso', () => {
    const result = suggestProgression({
      previous: [set(0, 60, 8), set(1, 60, 8, 1), set(2, 60, 8)],
      targets,
      weightStep: 2.5,
    })
    expect(result).toEqual({ kind: 'too-hard', rir: 1, target: 2 })
  })

  it('dentro del rango: mismo peso, buscar una repetición más', () => {
    const result = suggestProgression({
      previous: [set(0, 60, 8), set(1, 60, 7), set(2, 60, 6)],
      targets,
      weightStep: 2.5,
    })
    expect(result).toEqual({ kind: 'more-reps' })
  })

  it('abajo del mínimo en alguna serie: mismo peso', () => {
    const result = suggestProgression({
      previous: [set(0, 60, 7), set(1, 60, 5), set(2, 60, 6)],
      targets,
      weightStep: 2.5,
    })
    expect(result).toEqual({ kind: 'below-range', repsMin: 6 })
  })

  it('si hizo menos series de las planeadas, no sube', () => {
    const result = suggestProgression({ previous: [set(0, 60, 8), set(1, 60, 8)], targets, weightStep: 2.5 })
    expect(result).toEqual({ kind: 'more-reps' })
  })

  it('cada serie se compara con su propia meta', () => {
    const result = suggestProgression({
      previous: [set(0, 100, 6), set(1, 80, 10)],
      targets: [range(4, 6), range(8, 10)],
      weightStep: 2.5,
    })
    expect(result?.kind).toBe('increase')
  })

  it('sin vez pasada, con peso corporal o sin metas, no sugiere nada', () => {
    expect(suggestProgression({ previous: [], targets, weightStep: 2.5 })).toBeNull()
    expect(suggestProgression({ previous: [set(0, 0, 12)], targets, weightStep: 2.5 })).toBeNull()
    expect(suggestProgression({ previous: [set(0, 60, 8)], targets: [], weightStep: 2.5 })).toBeNull()
  })

  it('ignora el orden en que llegan las series', () => {
    const result = suggestProgression({
      previous: [set(2, 60, 8), set(0, 60, 8), set(1, 60, 8)],
      targets,
      weightStep: 2.5,
    })
    expect(result?.kind).toBe('increase')
  })
})
