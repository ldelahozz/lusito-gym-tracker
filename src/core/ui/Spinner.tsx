import { cn } from './cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        'inline-block size-5 rounded-full border-2 border-line border-t-accent animate-spin',
        className,
      )}
    />
  )
}
