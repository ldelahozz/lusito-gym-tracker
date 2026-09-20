import { describe, expect, it } from 'vitest'
import {
  aggregateWeeks,
  recentWeeks,
  sessionDuration,
  startOfWeek,
  weekLabel,
  weekStartOf,
  type StatSession,
  type StatSet,
} from './weeks'

/** 1 de enero de 2024 fue lunes. */
const monday = new Date(2024, 0, 1, 0, 0, 0)
const at = (day: number, hour = 12) => new Date(2024, 0, day, hour).getTime()

describe('startOfWeek', () => {
  it('un lunes se queda en si mismo, a las 00:00', () => {
    const start = startOfWeek(new Date(2024, 0, 1, 23, 30))
    expect(start.getTime()).toBe(monday.getTime())
  })

  it('el domingo pertenece a la semana que empezo el lunes anterior', () => {
    expect(startOfWeek(new Date(2024, 0, 7, 22, 0)).getTime()).toBe(monday.getTime())
  })

  it('el lunes siguiente ya es otra semana', () => {
    expect(startOfWeek(new Date(2024, 0, 8, 0, 1)).getTime()).toBe(new Date(2024, 0, 8).getTime())
  })

  it('funciona cruzando el cambio de anio', () => {
    // 31 de diciembre de 2024 fue martes: su semana empezo el 30.
    expect(startOfWeek(new Date(2024, 11, 31)).getTime()).toBe(new Date(2024, 11, 30).getTime())
  })
})

describe('recentWeeks', () => {
  it('devuelve tantos lunes como se pidan, del mas viejo al actual', () => {
    const weeks = recentWeeks(4, at(10))
    expect(weeks).toHaveLength(4)
    expect(weeks[3]).toBe(weekStartOf(at(10)))
    expect(weeks[0]).toBe(new Date(2023, 11, 18).getTime())
  })

  it('siempre devuelve al menos una semana', () => {
    expect(recentWeeks(0, at(10))).toHaveLength(1)
  })

  it('todos los elementos son lunes seguidos', () => {
    const weeks = recentWeeks(6, at(10))
    for (const week of weeks) expect(new Date(week).getDay()).toBe(1)
  })
})

describe('weekLabel', () => {
  it('escribe el dia y el mes en corto', () => {
    expect(weekLabel(monday.getTime())).toBe('1 ene')
  })
})

describe('sessionDuration', () => {
  const base: StatSession = {
    id: 's',
    routineId: 'r',
    startedAt: 1_000,
    endedAt: 61_000,
    pausedMs: 10_000,
    deleted: false,
  }

  it('descuenta el tiempo en pausa', () => {
    expect(sessionDuration(base)).toBe(50_000)
  })

  it('una sesion sin terminar no tiene duracion', () => {
    expect(sessionDuration({ ...base, endedAt: null })).toBeNull()
  })

  it('nunca da negativo', () => {
    expect(sessionDuration({ ...base, pausedMs: 999_999 })).toBe(0)
  })
})

const set = (day: number, weightKg: number, reps: number, rir = 2, extra: Partial<StatSet> = {}): StatSet => ({
  sessionId: `s${day}`,
  exerciseId: 'press',
  type: 'work',
  weightKg,
  reps,
  rir,
  completedAt: at(day),
  ...extra,
})

const session = (day: number, minutes: number, extra: Partial<StatSession> = {}): StatSession => ({
  id: `s${day}`,
  routineId: 'r',
  startedAt: at(day),
  endedAt: at(day) + minutes * 60_000,
  pausedMs: 0,
  ...extra,
})

describe('aggregateWeeks', () => {
  const sets = [
    set(1, 60, 8, 2),
    set(3, 62.5, 8, 1),
    // Semana siguiente.
    set(8, 65, 6, 2),
    set(10, 65, 8, 0),
  ]
  const sessions = [session(1, 60), session(3, 40), session(8, 50)]

  it('reparte cada serie en la semana que le toca', () => {
    const weeks = aggregateWeeks({ sets, sessions, weeks: 2, now: at(10) })
    expect(weeks).toHaveLength(2)
    expect(weeks[0].sets).toBe(2)
    expect(weeks[1].sets).toBe(2)
  })

  it('calcula peso maximo, volumen y series por semana', () => {
    const [primera, segunda] = aggregateWeeks({ sets, sessions, weeks: 2, now: at(10) })
    expect(primera.maxWeight).toBe(62.5)
    expect(primera.volume).toBe(60 * 8 + 62.5 * 8)
    expect(segunda.maxWeight).toBe(65)
    expect(segunda.volume).toBe(65 * 6 + 65 * 8)
  })

  it('promedia el RIR y la duracion de las sesiones', () => {
    const [primera] = aggregateWeeks({ sets, sessions, weeks: 2, now: at(10) })
    expect(primera.avgRir).toBe(1.5)
    expect(primera.sessions).toBe(2)
    expect(primera.avgDurationMs).toBe(50 * 60_000)
  })

  it('el mejor 1RM estimado sale de la mejor serie, no de la mas pesada', () => {
    const [, segunda] = aggregateWeeks({ sets, sessions, weeks: 2, now: at(10) })
    // 65 x 8 @RIR 0 estima mas que 65 x 6 @RIR 2.
    expect(segunda.bestE1rm).toBeCloseTo(65 * (1 + 8 / 30), 2)
  })

  it('una semana sin entrenar aparece vacia, no en cero', () => {
    const weeks = aggregateWeeks({ sets: [set(1, 60, 8)], sessions: [], weeks: 2, now: at(10) })
    expect(weeks[1].maxWeight).toBeNull()
    expect(weeks[1].avgRir).toBeNull()
    expect(weeks[1].volume).toBe(0)
    expect(weeks[1].sets).toBe(0)
  })

  it('los calentamientos no cuentan', () => {
    const conCalentamiento = [...sets, set(1, 200, 20, 5, { type: 'warmup' })]
    const [primera] = aggregateWeeks({ sets: conCalentamiento, sessions, weeks: 2, now: at(10) })
    expect(primera.maxWeight).toBe(62.5)
    expect(primera.sets).toBe(2)
  })

  it('lo borrado no cuenta', () => {
    const conBorrado = [...sets, set(1, 300, 10, 0, { deleted: true })]
    const [primera] = aggregateWeeks({ sets: conBorrado, sessions, weeks: 2, now: at(10) })
    expect(primera.maxWeight).toBe(62.5)
  })

  it('deja fuera lo anterior al rango pedido', () => {
    const weeks = aggregateWeeks({ sets, sessions, weeks: 1, now: at(10) })
    expect(weeks).toHaveLength(1)
    expect(weeks[0].sets).toBe(2)
    expect(weeks[0].maxWeight).toBe(65)
  })

  it('sin limite de semanas abarca desde el primer registro', () => {
    const weeks = aggregateWeeks({ sets, sessions, weeks: null, now: at(10) })
    expect(weeks).toHaveLength(2)
    expect(weeks[0].label).toBe('1 ene')
  })

  it('sin nada registrado no hay semanas que mostrar', () => {
    expect(aggregateWeeks({ sets: [], sessions: [], weeks: null, now: at(10) })).toEqual([])
  })

  it('con rango fijo siempre devuelve el rango completo, aunque este vacio', () => {
    expect(aggregateWeeks({ sets: [], sessions: [], weeks: 8, now: at(10) })).toHaveLength(8)
  })
})
