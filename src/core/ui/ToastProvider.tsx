import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Award, Check } from 'lucide-react'
import { ToastContext, type ToastKind } from './toast-context'
import { cn } from './cn'

type Toast = { id: number; message: string; kind: ToastKind }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, kind }])
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 2600)
  }, [])

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
              'flex items-center gap-2.5 max-w-sm pl-2.5 pr-4 py-2.5 rounded-full',
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
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
