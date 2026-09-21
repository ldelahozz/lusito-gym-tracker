import { createContext, useContext } from 'react'
import type { Access } from '@/core/logic/access'

export type AccessValue = {
  access: Access
  /** true solo para el dueño: puede invitar y quitar personas. */
  isAdmin: boolean
}

export const AccessContext = createContext<AccessValue>({ access: 'unknown', isAdmin: false })

export function useAccess(): AccessValue {
  return useContext(AccessContext)
}
