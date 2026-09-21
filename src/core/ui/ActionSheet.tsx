import type { LucideIcon } from 'lucide-react'
import { Modal } from './Modal'
import { cn } from './cn'

export type SheetAction = {
  icon: LucideIcon
  label: string
  onSelect: () => void
  disabled?: boolean
  /** Se muestra apagado y separado: para acciones que quitan algo. */
  subtle?: boolean
}

type Props = {
  open: boolean
  title: string
  description?: string
  actions: SheetAction[]
  onClose: () => void
}

/** Menu de acciones con nombre, que sube desde abajo. Reemplaza filas de iconos sueltos. */
export function ActionSheet({ open, title, description, actions, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="flex flex-col gap-1.5 -mx-1">
        {actions.map(({ icon: Icon, label, onSelect, disabled, subtle }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => {
              onClose()
              onSelect()
            }}
            className={cn(
              'flex items-center gap-3 h-13 px-3 rounded-control text-left text-[15px]',
              'transition-[background-color,transform] duration-150 active:scale-[0.98]',
              'hover:bg-white/[0.04] disabled:opacity-35 disabled:pointer-events-none',
              subtle && 'text-muted',
            )}
          >
            <span className="grid place-items-center size-9 rounded-[11px] surface-key shrink-0">
              <Icon size={17} className={subtle ? 'text-muted' : 'text-accent-hi'} />
            </span>
            {label}
          </button>
        ))}
      </div>
    </Modal>
  )
}
