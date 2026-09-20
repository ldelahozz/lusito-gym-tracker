import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isFirebaseConfigured } from '@/core/firebase'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/auth-context'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { SetupNeededScreen } from '@/features/auth/SetupNeededScreen'
import { ProgressScreen } from '@/features/progress/ProgressScreen'
import { RoutinesScreen } from '@/features/routines/RoutinesScreen'
import { TrainScreen } from '@/features/session/TrainScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { AppShell } from './AppShell'
import { LoadingScreen } from './LoadingScreen'

/** Decide que mostrar segun si ya iniciaste sesion. Funciona tambien sin internet. */
function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'signed-out') return <LoginScreen />
  return <>{children}</>
}

export function App() {
  if (!isFirebaseConfigured) return <SetupNeededScreen />

  return (
    <AuthProvider>
      <AuthGate>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/entrenar" element={<TrainScreen />} />
              <Route path="/rutinas" element={<RoutinesScreen />} />
              <Route path="/progreso" element={<ProgressScreen />} />
              <Route path="/ajustes" element={<SettingsScreen />} />
            </Route>
            <Route path="*" element={<Navigate to="/entrenar" replace />} />
          </Routes>
        </HashRouter>
      </AuthGate>
    </AuthProvider>
  )
}
