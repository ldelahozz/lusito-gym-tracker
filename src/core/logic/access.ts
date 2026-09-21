/**
 * Lista de invitados: solo pueden usar la app los correos que el dueño agrega.
 *
 * La proteccion de verdad esta en las reglas de Firebase (firestore.rules):
 * sin invitacion, la nube no deja leer ni escribir nada. Esto solo decide que
 * pantalla mostrar, y nunca deja fuera a alguien por estar sin internet.
 */

export type Access = 'admin' | 'guest' | 'denied' | 'unknown'

/** Resultado de buscar tu correo en la lista de invitados. */
export type GuestCheck =
  | { kind: 'found'; admin: boolean }
  | { kind: 'missing' }
  /** Sin internet, o la nube todavia no tiene la lista configurada. */
  | { kind: 'error' }

export function accessFrom(check: GuestCheck, previous: Access | null): Access {
  if (check.kind === 'found') return check.admin ? 'admin' : 'guest'
  if (check.kind === 'missing') return 'denied'
  // Si no se pudo revisar, se confia en lo ultimo que se supo.
  return previous ?? 'unknown'
}

/** Solo se bloquea la app cuando la nube confirmo que tu correo no esta invitado. */
export function canUseApp(access: Access): boolean {
  return access !== 'denied'
}

export function parseAccess(raw: string | null): Access | null {
  return raw === 'admin' || raw === 'guest' || raw === 'denied' ? raw : null
}

/** Los correos se guardan siempre igual: sin espacios y en minusculas. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Revision sencilla: algo@algo.algo, sin espacios ni diagonales. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(normalizeEmail(email))
}
