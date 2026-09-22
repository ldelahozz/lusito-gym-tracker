import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Dumbbell, Pencil, SkipForward, Trash } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { ConfirmDialog } from '@/core/ui/ConfirmDialog'
import { EmptyState } from '@/core/ui/EmptyState'
import { Screen } from '@/core/ui/Screen'
import { cn } from '@/core/ui/cn'
import { useToast } from '@/core/ui/toast-context'
import { formatDate, formatDateTime } from '@/core/logic/format'
import {
  compareSets,
  exerciseHistory,
  finishedSessions,
  previousOf,
  skippedIn,
  trendBetween,
  type ExerciseSession,
  type SetComparison,
  type Trend,
} from '@/core/logic/progress'
import type { SetLog } from '@/core/model/types'
import { useData } from '@/core/sync/data-context'
import { exerciseName, listRoutineExercises } from '@/core/sync/selectors'
import { effectiveLinks } from '@/core/logic/swaps'
import { SessionDetail } from './SessionDetail'
import { removeSessionCascade } from './session-actions'
import { SetCompareRow, TrendBadge } from './progress-ui'

type Item =
  | {
      kind: 'done'
      exerciseId: string
      previous: ExerciseSession<SetLog> | undefined
      trend: Trend
      rows: SetComparison<SetLog>[]
    }
  | { kind: 'skipped'; exerciseId: string }

export function RoutineProgress() {
  const { routineId = '' } = useParams()
  const navigate = useNavigate()
  const { state, remove } = useData()
  const { showToast } = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const sets = useMemo(() => Object.values(state.setLogs), [state.setLogs])
  const sessions = useMemo(() => Object.values(state.sessions), [state.sessions])
  const routineSessions = useMemo(() => finishedSessions(sessions, routineId), [sessions, routineId])
  const newestFirst = useMemo(() => [...routineSessions].reverse(), [routineSessions])

  // Por defecto, la ultima sesion. Si la elegida se borra, se vuelve a la ultima.
  const selected = newestFirst.find((session) => session.id === selectedId) ?? newestFirst[0]
  const routineName = state.routines[routineId]?.name ?? 'Rutina'

  /**
   * Ejercicios de la sesion elegida en el orden de la rutina: los que hiciste,
   * comparados con su vez anterior, y los que te saltaste.
   */
  /** En la sesion elegida, que ejercicio reemplazo a cual (solo ese dia). */
  const swappedFrom = useMemo(() => {
    const map = new Map<string, string>()
    if (!selected) return map
    for (const link of effectiveLinks(listRoutineExercises(state, routineId), selected)) {
      if (link.swappedFrom) map.set(link.exerciseId, link.swappedFrom)
    }
    return map
  }, [selected, state, routineId])

  const items = useMemo<Item[]>(() => {
    if (!selected) return []
    // Un ejercicio cambiado solo ese dia ocupa el lugar del original.
    const planOrder = new Map(
      effectiveLinks(listRoutineExercises(state, routineId), selected).map((link, index) => [
        link.exerciseId,
        index,
      ]),
    )
    const done = [
      ...new Set(
        sets
          .filter((log) => !log.deleted && log.type === 'work' && log.sessionId === selected.id)
          .sort((a, b) => a.completedAt - b.completedAt)
          .map((log) => log.exerciseId),
      ),
    ]
    const skipped = skippedIn(selected, sets)
    const order = (id: string) => planOrder.get(id) ?? 999

    const doneItems: Item[] = done.map((exerciseId) => {
      const history = exerciseHistory({ sets, sessions, exerciseId, routineId })
      const current = history.find((item) => item.sessionId === selected.id)
      const previous = previousOf(history, selected.id)
      return {
        kind: 'done',
        exerciseId,
        previous,
        trend: trendBetween(current, previous),
        rows: compareSets(current?.sets ?? [], previous?.sets ?? []),
      }
    })
    const skippedItems: Item[] = skipped.map((exerciseId) => ({ kind: 'skipped', exerciseId }))

    return [...doneItems, ...skippedItems].sort((a, b) => order(a.exerciseId) - order(b.exerciseId))
  }, [selected, sets, sessions, routineId, state])

  const counts = { up: 0, same: 0, down: 0, new: 0, skipped: 0 }
  for (const item of items) {
    if (item.kind === 'skipped') counts.skipped += 1
    else counts[item.trend.kind] += 1
  }
  const rest = [
    counts.same > 0 ? `${counts.same} igual` : null,
    counts.down > 0 ? `${counts.down} ${counts.down === 1 ? 'bajó' : 'bajaron'}` : null,
    counts.new > 0 ? `${counts.new} por primera vez` : null,
    counts.skipped > 0 ? `${counts.skipped} ${counts.skipped === 1 ? 'saltado' : 'saltados'}` : null,
  ].filter(Boolean)

  const deleteSelected = () => {
    if (!selected) return
    removeSessionCascade(state, remove, selected.id)
    setConfirmDelete(false)
    setSelectedId(null)
    showToast('Sesión borrada')
  }

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
          description="Cuando termines una sesión de esta rutina, aquí verás cómo vas."
        />
      </Screen>
    )
  }

  return (
    <Screen title={routineName} description="Cada ejercicio frente a la vez anterior." actions={back}>
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-4">
        <h1 className="md:hidden text-[26px] leading-tight font-bold tracking-tight text-shine truncate">{routineName}</h1>

        {/* Que sesion se mira */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {newestFirst.map((session, index) => (
            <button
              key={session.id}
              type="button"
              onClick={() => setSelectedId(session.id)}
              className={cn(
                'shrink-0 h-11 px-3.5 rounded-control text-sm whitespace-nowrap transition-colors duration-150',
                session.id === selected.id
                  ? 'bg-accent text-canvas font-medium'
                  : 'surface-well text-muted hover:text-text',
              )}
            >
              {index === 0 ? `Última · ${formatDate(session.startedAt)}` : formatDate(session.startedAt)}
            </button>
          ))}
        </div>

        <Card className="p-4 flex flex-col gap-1">
          <p className="section-label">
            Sesión del {formatDateTime(selected.startedAt)}
          </p>
          {items.length === 0 ? (
            <p className="text-sm text-muted">Esta sesión no tiene series registradas.</p>
          ) : (
            <p className="text-sm">
              {counts.up > 0 && (
                <span className="text-accent">
                  {counts.up} {counts.up === 1 ? 'subió' : 'subieron'}
                </span>
              )}
              {counts.up > 0 && rest.length > 0 && <span className="text-muted"> &middot; </span>}
              <span className="text-muted">{rest.join(' · ')}</span>
            </p>
          )}
        </Card>

        {items.map((item) =>
          item.kind === 'skipped' ? (
            <Card key={item.exerciseId} className="p-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-medium truncate text-muted">
                  {exerciseName(state, item.exerciseId)}
                </h2>
                <button
                  type="button"
                  onClick={() => navigate(`/progreso/ejercicio/${item.exerciseId}?rutina=${routineId}`)}
                  className="flex items-center gap-1 h-11 -ml-1 px-1 text-sm text-muted hover:text-text transition-colors duration-150"
                >
                  Ver historial del ejercicio
                  <ChevronRight size={14} />
                </button>
              </div>
              <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs whitespace-nowrap surface-well text-muted shrink-0">
                <SkipForward size={13} />
                Saltado
              </span>
            </Card>
          ) : (
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
                    {swappedFrom.get(item.exerciseId) &&
                      ` · en lugar de ${exerciseName(state, swappedFrom.get(item.exerciseId) ?? '')}`}
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
                className="self-start flex items-center gap-1 h-11 -ml-1 px-1 text-sm text-muted hover:text-text transition-colors duration-150"
              >
                Ver historial del ejercicio
                <ChevronRight size={14} />
              </button>
            </Card>
          ),
        )}

        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <Button onClick={() => setEditing(true)}>
            <Pencil size={16} />
            Corregir series
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash size={16} />
            Borrar sesión
          </Button>
        </div>
      </div>

      <SessionDetail sessionId={editing ? selected.id : null} onClose={() => setEditing(false)} />

      <ConfirmDialog
        open={confirmDelete}
        title="Borrar esta sesión"
        description={`Se borra la sesión del ${formatDate(selected.startedAt)} con todas sus series y los récords que hayan salido de ella. Esto no se puede deshacer.`}
        confirmLabel="Borrar"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteSelected}
      />
    </Screen>
  )
}
