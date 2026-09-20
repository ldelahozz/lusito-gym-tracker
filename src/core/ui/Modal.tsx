import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from './cn'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

/** Ventana emergente sobre superficie elevada. Nunca usa dialogos nativos claros. */
export function Modal({ open, onClose, title, description, children, footer, className }: Props) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-canvas/80 backdrop-blur-[2px] md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'w-full md:max-w-md bg-elevated border border-line',
          'rounded-t-card md:rounded-card',
          'p-5 pb-6 md:pb-5 flex flex-col gap-4',
          'animate-[modal-in_180ms_ease-out]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">{title}</h2>
            {description && <p className="text-sm text-muted mt-1 leading-relaxed">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 grid place-items-center size-9 -mr-1 -mt-1 rounded-full text-muted hover:text-text hover:bg-surface"
          >
            <X size={18} />
          </button>
        </div>

        {children}

        {footer && <div className="flex gap-3 justify-end pt-1">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
