import { describe, expect, it } from 'vitest'
import { purgeExercise, purgeRoutine, purgeTraining, type PurgeTables, type PurgeTarget } from './purge'

function tables(): PurgeTables {
  return {
    exercises: {
      press: { id: 'press', name: 'Press' },
      curl: { id: 'curl', name: 'Curl' },
    },
    routines: {
      upper: { id: 'upper', name: 'Upper' },
      lower: { id: 'lower', name: 'Lower' },
    },
    routineExercises: {
      re1: { id: 're1', routineId: 'upper', exerciseId: 'press' },
      re2: { id: 're2', routineId: 'upper', exerciseId: 'curl' },
      re3: { id: 're3', routineId: 'lower', exerciseId: 'press' },
    },
    sessions: {
      s1: { id: 's1', routineId: 'upper' },
      s2: { id: 's2', routineId: 'lower' },
      // Ya estaba marcada como borrada: igual se limpia.
      s3: { id: 's3', routineId: 'upper', deleted: true },
    },
    setLogs: {
      l1: { id: 'l1', sessionId: 's1', exerciseId: 'press' },
      l2: { id: 'l2', sessionId: 's1', exerciseId: 'curl' },
      l3: { id: 'l3', sessionId: 's2', exerciseId: 'press' },
      l4: { id: 'l4', sessionId: 's3', exerciseId: 'press' },
    },
    sessionNotes: {
      n1: { id: 'n1', sessionId: 's1', exerciseId: 'press' },
      n2: { id: 'n2', sessionId: 's2', exerciseId: 'press' },
    },
    personalRecords: {
      r1: { id: 'r1', exerciseId: 'press', setLogId: 'l1' },
      r2: { id: 'r2', exerciseId: 'press', setLogId: 'l3' },
    },
    settings: { app: { id: 'app' } },
  }
}

const keys = (targets: PurgeTarget[]) => targets.map((target) => `${target.collection}/${target.id}`).sort()

describe('purgeRoutine', () => {
  it('se lleva la rutina con todo su historial', () => {
    const plan = purgeRoutine(tables(), 'upper')
    expect(keys(plan.targets)).toEqual(
      [
        'routines/upper',
        'routineExercises/re1',
        'routineExercises/re2',
        'sessions/s1',
        'sessions/s3',
        'setLogs/l1',
        'setLogs/l2',
        'setLogs/l4',
        'sessionNotes/n1',
        'personalRecords/r1',
      ].sort(),
    )
    expect(plan.sessions).toBe(2)
    expect(plan.sets).toBe(3)
  })

  it('no toca otras rutinas, ni los ejercicios, ni los ajustes', () => {
    const plan = keys(purgeRoutine(tables(), 'upper').targets)
    expect(plan).not.toContain('routines/lower')
    expect(plan).not.toContain('sessions/s2')
    expect(plan).not.toContain('setLogs/l3')
    expect(plan).not.toContain('exercises/press')
    expect(plan).not.toContain('settings/app')
  })
})

describe('purgeExercise', () => {
  it('se lleva el ejercicio con sus series, notas, récords y su lugar en las rutinas', () => {
    const plan = purgeExercise(tables(), 'press')
    expect(keys(plan.targets)).toEqual(
      [
        'exercises/press',
        'routineExercises/re1',
        'routineExercises/re3',
        'setLogs/l1',
        'setLogs/l3',
        'setLogs/l4',
        'sessionNotes/n1',
        'sessionNotes/n2',
        'personalRecords/r1',
        'personalRecords/r2',
      ].sort(),
    )
  })

  it('las sesiones se quedan, con los demás ejercicios', () => {
    const plan = keys(purgeExercise(tables(), 'press').targets)
    expect(plan).not.toContain('sessions/s1')
    expect(plan).not.toContain('setLogs/l2')
    expect(plan).not.toContain('exercises/curl')
  })
})

describe('purgeTraining', () => {
  it('borra todos los entrenamientos y deja rutinas, ejercicios y ajustes', () => {
    const plan = purgeTraining(tables())
    const collections = new Set(plan.targets.map((target) => target.collection))
    expect([...collections].sort()).toEqual(['personalRecords', 'sessionNotes', 'sessions', 'setLogs'])
    expect(plan.sessions).toBe(3)
    expect(plan.sets).toBe(4)
  })

  it('también limpia series sueltas de sesiones que ya no existen', () => {
    const data = tables()
    data.setLogs.huerfana = { id: 'huerfana', sessionId: 'no-existe', exerciseId: 'press' }
    expect(keys(purgeTraining(data).targets)).toContain('setLogs/huerfana')
  })

  it('no repite registros', () => {
    const plan = keys(purgeTraining(tables()).targets)
    expect(new Set(plan).size).toBe(plan.length)
  })

  it('sin entrenamientos no hay nada que borrar', () => {
    const data = tables()
    data.sessions = {}
    data.setLogs = {}
    data.sessionNotes = {}
    data.personalRecords = {}
    expect(purgeTraining(data).targets).toEqual([])
  })
})
