import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { ConfirmDialog } from '@/core/ui/ConfirmDialog'
import { clearSyncCursors } from '@/core/sync/cursors'
import { useAuth } from '@/features/auth/auth-context'

/**
 * Boton de emergencia: olvida hasta donde se habia bajado y vuelve a pedir a la
 * nube todo el historial una vez. No borra nada.
 */
export function SyncCard() {
  const { user } = useAuth()
  const [confirming, setConfirming] = useState(false)

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div>
        <p className="text-[15px] font-semibold">Sincronización</p>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Al abrir, la app solo baja de la nube lo que cambió. Si algo no cuadra entre tu celular y tu
          PC, esto vuelve a bajar todo tu historial una vez. No borra nada.
        </p>
      </div>
      <Button className="self-start" onClick={() => setConfirming(true)}>
        <RefreshCw size={17} />
        Volver a bajar todo
      </Button>

      <ConfirmDialog
        open={confirming}
        title="Volver a bajar todo"
        description="La app se recarga y baja de nuevo todo tu historial. Necesitas internet. Tus datos no cambian."
        confirmLabel="Bajar todo"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          if (user) clearSyncCursors(user.uid)
          window.location.reload()
        }}
      />
    </Card>
  )
}
