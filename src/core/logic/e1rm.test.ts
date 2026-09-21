import { describe, expect, it } from 'vitest'
import { estimateOneRepMax } from './e1rm'

describe('estimateOneRepMax', () => {
  it('aplica la formula peso x (1 + (reps + rir) / 30)', () => {
    expect(estimateOneRepMax(60, 8, 2)).toBe(80)
    expect(estimateOneRepMax(100, 5, 0)).toBe(116.67)
  })

  it('a mismo peso, más repeticiones dan más marca', () => {
    expect(estimateOneRepMax(80, 6, 2)).toBeGreaterThan(estimateOneRepMax(80, 5, 2))
  })

  it('dejar repeticiones en reserva sube la marca', () => {
    expect(estimateOneRepMax(60, 8, 2)).toBeGreaterThan(estimateOneRepMax(60, 8, 0))
  })

  it('a mismas repeticiones, más peso da más marca', () => {
    expect(estimateOneRepMax(100, 5, 1)).toBeGreaterThan(estimateOneRepMax(97.5, 5, 1))
  })

  it('una serie vacía no vale nada', () => {
    expect(estimateOneRepMax(0, 10, 0)).toBe(0)
    expect(estimateOneRepMax(80, 0, 0)).toBe(0)
  })

  it('un RIR negativo no resta', () => {
    expect(estimateOneRepMax(60, 8, -3)).toBe(estimateOneRepMax(60, 8, 0))
  })
})
