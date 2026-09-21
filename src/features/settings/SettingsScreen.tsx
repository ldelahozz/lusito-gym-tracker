import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { ConfirmDialog } from '@/core/ui/ConfirmDialog'
import { Screen } from '@/core/ui/Screen'
import { useAuth } from '@/features/auth/auth-context'
import { BackupCard } from './BackupCard'
import { DangerZone } from './DangerZone'
import { InstallCard } from './InstallCard'
import { PreferencesCard } from './PreferencesCard'

function initialsOf(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || '?'
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase()
}

export function SettingsScreen() {
  const { user, signOut } = useAuth()
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)

  return (
    <Screen title="Ajustes" description="Tu cuenta, tus preferencias y tus respaldos.">
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start">
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted px-1">Cuenta</h2>
          <Card className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid place-items-center size-11 rounded-full bg-accent-soft text-accent font-semibold shrink-0">
                {initialsOf(user?.displayName ?? null, user?.email ?? null)}
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-medium truncate">{user?.displayName ?? 'Tu cuenta'}</p>
                <p className="text-sm text-muted truncate">{user?.email ?? ''}</p>
              </div>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Todo lo que registras queda guardado solo en tu cuenta. Nadie más puede verlo, ni siquiera
              quien use esta misma app con otra cuenta.
            </p>
            <Button onClick={() => setConfirmingSignOut(true)}>
              <LogOut size={18} />
              Cerrar sesión
            </Button>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted px-1">Entrenamiento</h2>
          <PreferencesCard />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted px-1">Respaldo</h2>
          <BackupCard />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted px-1">Aplicación</h2>
          <InstallCard />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted px-1">Borrado definitivo</h2>
          <DangerZone />
        </section>
      </div>

      <ConfirmDialog
        open={confirmingSignOut}
        title="Cerrar sesión"
        description="Se borrará la copia de tus datos guardada en este dispositivo. Todo sigue a salvo en la nube y vuelve al entrar de nuevo. Necesitarás internet para volver a entrar."
        confirmLabel="Cerrar sesión"
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={() => void signOut()}
      />
    </Screen>
  )
}
