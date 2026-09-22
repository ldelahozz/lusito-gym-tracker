import { createContext, useContext } from 'react'

export type ToastKind = 'info' | 'record'

/** Boton dentro del aviso, por ejemplo "Deshacer". */
export type ToastAction = {
  label: string
  onAction: () => void
}

export type ToastValue = {
  /** Muestra un aviso breve. Con accion, dura un poco mas para alcanzar a tocarla. */
  showToast: (message: string, kind?: ToastKind, action?: ToastAction) => void
}

export const ToastContext = createContext<ToastValue | null>(null)

export function useToast(): ToastValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return value
}
