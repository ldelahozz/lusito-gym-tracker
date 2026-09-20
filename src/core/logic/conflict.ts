/**
 * Resolucion de conflictos de sincronizacion.
 *
 * Un conflicto ocurre cuando el MISMO registro se modifico en dos dispositivos
 * (por ejemplo: editas una serie en el celular sin señal y, mientras tanto,
 * cambias esa misma serie en la PC).
 *
 * Regla actual, pedida a proposito:
 *   GANA SIEMPRE LA VERSION ESCRITA DESDE UN CELULAR.
 *
 * Toda la regla vive aqui, en una funcion pura y probada. Cambiarla despues
 * (por ejemplo, "gana el mas reciente") es cambiar solo este archivo.
 */

export type DeviceKind = 'mobile' | 'desktop'

/** Lo minimo que necesita un registro para poder resolver un conflicto. */
export type SyncMeta = {
  /** Momento de la ultima escritura, en milisegundos del dispositivo que la hizo. */
  updatedAt: number
  /** Identificador del dispositivo que escribio. */
  deviceId: string
  /** Tipo de dispositivo que escribio. */
  deviceKind: DeviceKind
}

export type ConflictWinner = 'a' | 'b'

/**
 * Decide cual de las dos versiones debe prevalecer.
 *
 * Orden de criterios:
 *  1. Si vienen de tipos de dispositivo distintos, gana el celular.
 *  2. Si son del mismo tipo, gana la escritura mas reciente.
 *  3. Si tienen exactamente la misma hora, gana el deviceId mayor
 *     (desempate arbitrario pero fijo, para que todos los dispositivos
 *     lleguen al mismo resultado sin hablar entre ellos).
 */
export function resolveConflict(a: SyncMeta, b: SyncMeta): ConflictWinner {
  if (a.deviceKind !== b.deviceKind) {
    return a.deviceKind === 'mobile' ? 'a' : 'b'
  }

  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt > b.updatedAt ? 'a' : 'b'
  }

  if (a.deviceId !== b.deviceId) {
    return a.deviceId > b.deviceId ? 'a' : 'b'
  }

  return 'a'
}

/** Igual que resolveConflict, pero devuelve directamente el registro ganador. */
export function pickWinner<A extends SyncMeta, B extends SyncMeta>(a: A, b: B): A | B {
  return resolveConflict(a, b) === 'a' ? a : b
}

/**
 * true si la version local debe reescribirse sobre la remota que acaba de llegar.
 * Lo usa la capa de sincronizacion cuando Firestore entrega un cambio del otro dispositivo.
 */
export function shouldOverwriteRemote(local: SyncMeta, remote: SyncMeta): boolean {
  if (local.deviceId === remote.deviceId && local.updatedAt === remote.updatedAt) return false
  return resolveConflict(local, remote) === 'a'
}
