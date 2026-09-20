/**
 * Conexion con Firebase.
 *
 * Las claves NUNCA van escritas aqui: se leen de variables de entorno
 * (.env.local en tu PC, secrets del repositorio al publicar).
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  GoogleAuthProvider,
  type Auth,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} as const

export const missingFirebaseKeys: string[] = Object.entries(firebaseConfig)
  .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
  .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`)

export const isFirebaseConfigured = missingFirebaseKeys.length === 0

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined

/**
 * Crea (una sola vez) la conexion con Firebase.
 * Firestore queda con memoria local permanente: la app funciona sin internet
 * y lo que escribas sin señal se sube solo al reconectar.
 */
export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!isFirebaseConfigured) {
    throw new Error(`Faltan claves de Firebase: ${missingFirebaseKeys.join(', ')}`)
  }
  if (!app || !auth || !db) {
    app = initializeApp(firebaseConfig)

    auth = getAuth(app)
    // La sesion se mantiene indefinidamente, incluso sin internet.
    void setPersistence(auth, browserLocalPersistence).catch(() => undefined)

    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  }
  return { app, auth, db }
}

export function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider()
  // Permite elegir cuenta cada vez: util si tu mama o tu hermana entran en el mismo equipo.
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}
