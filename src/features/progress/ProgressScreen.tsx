import { TrendingUp } from 'lucide-react'
import { EmptyState } from '@/core/ui/EmptyState'
import { Screen } from '@/core/ui/Screen'

export function ProgressScreen() {
  return (
    <Screen title="Progreso" description="Tus semanas, tus records y el historial de sesiones.">
      <EmptyState
        icon={TrendingUp}
        title="Sin datos todavia"
        description="Cuando registres entrenamientos, aqui apareceran tus graficas y records."
      />
    </Screen>
  )
}
