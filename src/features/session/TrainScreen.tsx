import { Dumbbell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/core/ui/Button'
import { EmptyState } from '@/core/ui/EmptyState'
import { Screen } from '@/core/ui/Screen'

export function TrainScreen() {
  const navigate = useNavigate()

  return (
    <Screen title="Entrenar" description="Elige una rutina para empezar la sesion de hoy.">
      <EmptyState
        icon={Dumbbell}
        title="Todavia no hay rutinas"
        description="Crea tu primera rutina para poder empezar a entrenar."
        action={
          <Button variant="primary" onClick={() => navigate('/rutinas')}>
            Ir a Rutinas
          </Button>
        }
      />
    </Screen>
  )
}
