import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Award, Check } from 'lucide-react'
import { ToastContext, type ToastAction, type ToastKind } from './toast-context'
import { cn } from './cn'

type Toast = { id: number; message: string; kind: ToastKind; action?: ToastAction }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'info', action?: ToastAction) => {
      const id = nextId.current++
      // Maximo tres a la vez: el mas viejo se va.
      setToasts((current) => [...current.slice(-2), { id, message, kind, action }])
      setTimeout(() => dismiss(id), action ? 5000 : 2600)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* En el celular salen arriba: abajo estan el descanso y los botones que mas se tocan. */}
      <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.25rem)] md:top-auto md:bottom-8 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'flex items-center gap-2.5 max-w-sm pl-2.5 py-2.5 rounded-full',
              toast.action ? 'pr-2' : 'pr-4',
              'surface-glass border border-line shadow-[0_12px_30px_-12px_rgb(0_0_0/0.9)]',
              'text-sm animate-[toast-in_220ms_var(--ease-spring)]',
              toast.kind === 'record' && 'border-violet-dim animate-glow',
            )}
          >
            {toast.kind === 'record' ? (
              <span className="grid place-items-center size-8 shrink-0 rounded-full bg-violet-soft text-violet animate-pop">
                <Award size={17} />
              </span>
            ) : (
              <span className="grid place-items-center size-7 shrink-0 rounded-full bg-accent-soft text-accent">
                <Check size={15} />
              </span>
            )}
            <span className="min-w-0">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  dismiss(toast.id)
                  toast.action?.onAction()
                }}
                className="pointer-events-auto shrink-0 -my-1.5 ml-1 h-10 px-3.5 rounded-full surface-key text-sm font-semibold text-accent-hi active:scale-95 transition-transform duration-100"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
