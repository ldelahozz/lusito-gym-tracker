import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Dumbbell, Pencil } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { EmptyState } from '@/core/ui/EmptyState'
import { Screen } from '@/core/ui/Screen'
import { cn } from '@/core/ui/cn'
import { formatDate, formatDateTime } from '@/core/logic/format'
import {
  compareSets,
  exerciseHistory,
  finishedSessions,
  previousOf,
  trendBetween,
} from '@/core/logic/progress'
import { useData } from '@/core/sync/data-context'
import { exerciseName, listRoutineExercises } from '@/core/sync/selectors'
import { SessionDetail } from './SessionDetail'
import { SetCompareRow, TrendBadge } from './progress-ui'

export function RoutineProgress() {
  const { routineId = '' } = useParams()
  const navigate = useNavigate()
  const { state } = useData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const sets = useMemo(() => Object.values(state.setLogs), [state.setLogs])
  const sessions = useMemo(() => Object.values(state.sessions), [state.sessions])
  const routineSessions = useMemo(() => finishedSessions(sessions, routineId), [sessions, routineId])
  const newestFirst = useMemo(() => [...routineSessions].reverse(), [routineSessions])

  // Por defecto, la ultima sesion. Si la elegida se borra, se vuelve a la ultima.
  const selected = newestFirst.find((session) => session.id === selectedId) ?? newestFirst[0]
  const routineName = state.routines[routineId]?.name ?? 'Rutina'

  /** Ejercicios de la sesion elegida, cada uno comparado con su vez anterior en esta rutina. */
  const exercises = useMemo(() => {
    if (!selected) return []
    const planOrder = new Map(
      listRoutineExercises(state, routineId).map((link, index) => [link.exerciseId, index]),
    )
    const ids = [
      ...new Set(
        sets
          .filter((log) => !log.deleted && log.type === 'work' && log.sessionId === selected.id)
          .sort((a, b) => a.completedAt - b.completedAt)
          .map((log) => log.exerciseId),
      ),
    ].sort((a, b) => (planOrder.get(a) ?? 999) - (planOrder.get(b) ?? 999))

    return ids.map((exerciseId) => {
      const history = exerciseHistory({ sets, sessions, exerciseId, routineId })
      const current = history.find((item) => item.sessionId === selected.id)
      const previous = previousOf(history, selected.id)
      return {
        exerciseId,
        previous,
        trend: trendBetween(current, previous),
        rows: compareSets(current?.sets ?? [], previous?.sets ?? []),
      }
    })
  }, [selected, sets, sessions, routineId, state])

  const counts = exercises.reduce(
    (total, item) => ({ ...total, [item.trend.kind]: total[item.trend.kind] + 1 }),
    { up: 0, same: 0, down: 0, new: 0 },
  )

  const back = (
    <Button variant="ghost" onClick={() => navigate('/progreso')}>
      <ArrowLeft size={18} />
      Progreso
    </Button>
  )

  if (!selected) {
    return (
      <Screen title={routineName} actions={back}>
        <EmptyState
          icon={Dumbbell}
          title="Sin sesiones terminadas"
          description="Cuando termines una sesion de esta rutina, aqui veras como vas."
        />
      </Screen>
    )
  }

  return (
    <Screen title={routineName} description="Cada ejercicio frente a la vez anterior." actions={back}>
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-4">
        <h1 className="md:hidden text-xl font-semibold truncate">{routineName}</h1>

        {/* Que sesion se mira */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {newestFirst.map((session, index) => (
            <button
              key={session.id}
              type="button"
              onClick={() => setSelectedId(session.id)}
              className={cn(
                'shrink-0 h-10 px-3 rounded-control text-sm whitespace-nowrap transition-colors duration-150',
                session.id === selected.id
                  ? 'bg-accent text-canvas font-medium'
                  : 'bg-elevated text-muted border border-line hover:text-text',
              )}
            >
              {index === 0 ? `Ultima · ${formatDate(session.startedAt)}` : formatDate(session.startedAt)}
            </button>
          ))}
        </div>

        <Card className="p-4 flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wider text-muted">
            Sesion del {formatDateTime(selected.startedAt)}
          </p>
          <p className="text-sm">
            {counts.up > 0 && (
              <span className="text-accent">
                {counts.up} {counts.up === 1 ? 'subio' : 'subieron'}
              </span>
            )}
            {counts.up > 0 && (counts.same > 0 || counts.down > 0 || counts.new > 0) && (
              <span className="text-muted"> &middot; </span>
            )}
            <span className="text-muted">
              {[
                counts.same > 0 ? `${counts.same} igual` : null,
                counts.down > 0 ? `${counts.down} ${counts.down === 1 ? 'bajo' : 'bajaron'}` : null,
                counts.new > 0 ? `${counts.new} por primera vez` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </p>
        </Card>

        {exercises.map((item) => (
          <Card key={item.exerciseId} className="p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[15px] font-medium truncate">
                  {exerciseName(state, item.exerciseId)}
                </h2>
                <p className="text-xs text-muted">
                  {item.previous
                    ? `Frente al ${formatDate(item.previous.startedAt)}`
                    : 'Primera vez en esta rutina'}
                </p>
              </div>
              <TrendBadge trend={item.trend} className="shrink-0" />
            </div>

            <div className="flex flex-col">
              {item.rows.map((row) => (
                <SetCompareRow key={row.position} row={row} firstTime={!item.previous} />
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate(`/progreso/ejercicio/${item.exerciseId}?rutina=${routineId}`)}
              className="self-start flex items-center gap-1 h-9 -ml-1 px-1 text-xs text-muted hover:text-text transition-colors duration-150"
            >
              Ver historial del ejercicio
              <ChevronRight size={14} />
            </button>
          </Card>
        ))}

        <Button onClick={() => setEditing(true)} className="self-center">
          <Pencil size={16} />
          Ver o corregir esta sesion
        </Button>
      </div>

      <SessionDetail sessionId={editing ? selected.id : null} onClose={() => setEditing(false)} />
    </Screen>
  )
}
