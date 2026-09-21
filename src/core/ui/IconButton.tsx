import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from './cn'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon
  label: string
  size?: number
  active?: boolean
}

/** Boton solo de icono. Siempre de 44 px o mas para poder tocarlo bien. */
export function IconButton({ icon: Icon, label, size = 20, active, className, ...props }: Props) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={cn(
        'grid place-items-center size-11 shrink-0 rounded-control transition-[color,background-color,transform] duration-150 active:scale-90',
        'disabled:opacity-30 disabled:pointer-events-none',
        active ? 'text-accent bg-accent-soft' : 'text-muted hover:text-text hover:bg-elevated',
        className,
      )}
    >
      <Icon size={size} strokeWidth={1.75} />
    </button>
  )
}
