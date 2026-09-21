import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6">
      {Icon && (
        <span className="surface-hero grid place-items-center size-16 rounded-[22px] text-accent-hi">
          <Icon size={28} strokeWidth={1.6} />
        </span>
      )}
      <h2 className="text-xl font-bold tracking-tight text-text">{title}</h2>
      {description && <p className="text-sm text-muted max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
