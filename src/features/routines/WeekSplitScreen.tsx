import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight, Dumbbell, Moon } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { EmptyState } from '@/core/ui/EmptyState'
import { Modal } from '@/core/ui/Modal'
import { Screen } from '@/core/ui/Screen'
import { cn } from '@/core/ui/cn'
import {
  WEEKDAYS,
  isSplitEmpty,
  normalizeSplit,
  setDayRoutine,
  weekdayIndex,
} from '@/core/logic/weekPlan'
import { useData } from '@/core/sync/data-context'
import { listRoutines } from '@/core/sync/selectors'

export function WeekSplitScreen() {
  const { state, settings, save } = useData()
  const navigate = useNavigate()
  const [editingDay, setEditingDay] = useState<number | null>(null)

  const routines = useMemo(() => listRoutines(state), [state])
  const split = useMemo(() => normalizeSplit(settings.weeklySplit), [settings.weeklySplit])
  const today = weekdayIndex(new Date())

  const assign = (dayIndex: number, routineId: string | null) => {
    save('settings', { ...settings, weeklySplit: setDayRoutine(split, dayIndex, routineId) })
    setEditingDay(null)
  }

  const nameOf = (routineId: string | null) =>
    routines.find((routine) => routine.id === routineId)?.name ?? null

  return (
    <Screen
      title="Split semanal"
      description="Asigna una rutina a cada dia. Los dias sin rutina son descanso."
      actions={
        <Button variant="ghost" onClick={() => navigate('/rutinas')}>
          <ArrowLeft size={18} />
          Rutinas
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-4">
        {routines.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Primero crea una rutina"
            description="Cuando tengas rutinas podras repartirlas en la semana."
            action={
              <Button variant="primary" onClick={() => navigate('/rutinas')}>
                Ir a Rutinas
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {WEEKDAYS.map((day, index) => {
                const name = nameOf(split[index])
                const isToday = index === today
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setEditingDay(index)}
                    className={cn(
                      'w-full flex items-center gap-3 min-h-16 px-4 py-3 rounded-card text-left',
                      'bg-surface border transition-colors duration-150',
                      isToday ? 'border-accent-dim' : 'border-line hover:border-accent-dim',
                    )}
                  >
                    <span className="w-20 shrink-0">
                      <span
                        className={cn(
                          'block text-sm',
                          isToday ? 'text-accent font-medium' : 'text-muted',
                        )}
                      >
                        {day}
                      </span>
                      {isToday && <span className="block text-[11px] text-muted">Hoy</span>}
                    </span>

                    <span className="flex-1 min-w-0">
                      {name ? (
                        <span className="block text-[15px] truncate">{name}</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[15px] text-muted">
                          <Moon size={15} />
                          Descanso
                        </span>
                      )}
                    </span>

                    <ChevronRight size={18} className="text-muted shrink-0" />
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-muted px-1">
              Una misma rutina puede ir en varios dias. Esto no te obliga a nada: siempre puedes
              entrenar otra rutina cualquier dia.
            </p>

            {!isSplitEmpty(split) && (
              <Button variant="primary" size="lg" onClick={() => navigate('/entrenar')}>
                <Check size={20} />
                Listo
              </Button>
            )}
          </>
        )}
      </div>

      <Modal
        open={editingDay !== null}
        onClose={() => setEditingDay(null)}
        title={editingDay === null ? '' : WEEKDAYS[editingDay]}
        description="Que toca este dia"
      >
        <div className="flex flex-col gap-2">
          {routines.map((routine) => {
            const selected = editingDay !== null && split[editingDay] === routine.id
            return (
              <button
                key={routine.id}
                type="button"
                onClick={() => editingDay !== null && assign(editingDay, routine.id)}
                className={cn(
                  'w-full flex items-center gap-3 h-14 px-4 rounded-control text-left',
                  'border transition-colors duration-150',
                  selected ? 'bg-accent-soft border-accent-dim text-accent' : 'bg-surface border-line',
                )}
              >
                <span className="flex-1 min-w-0 truncate text-[15px]">{routine.name}</span>
                {selected && <Check size={18} className="shrink-0" />}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => editingDay !== null && assign(editingDay, null)}
            className={cn(
              'w-full flex items-center gap-3 h-14 px-4 rounded-control text-left',
              'border transition-colors duration-150',
              editingDay !== null && split[editingDay] === null
                ? 'bg-accent-soft border-accent-dim text-accent'
                : 'bg-surface border-line text-muted',
            )}
          >
            <Moon size={16} className="shrink-0" />
            <span className="flex-1 min-w-0 truncate text-[15px]">Descanso</span>
            {editingDay !== null && split[editingDay] === null && (
              <Check size={18} className="shrink-0" />
            )}
          </button>
        </div>
      </Modal>
    </Screen>
  )
}
