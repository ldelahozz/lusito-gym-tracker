import { Navigate, Route, Routes } from 'react-router-dom'
import { ExerciseProgress } from './ExerciseProgress'
import { ProgressHome } from './ProgressHome'
import { RoutineProgress } from './RoutineProgress'

/** Progreso: tus rutinas, cada rutina sesion contra sesion, y cada ejercicio a detalle. */
export function ProgressRoutes() {
  return (
    <Routes>
      <Route index element={<ProgressHome />} />
      <Route path="rutina/:routineId" element={<RoutineProgress />} />
      <Route path="ejercicio/:exerciseId" element={<ExerciseProgress />} />
      <Route path="*" element={<Navigate to="/progreso" replace />} />
    </Routes>
  )
}
