/**
 * Videos de referencia de cada ejercicio.
 *
 * Se guardan SOLO en este dispositivo (en el almacenamiento del navegador),
 * nunca en la nube: asi no hace falta registrar tarjeta en Firebase ni pagar
 * espacio. Funcionan sin internet, pero no se sincronizan ni entran al respaldo.
 */

const DB_NAME = 'lusito-gym-videos'
const DB_VERSION = 1
const STORE = 'videos'

/** Tope razonable para no llenar el telefono: videos cortos de referencia. */
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024

export type StoredVideo = {
  exerciseId: string
  blob: Blob
  name: string
  type: string
  size: number
  savedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'exerciseId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = action(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => db.close()
      }),
  )
}

export async function saveVideo(exerciseId: string, file: File): Promise<StoredVideo> {
  const record: StoredVideo = {
    exerciseId,
    blob: file,
    name: file.name,
    type: file.type,
    size: file.size,
    savedAt: Date.now(),
  }
  await run('readwrite', (store) => store.put(record))
  return record
}

export async function getVideo(exerciseId: string): Promise<StoredVideo | null> {
  try {
    const result = await run<StoredVideo | undefined>('readonly', (store) => store.get(exerciseId))
    return result ?? null
  } catch {
    return null
  }
}

export async function deleteVideo(exerciseId: string): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(exerciseId))
  } catch {
    /* ignorado */
  }
}

export async function listVideoExerciseIds(): Promise<string[]> {
  try {
    const keys = await run<IDBValidKey[]>('readonly', (store) => store.getAllKeys())
    return keys.map(String)
  } catch {
    return []
  }
}

/** 12345678 -> "12 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${Math.round(bytes / (1024 * 1024))} MB`
}
