import { describe, expect, it } from 'vitest'
import {
  daysUsing,
  isSplitEmpty,
  normalizeSplit,
  removeRoutineFromSplit,
  setDayRoutine,
  weekdayIndex,
} from './weekPlan'

describe('weekdayIndex', () => {
  it('cuenta la semana de lunes a domingo', () => {
    // 1 de enero de 2024 fue lunes.
    expect(weekdayIndex(new Date(2024, 0, 1))).toBe(0)
    expect(weekdayIndex(new Date(2024, 0, 2))).toBe(1)
    expect(weekdayIndex(new Date(2024, 0, 6))).toBe(5)
  })

  it('el domingo es el último día, no el primero', () => {
    expect(weekdayIndex(new Date(2024, 0, 7))).toBe(6)
  })
})

describe('normalizeSplit', () => {
  it('siempre devuelve siete días', () => {
    expect(normalizeSplit(null)).toHaveLength(7)
    expect(normalizeSplit(['a'])).toHaveLength(7)
    expect(normalizeSplit(new Array(20).fill('a'))).toHaveLength(7)
  })

  it('completa con descanso lo que falte', () => {
    expect(normalizeSplit(['a', 'b'])).toEqual(['a', 'b', null, null, null, null, null])
  })

  it('descarta lo que no sea un identificador', () => {
    expect(normalizeSplit([1, '', undefined, 'ok'])).toEqual([
      null,
      null,
      null,
      'ok',
      null,
      null,
      null,
    ])
  })
})

describe('setDayRoutine', () => {
  const base = normalizeSplit([])

  it('asigna la rutina al día indicado', () => {
    expect(setDayRoutine(base, 2, 'empuje')[2]).toBe('empuje')
  })

  it('no modifica el split original', () => {
    const original = normalizeSplit(['a', 'b'])
    setDayRoutine(original, 0, 'otra')
    expect(original[0]).toBe('a')
  })

  it('la misma rutina puede repetirse en varios días', () => {
    const split = setDayRoutine(setDayRoutine(base, 0, 'upper'), 3, 'upper')
    expect(daysUsing(split, 'upper')).toEqual([0, 3])
  })

  it('pasar null deja el día en descanso', () => {
    const split = setDayRoutine(base, 1, 'pierna')
    expect(setDayRoutine(split, 1, null)[1]).toBeNull()
  })

  it('ignora días que no existen', () => {
    expect(setDayRoutine(base, 9, 'x')).toEqual(base)
    expect(setDayRoutine(base, -1, 'x')).toEqual(base)
  })
})

describe('isSplitEmpty', () => {
  it('una semana sin nada asignado está vacía', () => {
    expect(isSplitEmpty(normalizeSplit([]))).toBe(true)
    expect(isSplitEmpty(undefined)).toBe(true)
  })

  it('con un solo día asignado ya no lo está', () => {
    expect(isSplitEmpty(setDayRoutine(normalizeSplit([]), 4, 'pierna'))).toBe(false)
  })
})

describe('removeRoutineFromSplit', () => {
  it('borrar una rutina la quita de todos sus días', () => {
    const split = normalizeSplit(['upper', 'lower', 'upper'])
    expect(removeRoutineFromSplit(split, 'upper')).toEqual([
      null,
      'lower',
      null,
      null,
      null,
      null,
      null,
    ])
  })

  it('no toca las demás rutinas', () => {
    const split = normalizeSplit(['upper', 'lower'])
    expect(daysUsing(removeRoutineFromSplit(split, 'upper'), 'lower')).toEqual([1])
  })
})
