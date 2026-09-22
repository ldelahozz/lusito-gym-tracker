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
      className="fixed inset-0 z-50 flex items-end justify-center bg-canvas/70 backdrop-blur-sm md:items-center md:p-6 animate-[fade-in_160ms_ease-out]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'relative w-full md:max-w-md surface-sheet',
          'rounded-t-[26px] md:rounded-card',
          'p-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-5 flex flex-col gap-4',
          'animate-[modal-in_180ms_ease-out]',
          className,
        )}
      >
        {/* Asa de arrastre: en el celular se ve como hoja que sube desde abajo. */}
        <span aria-hidden="true" className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight leading-tight">{title}</h2>
            {description && <p className="text-sm text-muted mt-1 leading-relaxed">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 grid place-items-center size-11 -mr-2 -mt-2 rounded-full text-muted hover:text-text hover:bg-surface"
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
