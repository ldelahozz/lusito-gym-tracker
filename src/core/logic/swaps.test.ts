import { describe, expect, it } from 'vitest'
import { canSwap, effectiveLinks, setSwap, swapsOf } from './swaps'

const links = [
  { id: 're1', exerciseId: 'press', restSeconds: 150 },
  { id: 're2', exerciseId: 'remo', restSeconds: 120 },
]

describe('effectiveLinks', () => {
  it('sin cambios, queda igual que la rutina', () => {
    expect(effectiveLinks(links, {}).map((link) => link.exerciseId)).toEqual(['press', 'remo'])
    expect(effectiveLinks(links, {}).every((link) => link.swappedFrom === null)).toBe(true)
  })

  it('el ejercicio nuevo toma el lugar y hereda lo demás del original', () => {
    const [first] = effectiveLinks(links, { exerciseSwaps: { re1: 'mancuernas' } })
    expect(first.exerciseId).toBe('mancuernas')
    expect(first.swappedFrom).toBe('press')
    expect(first.restSeconds).toBe(150)
  })

  it('las sesiones viejas sin el campo no se rompen', () => {
    expect(swapsOf({ exerciseSwaps: null })).toEqual({})
    expect(effectiveLinks(links, { exerciseSwaps: null })).toHaveLength(2)
  })
})

describe('setSwap', () => {
  it('anota y quita el cambio', () => {
    const swapped = setSwap({}, links[0], 'mancuernas')
    expect(swapped).toEqual({ re1: 'mancuernas' })
    expect(setSwap(swapped, links[0], null)).toEqual({})
  })

  it('volver a elegir el original quita el cambio', () => {
    expect(setSwap({ re1: 'mancuernas' }, links[0], 'press')).toEqual({})
  })
})

describe('canSwap', () => {
  it('se puede mientras no haya series registradas', () => {
    expect(canSwap({ links, currentLinkId: 're1', newExerciseId: 'mancuernas', loggedSets: 0 })).toEqual({ ok: true })
    expect(canSwap({ links, currentLinkId: 're1', newExerciseId: 'mancuernas', loggedSets: 1 })).toEqual({
      ok: false,
      reason: 'has-sets',
    })
  })

  it('no deja poner un ejercicio que ya está en la sesión de hoy', () => {
    expect(canSwap({ links, currentLinkId: 're1', newExerciseId: 'remo', loggedSets: 0 })).toEqual({
      ok: false,
      reason: 'already-in-session',
    })
  })
})
