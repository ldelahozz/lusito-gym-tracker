import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out'

export type AuthValue = {
  status: AuthStatus
  user: User | null
  error: string | null
  signingIn: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return value
}
