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
        <span className="grid place-items-center size-14 rounded-2xl bg-elevated text-muted">
          <Icon size={26} strokeWidth={1.5} />
        </span>
      )}
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {description && <p className="text-sm text-muted max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
