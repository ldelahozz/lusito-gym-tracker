import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getDoc } from 'firebase/firestore'
import { LogOut, MailQuestion } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { getFirebase } from '@/core/firebase'
import { accessFrom, canUseApp, parseAccess, type Access, type GuestCheck } from '@/core/logic/access'
import { AppMark } from '@/app/AppMark'
import { useAuth } from '@/features/auth/auth-context'
import { AccessContext } from './access-context'
import { accessKey, guestRef } from './guests'

function readAccess(uid: string): Access | null {
  try {
    return parseAccess(localStorage.getItem(accessKey(uid)))
  } catch {
    return null
  }
}

function writeAccess(uid: string, access: Access): void {
  try {
    if (access !== 'unknown') localStorage.setItem(accessKey(uid), access)
  } catch {
    /* modo privado: se vuelve a revisar la proxima vez */
  }
}

function NotInvitedScreen({ email }: { email: string }) {
  const { signOut } = useAuth()
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 gap-7 text-center">
      <AppMark size={60} />
      <div className="flex flex-col items-center gap-3 max-w-sm">
        <span className="grid place-items-center size-12 rounded-2xl bg-accent-soft text-accent-hi">
          <MailQuestion size={22} />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-shine">Esta app es por invitación</h1>
        <p className="text-sm text-muted leading-relaxed">
          Entraste como <span className="text-text font-medium break-all">{email}</span>. Pídele a quien
          te compartió la app que agregue este correo a su lista de invitados, y vuelve a abrirla.
        </p>
      </div>
      <Button onClick={() => void signOut()}>
        <LogOut size={18} />
        Entrar con otra cuenta
      </Button>
      <p className="text-xs text-muted max-w-xs leading-relaxed">
        ¿Eres el dueño de la app? Agrega tu correo a la lista de invitados en Firebase, como explica la
        guía del proyecto.
      </p>
    </div>
  )
}

/**
 * Revisa, sin detener la app, que tu correo este en la lista de invitados.
 * Mientras revisa (o si no hay internet) se usa lo ultimo que se supo: nunca
 * deja a nadie fuera por estar sin señal en el gimnasio.
 */
export function AccessGate({ uid, email, children }: { uid: string; email: string; children: ReactNode }) {
  const [access, setAccess] = useState<Access>(() => readAccess(uid) ?? 'unknown')

  useEffect(() => {
    let cancelled = false
    const check = async (): Promise<GuestCheck> => {
      try {
        const snapshot = await getDoc(guestRef(getFirebase().db, email))
        if (!snapshot.exists()) return { kind: 'missing' }
        return { kind: 'found', admin: snapshot.data()?.admin === true }
      } catch {
        // Sin internet, o la nube aun sin la lista configurada: no se bloquea a nadie.
        return { kind: 'error' }
      }
    }
    void check().then((result) => {
      if (cancelled) return
      setAccess((previous) => {
        const next = accessFrom(result, previous === 'unknown' ? null : previous)
        writeAccess(uid, next)
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [uid, email])

  const value = useMemo(() => ({ access, isAdmin: access === 'admin' }), [access])

  if (!canUseApp(access)) return <NotInvitedScreen email={email} />
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}
