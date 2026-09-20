import { createContext, useContext } from 'react'

export type ToastKind = 'info' | 'record'

export type ToastValue = {
  /** Muestra un aviso breve en la parte baja de la pantalla. */
  showToast: (message: string, kind?: ToastKind) => void
}

export const ToastContext = createContext<ToastValue | null>(null)

export function useToast(): ToastValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return value
}
