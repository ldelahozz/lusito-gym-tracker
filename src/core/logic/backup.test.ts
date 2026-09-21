import { describe, expect, it } from 'vitest'
import {
  BACKUP_APP,
  BACKUP_SCHEMA_VERSION,
  backupFileName,
  backupReminderDue,
  buildBackup,
  daysSince,
  parseBackup,
  planImport,
  serializeBackup,
  summarizeBackup,
  type Tables,
} from './backup'

const sync = { updatedAt: 111, deviceId: 'tel', deviceKind: 'mobile', deleted: false }
const DAY = 24 * 60 * 60 * 1000

function emptyTables(): Tables {
  return {
    exercises: {},
    routines: {},
    routineExercises: {},
    sessions: {},
    setLogs: {},
    sessionNotes: {},
    personalRecords: {},
    settings: {},
  }
}

function sampleTables(): Tables {
  const tables = emptyTables()
  tables.exercises.press = { ...sync, id: 'press', name: 'Press banca', normalizedName: 'press banca', archived: false }
  tables.routines.upper = { ...sync, id: 'upper', name: 'Upper 1', order: 0, archived: false }
  tables.routineExercises.re1 = {
    ...sync,
    id: 're1',
    routineId: 'upper',
    exerciseId: 'press',
    order: 0,
    workSets: [{ repsMin: 6, repsMax: 8, rir: 2 }],
    warmupSets: 2,
    restSeconds: 120,
    warmupRestSeconds: 60,
  }
  tables.sessions.s1 = {
    ...sync,
    id: 's1',
    routineId: 'upper',
    startedAt: 1_000,
    endedAt: 5_000,
    pausedMs: 0,
    pausedAt: null,
    skippedExerciseIds: [],
  }
  tables.setLogs.l1 = {
    ...sync,
    id: 'l1',
    sessionId: 's1',
    exerciseId: 'press',
    setIndex: 0,
    type: 'work',
    weightKg: 62.5,
    reps: 8,
    rir: 2,
    completedAt: 2_000,
  }
  tables.sessionNotes['s1_press'] = { ...sync, id: 's1_press', sessionId: 's1', exerciseId: 'press', text: 'Bien' }
  tables.personalRecords.r1 = {
    ...sync,
    id: 'r1',
    exerciseId: 'press',
    kind: 'weight',
    value: 62.5,
    setLogId: 'l1',
    achievedAt: 2_000,
  }
  tables.settings.app = { ...sync, id: 'app', weightStep: 2.5, sound: true }
  return tables
}

describe('buildBackup', () => {
  it('lleva la marca de la app, la version de formato y la fecha', () => {
    const backup = buildBackup(sampleTables(), 9_999)
    expect(backup.app).toBe(BACKUP_APP)
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION)
    expect(backup.exportedAt).toBe(9_999)
  })

  it('no guarda lo borrado ni los campos de sincronizacion', () => {
    const tables = sampleTables()
    tables.routines.vieja = { ...sync, id: 'vieja', name: 'Vieja', deleted: true }
    const backup = buildBackup(tables, 0)
    expect(backup.data.routines.map((doc) => doc.id)).toEqual(['upper'])
    expect(backup.data.setLogs[0]).not.toHaveProperty('deviceId')
    expect(backup.data.setLogs[0]).not.toHaveProperty('updatedAt')
    expect(backup.data.setLogs[0]).toHaveProperty('weightKg', 62.5)
  })
})

describe('ida y vuelta: exportar e importar', () => {
  it('importar en una cuenta vacia reconstruye exactamente lo exportado', () => {
    const original = sampleTables()
    const text = serializeBackup(buildBackup(original, 9_999))
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const plan = planImport(parsed.backup, emptyTables())
    expect(plan.kept).toBe(0)
    expect(plan.restored).toBe(0)
    expect(plan.added).toBe(8)

    // Lo que se escribiria es lo mismo que habia, sin los campos de sincronizacion.
    for (const { collection, doc } of plan.writes) {
      const { updatedAt, deviceId, deviceKind, deleted, ...expected } = original[collection][doc.id]
      void updatedAt
      void deviceId
      void deviceKind
      void deleted
      expect(doc).toEqual(expected)
    }
  })

  it('importar sobre los mismos datos no toca nada', () => {
    const tables = sampleTables()
    const parsed = parseBackup(serializeBackup(buildBackup(tables, 0)))
    if (!parsed.ok) throw new Error(parsed.error)
    const plan = planImport(parsed.backup, tables)
    expect(plan.writes).toEqual([])
    expect(plan.kept).toBe(8)
  })

  it('recupera lo que borraste despues de exportar', () => {
    const tables = sampleTables()
    const parsed = parseBackup(serializeBackup(buildBackup(tables, 0)))
    if (!parsed.ok) throw new Error(parsed.error)

    // Despues del respaldo: una serie borrada a proposito y otra que ni existe.
    tables.setLogs.l1 = { ...tables.setLogs.l1, deleted: true }
    delete tables.personalRecords.r1

    const plan = planImport(parsed.backup, tables)
    expect(plan.restored).toBe(1)
    expect(plan.added).toBe(1)
    expect(plan.writes.map((entry) => entry.doc.id).sort()).toEqual(['l1', 'r1'])
  })

  it('nunca pisa lo que ya tienes, aunque sea distinto al respaldo', () => {
    const tables = sampleTables()
    const parsed = parseBackup(serializeBackup(buildBackup(tables, 0)))
    if (!parsed.ok) throw new Error(parsed.error)
    tables.setLogs.l1 = { ...tables.setLogs.l1, weightKg: 70 }
    const plan = planImport(parsed.backup, tables)
    expect(plan.writes.find((entry) => entry.doc.id === 'l1')).toBeUndefined()
  })
})

describe('parseBackup: archivos que no sirven', () => {
  const valid = () => JSON.parse(serializeBackup(buildBackup(sampleTables(), 0)))

  it('rechaza algo que no es JSON', () => {
    const result = parseBackup('esto no es un respaldo')
    expect(result.ok).toBe(false)
  })

  it('rechaza un JSON de otra app', () => {
    const result = parseBackup(JSON.stringify({ app: 'otra-cosa', data: {} }))
    expect(result).toEqual({ ok: false, error: 'Ese archivo no es un respaldo de Lusito Gym Tracker.' })
  })

  it('rechaza un respaldo de una version mas nueva', () => {
    const file = valid()
    file.schemaVersion = BACKUP_SCHEMA_VERSION + 1
    const result = parseBackup(JSON.stringify(file))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('version mas nueva')
  })

  it('rechaza todo si algun registro viene incompleto, y dice cuantos', () => {
    const file = valid()
    file.data.setLogs.push({ id: 'roto', sessionId: 's1' })
    file.data.routines.push({ name: 'sin id' })
    const result = parseBackup(JSON.stringify(file))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('2 registros')
  })

  it('rechaza pesos que no son numeros', () => {
    const file = valid()
    file.data.setLogs[0].weightKg = 'mucho'
    expect(parseBackup(JSON.stringify(file)).ok).toBe(false)
  })

  it('acepta un respaldo al que le falta una coleccion vacia', () => {
    const file = valid()
    delete file.data.sessionNotes
    const result = parseBackup(JSON.stringify(file))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.backup.data.sessionNotes).toEqual([])
  })
})

describe('summarizeBackup', () => {
  it('cuenta lo que trae el archivo', () => {
    expect(summarizeBackup(buildBackup(sampleTables(), 7))).toEqual({
      exportedAt: 7,
      routines: 1,
      exercises: 1,
      sessions: 1,
      sets: 1,
      records: 1,
    })
  })
})

describe('backupFileName', () => {
  it('lleva la fecha del dia', () => {
    expect(backupFileName(new Date(2026, 8, 5, 22, 30).getTime())).toBe(
      'lusito-gym-2026-09-05.gymbackup.json',
    )
  })
})

describe('recordatorio de respaldo', () => {
  const now = 100 * DAY

  it('avisa si pasaron mas de 30 dias desde el ultimo respaldo', () => {
    expect(backupReminderDue({ lastExportAt: now - 31 * DAY, firstActivityAt: 0, now })).toBe(true)
    expect(backupReminderDue({ lastExportAt: now - 29 * DAY, firstActivityAt: 0, now })).toBe(false)
  })

  it('sin respaldo previo cuenta desde el primer entrenamiento', () => {
    expect(backupReminderDue({ lastExportAt: null, firstActivityAt: now - 40 * DAY, now })).toBe(true)
    expect(backupReminderDue({ lastExportAt: null, firstActivityAt: now - 3 * DAY, now })).toBe(false)
  })

  it('sin entrenamientos no hay nada que respaldar', () => {
    expect(backupReminderDue({ lastExportAt: null, firstActivityAt: null, now })).toBe(false)
  })

  it('cuenta dias completos', () => {
    expect(daysSince(now - 2.5 * DAY, now)).toBe(2)
    expect(daysSince(now + DAY, now)).toBe(0)
  })
})
