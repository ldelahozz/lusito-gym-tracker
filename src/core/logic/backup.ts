/**
 * Respaldo en archivo: exportar todo e importarlo despues.
 *
 * El archivo es JSON con una version de formato (schemaVersion), para que una
 * app futura sepa leer respaldos viejos y una app vieja rechace con claridad
 * un respaldo que no entiende.
 *
 * Importar nunca borra ni pisa nada: agrega lo que falta y recupera lo que
 * estaba borrado. Lo que ya tienes se queda como esta, aunque sea mas nuevo
 * que el respaldo.
 *
 * Los videos de los ejercicios viven solo en cada telefono: no van en el respaldo.
 */
import { COLLECTION_NAMES, type CollectionName } from '@/core/sync/collections'

export const BACKUP_APP = 'lusito-gym-tracker'
export const BACKUP_SCHEMA_VERSION = 1
export const BACKUP_REMINDER_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export type BackupDoc = { id: string; deleted?: boolean; [key: string]: unknown }

export type Tables = Record<CollectionName, Record<string, BackupDoc>>

export type BackupFile = {
  app: typeof BACKUP_APP
  schemaVersion: number
  exportedAt: number
  data: Record<CollectionName, BackupDoc[]>
}

/** Campos de sincronizacion: se generan de nuevo al importar, no hace falta guardarlos. */
const SYNC_KEYS = new Set(['updatedAt', 'deviceId', 'deviceKind', 'deleted'])

function stripSync(doc: BackupDoc): BackupDoc {
  const clean: BackupDoc = { id: doc.id }
  for (const [key, value] of Object.entries(doc)) {
    if (!SYNC_KEYS.has(key)) clean[key] = value
  }
  return clean
}

/** Todo lo que hay (sin lo borrado), listo para guardar en un archivo. */
export function buildBackup(tables: Tables, now: number): BackupFile {
  const data = {} as Record<CollectionName, BackupDoc[]>
  for (const name of COLLECTION_NAMES) {
    data[name] = Object.values(tables[name] ?? {})
      .filter((doc) => !doc.deleted)
      .map(stripSync)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }
  return { app: BACKUP_APP, schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: now, data }
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup)
}

/** "lusito-gym-2026-09-21.gymbackup.json", con la fecha del dispositivo. */
export function backupFileName(now: number): string {
  const date = new Date(now)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `lusito-gym-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.gymbackup.json`
}

type FieldType = 'string' | 'number'

/** Lo minimo que tiene que traer cada registro para no romper la app al leerlo. */
const REQUIRED: Record<CollectionName, Array<[string, FieldType]>> = {
  exercises: [['name', 'string']],
  routines: [['name', 'string']],
  routineExercises: [
    ['routineId', 'string'],
    ['exerciseId', 'string'],
  ],
  sessions: [
    ['routineId', 'string'],
    ['startedAt', 'number'],
  ],
  setLogs: [
    ['sessionId', 'string'],
    ['exerciseId', 'string'],
    ['weightKg', 'number'],
    ['reps', 'number'],
  ],
  sessionNotes: [
    ['sessionId', 'string'],
    ['exerciseId', 'string'],
  ],
  personalRecords: [
    ['exerciseId', 'string'],
    ['setLogId', 'string'],
  ],
  settings: [],
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidDoc(name: CollectionName, value: unknown): value is BackupDoc {
  if (!isObject(value)) return false
  if (typeof value.id !== 'string' || value.id.length === 0) return false
  return REQUIRED[name].every(([field, type]) => {
    const fieldValue = value[field]
    return type === 'number'
      ? typeof fieldValue === 'number' && Number.isFinite(fieldValue)
      : typeof fieldValue === 'string'
  })
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }

/** Lee y revisa un archivo. Si algo no cuadra, explica que paso en palabras simples. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Ese archivo no se puede leer. Elige un respaldo exportado desde la app.' }
  }

  if (!isObject(raw) || raw.app !== BACKUP_APP) {
    return { ok: false, error: 'Ese archivo no es un respaldo de Lusito Gym Tracker.' }
  }
  if (typeof raw.schemaVersion !== 'number' || !isObject(raw.data)) {
    return { ok: false, error: 'El respaldo esta danado: le faltan partes.' }
  }
  if (raw.schemaVersion > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'Este respaldo viene de una version mas nueva de la app. Actualizala y vuelve a intentarlo.',
    }
  }

  const source = raw.data
  const data = {} as Record<CollectionName, BackupDoc[]>
  let broken = 0
  for (const name of COLLECTION_NAMES) {
    const list = source[name] ?? []
    if (!Array.isArray(list)) {
      return { ok: false, error: 'El respaldo esta danado: le faltan partes.' }
    }
    data[name] = []
    for (const item of list) {
      if (isValidDoc(name, item)) data[name].push(item)
      else broken += 1
    }
  }

  if (broken > 0) {
    return {
      ok: false,
      error: `El respaldo esta danado: ${broken} ${broken === 1 ? 'registro tiene' : 'registros tienen'} datos incompletos. No se importo nada.`,
    }
  }

  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      schemaVersion: raw.schemaVersion,
      exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : 0,
      data,
    },
  }
}

export type BackupSummary = {
  exportedAt: number
  routines: number
  exercises: number
  sessions: number
  sets: number
  records: number
}

/** Lo que trae un respaldo, para mostrarlo antes de confirmar. */
export function summarizeBackup(backup: BackupFile): BackupSummary {
  return {
    exportedAt: backup.exportedAt,
    routines: backup.data.routines.length,
    exercises: backup.data.exercises.length,
    sessions: backup.data.sessions.length,
    sets: backup.data.setLogs.length,
    records: backup.data.personalRecords.length,
  }
}

export type ImportPlan = {
  writes: Array<{ collection: CollectionName; doc: BackupDoc }>
  /** No existian en este dispositivo ni en la nube. */
  added: number
  /** Existian pero estaban borrados: vuelven. */
  restored: number
  /** Ya los tienes: no se tocan. */
  kept: number
}

/** Que va a pasar al importar, sin tocar nada todavia. */
export function planImport(backup: BackupFile, current: Tables): ImportPlan {
  const plan: ImportPlan = { writes: [], added: 0, restored: 0, kept: 0 }
  for (const name of COLLECTION_NAMES) {
    for (const doc of backup.data[name]) {
      const existing = current[name]?.[doc.id]
      if (existing && !existing.deleted) {
        plan.kept += 1
        continue
      }
      plan.writes.push({ collection: name, doc: stripSync(doc) })
      if (existing) plan.restored += 1
      else plan.added += 1
    }
  }
  return plan
}

/** Dias completos desde una fecha. */
export function daysSince(timestamp: number, now: number): number {
  return Math.max(0, Math.floor((now - timestamp) / DAY_MS))
}

/**
 * true si toca recordar el respaldo: mas de 30 dias desde el ultimo.
 * Si nunca has exportado, se cuenta desde tu primer entrenamiento, para no
 * molestar el primer dia.
 */
export function backupReminderDue(params: {
  lastExportAt: number | null
  firstActivityAt: number | null
  now: number
}): boolean {
  const reference = params.lastExportAt ?? params.firstActivityAt
  if (reference === null) return false
  return params.now - reference > BACKUP_REMINDER_DAYS * DAY_MS
}
