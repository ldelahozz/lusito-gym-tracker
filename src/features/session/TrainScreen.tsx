import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Dumbbell, Moon, Play, Trophy } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Modal } from '@/core/ui/Modal'
import { Card } from '@/core/ui/Card'
import { EmptyState } from '@/core/ui/EmptyState'
import { Screen } from '@/core/ui/Screen'
import { formatDuration, formatWeight } from '@/core/logic/format'
import { WEEKDAYS, isSplitEmpty, normalizeSplit, weekdayIndex } from '@/core/logic/weekPlan'
import { newId } from '@/core/model/ids'
import type { Routine } from '@/core/model/types'
import { useData } from '@/core/sync/data-context'
import { listRoutineExercises, listRoutines } from '@/core/sync/selectors'
import { ActiveSession, type SessionSummary } from './ActiveSession'
import { clearSessionState } from './session-storage'

export function TrainScreen() {
  const { state, settings, save } = useData()
  const navigate = useNavigate()

  const activeSession = useMemo(
    () =>
      Object.values(state.sessions)
        .filter((session) => !session.deleted && session.endedAt === null)
        .sort((a, b) => b.startedAt - a.startedAt)[0],
    [state.sessions],
  )

  const routines = useMemo(() => listRoutines(state), [state])
  const [summary, setSummary] = useState<SessionSummary | null>(null)

  const split = useMemo(() => normalizeSplit(settings.weeklySplit), [settings.weeklySplit])
  const hasSplit = !isSplitEmpty(split)
  const todayIndex = weekdayIndex(new Date())
  // Una rutina archivada o borrada deja el dia como descanso.
  const todayRoutine = routines.find((routine) => routine.id === split[todayIndex]) ?? null
  const otherRoutines = todayRoutine
    ? routines.filter((routine) => routine.id !== todayRoutine.id)
    : routines

  if (activeSession) {
    return (
      <ActiveSession key={activeSession.id} session={activeSession} onFinished={setSummary} />
    )
  }

  const exerciseCountText = (routineId: string) => {
    const count = listRoutineExercises(state, routineId).length
    return count === 0 ? 'Sin ejercicios' : `${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`
  }

  const startSession = (routine: Routine) => {
    clearSessionState()
    save('sessions', {
      id: newId(),
      routineId: routine.id,
      startedAt: Date.now(),
      endedAt: null,
      pausedMs: 0,
      pausedAt: null,
    })
  }

  return (
    <Screen title="Entrenar" description="Elige la rutina de hoy y empieza.">
      {routines.length === 0 ? (
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
      ) : (
        <div className="flex flex-col gap-5">
          {hasSplit ? (
            <Card className="p-5 flex flex-col gap-4 border-accent-dim">
              <p className="text-xs uppercase tracking-wider text-muted">
                {WEEKDAYS[todayIndex]} &middot; Hoy toca
              </p>

              {todayRoutine ? (
                <>
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold truncate">{todayRoutine.name}</h2>
                    <p className="text-sm text-muted">{exerciseCountText(todayRoutine.id)}</p>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => startSession(todayRoutine)}
                    disabled={listRoutineExercises(state, todayRoutine.id).length === 0}
                  >
                    <Play size={20} />
                    Empezar
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Moon size={22} className="text-muted shrink-0" />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">Descanso</h2>
                    <p className="text-sm text-muted">Hoy no te toca entrenar.</p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate('/rutinas/split')}
                className="self-start text-xs text-muted hover:text-text transition-colors duration-150"
              >
                Cambiar el split semanal
              </button>
            </Card>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/rutinas/split')}
              className="flex items-center justify-center gap-2 h-14 rounded-card border border-dashed border-line text-muted hover:text-text hover:border-accent-dim transition-colors duration-150"
            >
              <CalendarDays size={18} />
              Arma tu split semanal
            </button>
          )}

          {otherRoutines.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="px-1 text-xs uppercase tracking-wider text-muted">
                {todayRoutine ? 'Otras rutinas' : 'Tus rutinas'}
              </h2>
              <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
                {otherRoutines.map((routine) => {
                  const count = listRoutineExercises(state, routine.id).length
                  return (
                    <Card key={routine.id} className="p-4 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium truncate">{routine.name}</p>
                        <p className="text-sm text-muted">{exerciseCountText(routine.id)}</p>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => startSession(routine)}
                        disabled={count === 0}
                      >
                        <Play size={18} />
                        Empezar
                      </Button>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <Modal
        open={summary !== null}
        onClose={() => setSummary(null)}
        title="Sesion terminada"
        description={summary?.routineName}
        footer={
          <Button variant="primary" onClick={() => setSummary(null)}>
            Listo
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-control bg-surface">
            <p className="text-xs text-muted">Duracion</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatDuration(summary?.durationMs ?? 0)}
            </p>
          </div>
          <div className="p-3 rounded-control bg-surface">
            <p className="text-xs text-muted">Series</p>
            <p className="text-lg font-semibold tabular-nums">{summary?.sets ?? 0}</p>
          </div>
          <div className="p-3 rounded-control bg-surface">
            <p className="text-xs text-muted">Volumen</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatWeight(Math.round(summary?.volume ?? 0))} kg
            </p>
          </div>
        </div>

        {(summary?.records ?? 0) > 0 && (
          <p className="flex items-center justify-center gap-2 h-11 rounded-control bg-accent-soft text-accent text-sm">
            <Trophy size={16} />
            {summary?.records === 1 ? '1 record nuevo' : `${summary?.records} records nuevos`}
          </p>
        )}
        </div>
      </Modal>
    </Screen>
  )
}
