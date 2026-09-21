/**
 * Sincronizacion por cambios: al abrir la app solo se baja de la nube lo que
 * cambio desde la ultima vez, no todo el historial.
 *
 * Como funciona:
 *  - Cada escritura lleva `syncedAt`, la hora en que la nube la recibio (la
 *    pone el servidor, asi que no depende del reloj de cada dispositivo).
 *  - Cada dispositivo recuerda, por coleccion, la `syncedAt` mas alta que ya
 *    vio: su "marcador".
 *  - Al abrir, lo que ya tiene se lee de la memoria del dispositivo (gratis) y
 *    a la nube solo se le piden los registros con `syncedAt` mayor al marcador.
 *
 * Los registros viejos, de antes de este cambio, no tienen `syncedAt`: ya
 * estan en la memoria del dispositivo, y si alguien los edita, ganan uno.
 *
 * Aqui vive solo la parte pura (sin Firebase), para poder probarla.
 */

/**
 * Colchon al pedir cambios: se vuelven a pedir los ultimos 10 minutos por si
 * acaso. Cuesta unas pocas lecturas y cubre cualquier retraso de la conexion.
 */
export const CURSOR_MARGIN_MS = 10 * 60_000

/**
 * Red de seguridad: una vez al mes cada dispositivo vuelve a bajar todo, por
 * si algun cambio se hubiera escapado. Cuesta poco y corrige cualquier cosa.
 */
export const FULL_RESYNC_MS = 30 * 86_400_000

/** true si esta vez hay que bajar la coleccion completa en lugar de solo los cambios. */
export function needsFullLoad(params: {
  cursor: number | null
  lastFullAt: number | null
  now: number
}): boolean {
  const { cursor, lastFullAt, now } = params
  if (cursor === null || lastFullAt === null) return true
  return now - lastFullAt > FULL_RESYNC_MS || lastFullAt > now
}

/** Desde cuando pedir cambios a la nube, a partir del marcador guardado. */
export function deltaSince(cursor: number): number {
  return Math.max(0, cursor - CURSOR_MARGIN_MS)
}

/**
 * Nuevo marcador tras recibir registros confirmados por la nube.
 * Nunca retrocede. Si no habia marcador y no llego nada con `syncedAt`,
 * queda en 0: "todo lo que tenga syncedAt es nuevo para mi".
 */
export function advanceCursor(current: number | null, seen: readonly number[]): number {
  let next = current ?? 0
  for (const value of seen) {
    if (Number.isFinite(value) && value > next) next = value
  }
  return next
}

/** Nombre con el que se guarda el marcador de una coleccion en este dispositivo. */
export function cursorKey(uid: string, collection: string): string {
  return `lgt.sync.${uid}.${collection}`
}

/** Nombre con el que se guarda cuando se bajo completa por ultima vez. */
export function fullLoadKey(uid: string, collection: string): string {
  return `lgt.sync.${uid}.${collection}.full`
}

/** Lee un marcador guardado; null si no hay o esta dañado. */
export function parseCursor(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : null
}

/**
 * Registro borrado para siempre desde Ajustes. En lugar de desaparecer de la
 * nube sin avisar, queda una marca vacia (sin datos) para que los demas
 * dispositivos se enteren y lo quiten de su memoria.
 */
export type Tombstone = {
  id: string
  deleted: true
  purged: true
}

export function isPurged(data: object | null | undefined): boolean {
  return (data as { purged?: unknown } | null | undefined)?.purged === true
}

/** Quita los campos que solo sirven para sincronizar y no deben llegar a la pantalla. */
export function withoutSyncMarks<T extends Record<string, unknown>>(data: T): Omit<T, 'syncedAt'> {
  const copy = { ...data }
  delete copy.syncedAt
  return copy
}
