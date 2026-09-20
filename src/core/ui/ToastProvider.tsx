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
      <div className="fixed inset-x-0 bottom-24 md:bottom-8 z-40 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'flex items-center gap-2 max-w-sm px-4 py-3 rounded-control',
              'bg-elevated border border-line shadow-lg shadow-black/40',
              'text-sm animate-[modal-in_180ms_ease-out]',
              toast.kind === 'record' && 'border-accent-dim',
            )}
          >
            {toast.kind === 'record' ? (
              <Award size={18} className="text-accent shrink-0" />
            ) : (
              <Check size={18} className="text-accent shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
