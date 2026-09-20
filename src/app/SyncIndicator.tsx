import { useData } from '@/core/sync/data-context'
import { cn } from '@/core/ui/cn'

const LABELS = {
  synced: 'Sincronizado',
  syncing: 'Sincronizando',
  offline: 'Sin conexion',
} as const

const DOT = {
  synced: 'bg-accent',
  syncing: 'bg-accent animate-pulse',
  offline: 'bg-muted/50',
} as const

/**
 * Punto discreto de estado. Nunca bloquea nada: sin conexion todo se guarda
 * igual en el dispositivo y sube solo cuando vuelve la señal.
 */
export function SyncIndicator({ withLabel = false }: { withLabel?: boolean }) {
  const { status } = useData()
  const label = LABELS[status]

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted" title={label}>
      <span aria-hidden="true" className={cn('size-2 rounded-full', DOT[status])} />
      <span className={withLabel ? 'inline' : 'sr-only'}>{label}</span>
    </span>
  )
}
