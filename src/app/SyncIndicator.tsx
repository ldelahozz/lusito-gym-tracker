import { useOnlineStatus } from '@/core/sync/useOnlineStatus'
import { cn } from '@/core/ui/cn'

/**
 * Punto discreto de estado. Nunca bloquea nada:
 * azul = sincronizado, gris = sin conexion (los datos se guardan igual).
 */
export function SyncIndicator({ withLabel = false }: { withLabel?: boolean }) {
  const online = useOnlineStatus()
  const label = online ? 'Sincronizado' : 'Sin conexion'

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted" title={label}>
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', online ? 'bg-accent' : 'bg-muted/50')}
      />
      <span className={cn(withLabel ? 'inline' : 'sr-only')}>{label}</span>
    </span>
  )
}
