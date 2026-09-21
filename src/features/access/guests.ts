/**
 * Lista de invitados en Firebase: una coleccion "guests" con un documento por
 * correo invitado. El del dueño lleva admin: true (se crea a mano, una vez,
 * desde la consola de Firebase). Las reglas de firestore.rules la hacen valer.
 */
import { collection, doc, type Firestore } from 'firebase/firestore'
import { normalizeEmail } from '@/core/logic/access'

export const GUESTS = 'guests'

export type Guest = {
  email: string
  admin?: boolean
}

export const guestsRef = (db: Firestore) => collection(db, GUESTS)
export const guestRef = (db: Firestore, email: string) => doc(db, GUESTS, normalizeEmail(email))

/** Lo ultimo que se supo del acceso de una cuenta en este dispositivo. */
export const accessKey = (uid: string) => `lgt.access.${uid}`
