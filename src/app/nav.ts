import { Dumbbell, ListChecks, Settings, TrendingUp, type LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/entrenar', label: 'Entrenar', icon: Dumbbell },
  { to: '/rutinas', label: 'Rutinas', icon: ListChecks },
  { to: '/progreso', label: 'Progreso', icon: TrendingUp },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]
