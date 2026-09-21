import { describe, expect, it } from 'vitest'
import {
  cleanExerciseName,
  findExerciseByName,
  normalizeExerciseName,
  planExerciseMerge,
  suggestExercises,
  type NamedExercise,
} from './names'

const ex = (id: string, name: string, extra: Partial<NamedExercise> = {}): NamedExercise => ({
  id,
  name,
  normalizedName: normalizeExerciseName(name),
  ...extra,
})

describe('normalizeExerciseName', () => {
  it('ignora mayusculas, acentos y espacios de más', () => {
    expect(normalizeExerciseName('  Press   Bánca ')).toBe('press banca')
    expect(normalizeExerciseName('PRESS BANCA')).toBe('press banca')
    expect(normalizeExerciseName('press banca')).toBe('press banca')
  })

  it('trata la enie como letra propia', () => {
    expect(normalizeExerciseName('Peso Muerto')).toBe('peso muerto')
    expect(normalizeExerciseName('Extension de triceps')).toBe('extension de triceps')
    expect(normalizeExerciseName('Extensión de tríceps')).toBe('extension de triceps')
  })

  it('con texto vacío devuelve vacío', () => {
    expect(normalizeExerciseName('   ')).toBe('')
  })
})

describe('cleanExerciseName', () => {
  it('conserva acentos y mayusculas, pero quita espacios sobrantes', () => {
    expect(cleanExerciseName('  Press   Banca ')).toBe('Press Banca')
  })
})

describe('findExerciseByName', () => {
  const catalog = [ex('1', 'Press Banca'), ex('2', 'Sentadilla'), ex('3', 'Remo', { deleted: true })]

  it('encuentra aunque se escriba distinto', () => {
    expect(findExerciseByName(catalog, 'press bánca')?.id).toBe('1')
    expect(findExerciseByName(catalog, '  SENTADILLA  ')?.id).toBe('2')
  })

  it('no encuentra los borrados', () => {
    expect(findExerciseByName(catalog, 'Remo')).toBeUndefined()
  })

  it('no encuentra nada con texto vacío', () => {
    expect(findExerciseByName(catalog, '  ')).toBeUndefined()
  })
})

describe('suggestExercises', () => {
  const catalog = [
    ex('1', 'Press Banca'),
    ex('2', 'Press Militar'),
    ex('3', 'Sentadilla'),
    ex('4', 'Press Inclinado', { archived: true }),
  ]

  it('pone primero los que empiezan igual', () => {
    const result = suggestExercises(catalog, 'press')
    expect(result.map((item) => item.id)).toEqual(['1', '2'])
  })

  it('también encuentra por una parte del nombre', () => {
    expect(suggestExercises(catalog, 'banca').map((item) => item.id)).toEqual(['1'])
  })

  it('no sugiere archivados', () => {
    expect(suggestExercises(catalog, 'inclinado')).toEqual([])
  })

  it('sin texto devuelve el catálogo disponible', () => {
    expect(suggestExercises(catalog, '').map((item) => item.id)).toEqual(['1', '2', '3'])
  })
})

describe('planExerciseMerge', () => {
  const base = {
    sourceId: 'viejo',
    targetId: 'bueno',
    routineExercises: [
      { id: 're1', exerciseId: 'viejo', routineId: 'rutinaA' },
      { id: 're2', exerciseId: 'bueno', routineId: 'rutinaB' },
    ],
    setLogs: [
      { id: 's1', exerciseId: 'viejo' },
      { id: 's2', exerciseId: 'bueno' },
      { id: 's3', exerciseId: 'viejo' },
    ],
    sessionNotes: [{ id: 'n1', exerciseId: 'viejo' }],
    personalRecords: [{ id: 'p1', exerciseId: 'viejo' }],
  }

  it('conserva todo el historial del ejercicio viejo', () => {
    const plan = planExerciseMerge(base)
    expect(plan.reassign.setLogs).toEqual(['s1', 's3'])
    expect(plan.reassign.sessionNotes).toEqual(['n1'])
    expect(plan.reassign.personalRecords).toEqual(['p1'])
    expect(plan.removeExerciseId).toBe('viejo')
  })

  it('mueve la entrada de rutina cuando el destino no estaba en esa rutina', () => {
    const plan = planExerciseMerge(base)
    expect(plan.reassign.routineExercises).toEqual(['re1'])
    expect(plan.dropRoutineExercises).toEqual([])
  })

  it('elimina la entrada duplicada si ambos estaban en la misma rutina', () => {
    const plan = planExerciseMerge({
      ...base,
      routineExercises: [
        { id: 're1', exerciseId: 'viejo', routineId: 'rutinaA' },
        { id: 're2', exerciseId: 'bueno', routineId: 'rutinaA' },
      ],
    })
    expect(plan.reassign.routineExercises).toEqual([])
    expect(plan.dropRoutineExercises).toEqual(['re1'])
  })

  it('no permite fusionar un ejercicio consigo mismo', () => {
    expect(() => planExerciseMerge({ ...base, targetId: 'viejo' })).toThrow()
  })
})
