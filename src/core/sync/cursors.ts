/**
 * Marcadores de sincronizacion guardados en este dispositivo: hasta donde ya
 * bajo cada coleccion y cuando la bajo completa por ultima vez.
 * Ver src/core/logic/deltaSync.ts para la explicacion completa.
 */
import { cursorKey, fullLoadKey, parseCursor } from '@/core/logic/deltaSync'

function read(key: string): number | null {
  try {
    return parseCursor(localStorage.getItem(key))
  } catch {
    return null
  }
}

function write(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* sin espacio o modo privado: la proxima vez simplemente se baja todo */
  }
}

export const readCursor = (uid: string, name: string) => read(cursorKey(uid, name))
export const writeCursor = (uid: string, name: string, value: number) => write(cursorKey(uid, name), value)
export const readLastFullLoad = (uid: string, name: string) => read(fullLoadKey(uid, name))
export const writeLastFullLoad = (uid: string, name: string, value: number) =>
  write(fullLoadKey(uid, name), value)

/**
 * Olvida los marcadores (de una cuenta, o de todas): la proxima vez que abra,
 * la app vuelve a bajar todo de la nube.
 */
export function clearSyncCursors(uid?: string): void {
  try {
    const prefix = uid ? `lgt.sync.${uid}.` : 'lgt.sync.'
    const keys: string[] = []
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* nada que hacer */
  }
}
