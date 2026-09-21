import { describe, expect, it } from 'vitest'
import {
  compareSets,
  exerciseHistory,
  finishedSessions,
  previousOf,
  routineSummary,
  trendBetween,
  type ProgressSession,
  type ProgressSet,
} from './progress'

let nextId = 1
const set = (
  sessionId: string,
  setIndex: number,
  weightKg: number,
  reps: number,
  rir = 2,
  extra: Partial<ProgressSet> = {},
): ProgressSet => ({
  id: `set${nextId++}`,
  sessionId,
  exerciseId: 'press',
  type: 'work',
  setIndex,
  weightKg,
  reps,
  rir,
  ...extra,
})

const session = (id: string, startedAt: number, extra: Partial<ProgressSession> = {}): ProgressSession => ({
  id,
  routineId: 'upper',
  startedAt,
  endedAt: startedAt + 3_600_000,
  ...extra,
})

const sessions = [session('a', 1_000), session('b', 2_000), session('c', 3_000)]

const sets = [
  set('a', 0, 60, 8),
  set('a', 1, 60, 7),
  set('b', 0, 60, 8),
  set('b', 1, 60, 8),
  set('c', 0, 62.5, 6),
  set('c', 1, 62.5, 6),
  set('c', 2, 62.5, 5),
]

describe('finishedSessions', () => {
  it('deja fuera las que siguen en curso y las borradas', () => {
    const list = finishedSessions([
      ...sessions,
      session('en-curso', 4_000, { endedAt: null }),
      session('borrada', 5_000, { deleted: true }),
    ])
    expect(list.map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('puede limitarse a una rutina', () => {
    const list = finishedSessions([...sessions, session('x', 500, { routineId: 'lower' })], 'lower')
    expect(list.map((item) => item.id)).toEqual(['x'])
  })
})

describe('exerciseHistory', () => {
  it('agrupa las series por sesion, de la mas vieja a la mas nueva', () => {
    const history = exerciseHistory({ sets, sessions, exerciseId: 'press' })
    expect(history.map((item) => item.sessionId)).toEqual(['a', 'b', 'c'])
    expect(history[2].sets).toHaveLength(3)
  })

  it('resume cada sesion: peso tope, reps totales y volumen', () => {
    const [primera, , tercera] = exerciseHistory({ sets, sessions, exerciseId: 'press' })
    expect(primera.topWeight).toBe(60)
    expect(primera.totalReps).toBe(15)
    expect(primera.volume).toBe(60 * 15)
    expect(tercera.topWeight).toBe(62.5)
  })

  it('ignora calentamientos, borrados y otros ejercicios', () => {
    const ruido = [
      ...sets,
      set('a', 0, 200, 20, 5, { type: 'warmup' }),
      set('a', 9, 300, 1, 0, { deleted: true }),
      set('a', 0, 100, 10, 2, { exerciseId: 'sentadilla' }),
    ]
    const [primera] = exerciseHistory({ sets: ruido, sessions, exerciseId: 'press' })
    expect(primera.topWeight).toBe(60)
    expect(primera.sets).toHaveLength(2)
  })

  it('no cuenta una sesion que sigue en curso', () => {
    const conCurso = [...sessions, session('hoy', 9_000, { endedAt: null })]
    const history = exerciseHistory({
      sets: [...sets, set('hoy', 0, 70, 8)],
      sessions: conCurso,
      exerciseId: 'press',
    })
    expect(history.map((item) => item.sessionId)).not.toContain('hoy')
  })

  it('ordena las series por su posicion aunque lleguen desordenadas', () => {
    const [primera] = exerciseHistory({
      sets: [set('a', 1, 60, 7), set('a', 0, 60, 8)],
      sessions,
      exerciseId: 'press',
    })
    expect(primera.sets.map((item) => item.reps)).toEqual([8, 7])
  })
})

describe('compareSets', () => {
  it('compara serie con serie y da las diferencias', () => {
    const rows = compareSets([set('b', 0, 62.5, 9, 1)], [set('a', 0, 60, 8, 2)])
    expect(rows).toEqual([
      expect.objectContaining({ position: 1, weightDelta: 2.5, repsDelta: 1, rirDelta: -1 }),
    ])
  })

  it('una serie de mas hoy aparece sin comparacion', () => {
    const rows = compareSets([set('b', 0, 60, 8), set('b', 1, 60, 8)], [set('a', 0, 60, 8)])
    expect(rows).toHaveLength(2)
    expect(rows[1].previous).toBeNull()
    expect(rows[1].weightDelta).toBeNull()
  })

  it('una serie que hoy no hiciste tambien aparece', () => {
    const rows = compareSets([set('b', 0, 60, 8)], [set('a', 0, 60, 8), set('a', 1, 60, 8)])
    expect(rows[1].current).toBeNull()
    expect(rows[1].previous?.reps).toBe(8)
  })

  it('sin diferencias todo queda en cero', () => {
    const [row] = compareSets([set('b', 0, 60, 8, 2)], [set('a', 0, 60, 8, 2)])
    expect(row.weightDelta).toBe(0)
    expect(row.repsDelta).toBe(0)
    expect(row.rirDelta).toBe(0)
  })

  it('no arrastra errores de decimales', () => {
    const [row] = compareSets([set('b', 0, 62.6, 8)], [set('a', 0, 60.1, 8)])
    expect(row.weightDelta).toBe(2.5)
  })
})

describe('trendBetween: progresion doble', () => {
  const history = exerciseHistory({ sets, sessions, exerciseId: 'press' })

  it('mas peso es subir, aunque salgan menos repeticiones', () => {
    expect(trendBetween(history[2], history[1])).toEqual({ kind: 'up', reason: 'weight' })
  })

  it('mismo peso y mas repeticiones es subir', () => {
    expect(trendBetween(history[1], history[0])).toEqual({ kind: 'up', reason: 'reps' })
  })

  it('mismo peso y menos repeticiones es bajar', () => {
    expect(trendBetween(history[0], history[1])).toEqual({ kind: 'down', reason: 'reps' })
  })

  it('menos peso es bajar', () => {
    expect(trendBetween(history[1], history[2])).toEqual({ kind: 'down', reason: 'weight' })
  })

  it('exactamente lo mismo es quedar igual', () => {
    expect(trendBetween(history[1], history[1])).toEqual({ kind: 'same', reason: null })
  })

  it('el RIR no cambia el veredicto', () => {
    const [facil] = exerciseHistory({
      sets: [set('a', 0, 60, 8, 4)],
      sessions,
      exerciseId: 'press',
    })
    const [dificil] = exerciseHistory({
      sets: [set('a', 0, 60, 8, 0)],
      sessions,
      exerciseId: 'press',
    })
    expect(trendBetween(facil, dificil).kind).toBe('same')
  })

  it('la primera vez no hay con que comparar', () => {
    expect(trendBetween(history[0], undefined)).toEqual({ kind: 'new', reason: null })
  })
})

describe('previousOf', () => {
  const history = exerciseHistory({ sets, sessions, exerciseId: 'press' })

  it('devuelve la vez anterior', () => {
    expect(previousOf(history, 'c')?.sessionId).toBe('b')
  })

  it('la primera no tiene anterior', () => {
    expect(previousOf(history, 'a')).toBeUndefined()
  })

  it('una sesion que no esta en el historial tampoco', () => {
    expect(previousOf(history, 'no-existe')).toBeUndefined()
  })
})

describe('routineSummary', () => {
  it('cuenta cuantos ejercicios subieron en la ultima sesion', () => {
    const mixed = [
      ...sets,
      // Sentadilla: igual en b y c.
      set('b', 0, 100, 5, 2, { exerciseId: 'sentadilla' }),
      set('c', 0, 100, 5, 2, { exerciseId: 'sentadilla' }),
      // Remo: baja en c.
      set('b', 0, 50, 10, 2, { exerciseId: 'remo' }),
      set('c', 0, 50, 8, 2, { exerciseId: 'remo' }),
      // Curl: primera vez en c.
      set('c', 0, 12, 12, 2, { exerciseId: 'curl' }),
    ]
    const summary = routineSummary({ sets: mixed, sessions, routineId: 'upper' })
    expect(summary).toEqual({ sessions: 3, lastAt: 3_000, up: 1, same: 1, down: 1, fresh: 1 })
  })

  it('una rutina sin sesiones queda en cero', () => {
    expect(routineSummary({ sets, sessions, routineId: 'lower' })).toEqual({
      sessions: 0,
      lastAt: null,
      up: 0,
      same: 0,
      down: 0,
      fresh: 0,
    })
  })

  it('solo compara dentro de la misma rutina', () => {
    const otras = [
      ...sessions,
      session('lower1', 2_500, { routineId: 'lower' }),
    ]
    // En otra rutina hizo 100 kg; no debe contar como "la vez anterior" de upper.
    const conOtra = [...sets, set('lower1', 0, 100, 10)]
    const summary = routineSummary({ sets: conOtra, sessions: otras, routineId: 'upper' })
    expect(summary.up).toBe(1)
  })
})
