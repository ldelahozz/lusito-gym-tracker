import { ListChecks } from 'lucide-react'
import { EmptyState } from '@/core/ui/EmptyState'
import { Screen } from '@/core/ui/Screen'

export function RoutinesScreen() {
  return (
    <Screen title="Rutinas" description="Arma y ordena tus rutinas. Se sincronizan solas con el celular.">
      <EmptyState
        icon={ListChecks}
        title="Aun no hay rutinas"
        description="En el siguiente paso podras crear rutinas, agregarles ejercicios y ordenarlos."
      />
    </Screen>
  )
}
