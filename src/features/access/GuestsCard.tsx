import { useEffect, useState } from 'react'
import { deleteDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { Crown, UserPlus, X } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { ConfirmDialog } from '@/core/ui/ConfirmDialog'
import { IconButton } from '@/core/ui/IconButton'
import { Input } from '@/core/ui/Input'
import { useToast } from '@/core/ui/toast-context'
import { getFirebase } from '@/core/firebase'
import { isValidEmail, normalizeEmail } from '@/core/logic/access'
import { useAuth } from '@/features/auth/auth-context'
import { guestRef, guestsRef, type Guest } from './guests'

/** Solo para el dueño: quien puede entrar a la app. */
export function GuestsCard() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [guests, setGuests] = useState<Guest[] | null>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Guest | null>(null)

  useEffect(
    () =>
      onSnapshot(
        guestsRef(getFirebase().db),
        (snapshot) => {
          const list = snapshot.docs.map((item) => ({ email: item.id, admin: item.data().admin === true }))
          // El dueño primero, luego en orden alfabetico.
          list.sort((a, b) => Number(b.admin) - Number(a.admin) || a.email.localeCompare(b.email))
          setGuests(list)
        },
        () => setGuests([]),
      ),
    [],
  )

  const invite = () => {
    const clean = normalizeEmail(email)
    if (!isValidEmail(clean)) {
      setError('Escribe un correo completo, como nombre@gmail.com.')
      return
    }
    if (guests?.some((guest) => guest.email === clean)) {
      setError('Ese correo ya está invitado.')
      return
    }
    setError(null)
    setEmail('')
    showToast(`Invitaste a ${clean}`)
    void setDoc(guestRef(getFirebase().db, clean), {
      email: clean,
      admin: false,
      addedAt: serverTimestamp(),
      addedBy: user?.email ?? '',
    }).catch(() => showToast('No se pudo guardar la invitación. Revisa tu conexión.'))
  }

  const confirmRemove = () => {
    if (!removing) return
    const target = removing
    setRemoving(null)
    showToast(`Quitaste a ${target.email}`)
    void deleteDoc(guestRef(getFirebase().db, target.email)).catch(() =>
      showToast('No se pudo quitar. Revisa tu conexión.'),
    )
  }

  return (
    <Card className="p-4 flex flex-col gap-4">
      <div>
        <p className="text-[15px] font-semibold">Lista de invitados</p>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Solo estos correos pueden entrar a la app. Cada quien tiene su propio espacio privado: tú no
          ves sus datos ni ellos los tuyos.
        </p>
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          invite()
        }}
      >
        <div className="flex gap-2">
          <Input
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            placeholder="correo@gmail.com"
            aria-label="Correo a invitar"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError(null)
            }}
          />
          <Button type="submit" variant="primary" className="shrink-0" disabled={email.trim() === ''}>
            <UserPlus size={17} />
            Invitar
          </Button>
        </div>
        {error && <p className="text-sm text-muted px-1">{error}</p>}
      </form>

      <div className="flex flex-col gap-1.5">
        {guests === null ? (
          <p className="text-sm text-muted px-1">Cargando la lista...</p>
        ) : guests.length === 0 ? (
          <p className="text-sm text-muted px-1">
            No se pudo leer la lista. Revisa tu conexión o que las reglas de Firebase estén al día.
          </p>
        ) : (
          guests.map((guest) => (
            <div
              key={guest.email}
              className="flex items-center gap-3 min-h-12 pl-3 pr-1 rounded-control surface-well"
            >
              <span className="flex-1 min-w-0 text-sm truncate">{guest.email}</span>
              {guest.admin ? (
                <span className="inline-flex items-center gap-1 mr-2 text-[11px] font-semibold uppercase tracking-wider text-violet">
                  <Crown size={13} />
                  Dueño
                </span>
              ) : (
                <IconButton icon={X} label={`Quitar a ${guest.email}`} size={17} onClick={() => setRemoving(guest)} />
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={removing !== null}
        title="Quitar invitado"
        description={`${removing?.email ?? ''} ya no podrá entrar ni sincronizar. Sus datos se quedan guardados en la nube, por si lo vuelves a invitar.`}
        confirmLabel="Quitar"
        onCancel={() => setRemoving(null)}
        onConfirm={confirmRemove}
      />
    </Card>
  )
}
