import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore'
import { getFirebase, googleProvider } from '@/core/firebase'
import { clearSyncCursors } from '@/core/sync/cursors'
import { clearSessionState } from '@/features/session/session-storage'
import { AuthContext, type AuthStatus } from './auth-context'

/** Traduce los codigos de error de Firebase a algo entendible. */
function describeError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Cerraste la ventana de Google antes de terminar. Intenta de nuevo.'
    case 'auth/network-request-failed':
      return 'No hay conexión a internet. Conéctate una vez para entrar; después la app funciona sin internet.'
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase. Agrégalo en Authentication > Settings > Authorized domains.'
    case 'auth/operation-not-allowed':
      return 'Falta activar el acceso con Google en Firebase (Authentication > Sign-in method).'
    default:
      return 'No se pudo entrar. Intenta de nuevo.'
  }
}

/** Errores en los que conviene reintentar con redireccion en lugar de ventana emergente. */
const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
])

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    const { auth } = getFirebase()

    // Si volvimos de entrar por redireccion, recoge el resultado (o el error).
    getRedirectResult(auth).catch((err) => setError(describeError(err)))

    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser)
        setStatus(nextUser ? 'signed-in' : 'signed-out')
        setSigningIn(false)
      },
      (err) => {
        setError(describeError(err))
        setStatus('signed-out')
        setSigningIn(false)
      },
    )
  }, [])

  const signIn = useCallback(async () => {
    const { auth } = getFirebase()
    setError(null)
    setSigningIn(true)
    try {
      await signInWithPopup(auth, googleProvider())
    } catch (err) {
      const code = (err as { code?: string })?.code ?? ''
      if (REDIRECT_FALLBACK_CODES.has(code)) {
        try {
          await signInWithRedirect(auth, googleProvider())
          return
        } catch (redirectError) {
          setError(describeError(redirectError))
        }
      } else {
        setError(describeError(err))
      }
      setSigningIn(false)
    }
  }, [])

  /**
   * Cierra sesion y borra la copia local de los datos en este dispositivo,
   * para que nunca se mezclen los datos de dos cuentas en el mismo equipo.
   */
  const signOut = useCallback(async () => {
    const { auth, db } = getFirebase()
    await firebaseSignOut(auth)
    // El descanso en curso y la pantalla del entrenamiento tampoco pasan a la otra cuenta.
    clearSessionState()
    // La copia local se borra abajo: los marcadores de "hasta donde ya baje" tambien.
    clearSyncCursors()
    try {
      await terminate(db)
      await clearIndexedDbPersistence(db)
    } catch {
      /* si no se puede limpiar, la recarga igual deja la app en estado limpio */
    }
    window.location.reload()
  }, [])

  const value = useMemo(
    () => ({ status, user, error, signingIn, signIn, signOut }),
    [status, user, error, signingIn, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
