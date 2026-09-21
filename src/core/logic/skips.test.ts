import { describe, expect, it } from 'vitest'
import { finalSkipped, hasWorkSets, setSkipped, skippedLastTime, skippedOf } from './skips'

const work = (sessionId: string, exerciseId: string, extra = {}) => ({
  sessionId,
  exerciseId,
  type: 'work' as const,
  ...extra,
})

describe('skippedOf', () => {
  it('lee la lista de la sesión', () => {
    expect(skippedOf({ skippedExerciseIds: ['curl'] })).toEqual(['curl'])
  })

  it('las sesiones viejas sin lista cuentan como sin saltados', () => {
    expect(skippedOf({})).toEqual([])
    expect(skippedOf({ skippedExerciseIds: null })).toEqual([])
    expect(skippedOf(undefined)).toEqual([])
  })
})

describe('setSkipped', () => {
  it('agrega y quita sin repetir', () => {
    expect(setSkipped([], 'curl', true)).toEqual(['curl'])
    expect(setSkipped(['curl'], 'curl', true)).toEqual(['curl'])
    expect(setSkipped(['curl', 'remo'], 'curl', false)).toEqual(['remo'])
  })

  it('no modifica la lista original', () => {
    const original = ['curl']
    setSkipped(original, 'remo', true)
    expect(original).toEqual(['curl'])
  })
})

describe('hasWorkSets', () => {
  it('solo cuentan las series de trabajo de esa sesión', () => {
    const sets = [
      { ...work('s1', 'press'), type: 'warmup' as const },
      work('s2', 'press'),
      work('s1', 'press', { deleted: true }),
    ]
    expect(hasWorkSets(sets, 's1', 'press')).toBe(false)
    expect(hasWorkSets([...sets, work('s1', 'press')], 's1', 'press')).toBe(true)
  })
})

describe('finalSkipped', () => {
  const planned = ['press', 'remo', 'curl', 'fondos']

  it('todo lo que quedo sin series de trabajo cuenta como saltado, en el orden de la rutina', () => {
    const sets = [work('s1', 'press'), work('s1', 'remo')]
    expect(finalSkipped({ planned, marked: [], sets, sessionId: 's1' })).toEqual(['curl', 'fondos'])
  })

  it('lo marcado a mano que al final si se hizo, no cuenta', () => {
    const sets = [work('s1', 'press'), work('s1', 'remo'), work('s1', 'curl'), work('s1', 'fondos')]
    expect(finalSkipped({ planned, marked: ['curl'], sets, sessionId: 's1' })).toEqual([])
  })

  it('solo calentar no cuenta como hacer el ejercicio', () => {
    const sets = [
      work('s1', 'press'),
      work('s1', 'remo'),
      work('s1', 'fondos'),
      { ...work('s1', 'curl'), type: 'warmup' as const },
    ]
    expect(finalSkipped({ planned, marked: [], sets, sessionId: 's1' })).toEqual(['curl'])
  })

  it('conserva un saltado a mano que ya no esta en la rutina', () => {
    const sets = planned.map((id) => work('s1', id))
    expect(finalSkipped({ planned, marked: ['viejo'], sets, sessionId: 's1' })).toEqual(['viejo'])
  })
})

describe('skippedLastTime', () => {
  const session = (id: string, startedAt: number, skipped: string[] = [], extra = {}) => ({
    id,
    routineId: 'upper',
    startedAt,
    endedAt: startedAt + 1,
    skippedExerciseIds: skipped,
    ...extra,
  })

  it('avisa si en la sesión anterior de la rutina te lo saltaste', () => {
    const sessions = [session('a', 1, []), session('b', 2, ['curl']), session('hoy', 3)]
    expect(
      skippedLastTime({ sessions, routineId: 'upper', exerciseId: 'curl', currentSessionId: 'hoy' })?.id,
    ).toBe('b')
  })

  it('solo mira la sesión inmediatamente anterior', () => {
    const sessions = [session('a', 1, ['curl']), session('b', 2, []), session('hoy', 3)]
    expect(
      skippedLastTime({ sessions, routineId: 'upper', exerciseId: 'curl', currentSessionId: 'hoy' }),
    ).toBeNull()
  })

  it('no mezcla otras rutinas ni sesiones en curso o borradas', () => {
    const sessions = [
      session('a', 1, []),
      session('otra', 2, ['curl'], { routineId: 'lower' }),
      session('curso', 2.5, ['curl'], { endedAt: null }),
      session('borrada', 2.7, ['curl'], { deleted: true }),
      session('hoy', 3),
    ]
    expect(
      skippedLastTime({ sessions, routineId: 'upper', exerciseId: 'curl', currentSessionId: 'hoy' }),
    ).toBeNull()
  })

  it('la primera sesión de una rutina no tiene nada que avisar', () => {
    expect(
      skippedLastTime({
        sessions: [session('hoy', 3)],
        routineId: 'upper',
        exerciseId: 'curl',
        currentSessionId: 'hoy',
      }),
    ).toBeNull()
  })
})
