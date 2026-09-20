import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isFirebaseConfigured } from '@/core/firebase'
import { DataProvider } from '@/core/sync/DataProvider'
import { useData } from '@/core/sync/data-context'
import { ToastProvider } from '@/core/ui/ToastProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/auth-context'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { SetupNeededScreen } from '@/features/auth/SetupNeededScreen'
import { ProgressScreen } from '@/features/progress/ProgressScreen'
import { ExerciseCatalogScreen } from '@/features/routines/ExerciseCatalogScreen'
import { RoutineEditor } from '@/features/routines/RoutineEditor'
import { WeekSplitScreen } from '@/features/routines/WeekSplitScreen'
import { RoutinesScreen } from '@/features/routines/RoutinesScreen'
import { TrainScreen } from '@/features/session/TrainScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { AppShell } from './AppShell'
import { LoadingScreen } from './LoadingScreen'

/** Espera a que lleguen los datos guardados en el dispositivo (es casi instantaneo). */
function DataGate({ children }: { children: ReactNode }) {
  const { state } = useData()
  if (!state.ready) return <LoadingScreen label="Abriendo tus datos" />
  return <>{children}</>
}

/** Decide que mostrar segun si ya iniciaste sesion. Funciona tambien sin internet. */
function AuthGate({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'signed-out' || !user) return <LoginScreen />
  return (
    <DataProvider uid={user.uid}>
      <DataGate>{children}</DataGate>
    </DataProvider>
  )
}

export function App() {
  if (!isFirebaseConfigured) return <SetupNeededScreen />

  return (
    <ToastProvider>
      <AuthProvider>
        <AuthGate>
          <HashRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/entrenar" element={<TrainScreen />} />
                <Route path="/rutinas" element={<RoutinesScreen />} />
                <Route path="/rutinas/ejercicios" element={<ExerciseCatalogScreen />} />
                <Route path="/rutinas/split" element={<WeekSplitScreen />} />
                <Route path="/rutinas/:routineId" element={<RoutineEditor />} />
                <Route path="/progreso" element={<ProgressScreen />} />
                <Route path="/ajustes" element={<SettingsScreen />} />
              </Route>
              <Route path="*" element={<Navigate to="/entrenar" replace />} />
            </Routes>
          </HashRouter>
        </AuthGate>
      </AuthProvider>
    </ToastProvider>
  )
}
