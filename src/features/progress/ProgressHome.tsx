import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, ChevronRight, TrendingUp } from 'lucide-react'
import { Card } from '@/core/ui/Card'
import { EmptyState } from '@/core/ui/EmptyState'
import { Screen } from '@/core/ui/Screen'
import { formatDate, formatWeight } from '@/core/logic/format'
import { finishedSessions, routineSummary, type RoutineSummary } from '@/core/logic/progress'
import { PR_LABELS } from '@/core/logic/prs'
import { useData } from '@/core/sync/data-context'
import { exerciseName } from '@/core/sync/selectors'

/** "3 subieron · 1 igual · 1 bajo" (solo lo que no sea cero). */
function summaryLine(summary: RoutineSummary): string {
  const parts: string[] = []
  if (summary.up > 0) parts.push(`${summary.up} ${summary.up === 1 ? 'subio' : 'subieron'}`)
  if (summary.same > 0) parts.push(`${summary.same} igual`)
  if (summary.down > 0) parts.push(`${summary.down} ${summary.down === 1 ? 'bajo' : 'bajaron'}`)
  if (summary.fresh > 0) parts.push(`${summary.fresh} ${summary.fresh === 1 ? 'nuevo' : 'nuevos'}`)
  return parts.join(' · ')
}

export function ProgressHome() {
  const { state } = useData()
  const navigate = useNavigate()

  const sets = useMemo(() => Object.values(state.setLogs), [state.setLogs])
  const sessions = useMemo(() => Object.values(state.sessions), [state.sessions])

  /** Rutinas con al menos una sesion terminada, la mas reciente primero. */
  const routines = useMemo(() => {
    const ids = new Set(finishedSessions(sessions).map((session) => session.routineId))
    return [...ids]
      .map((routineId) => ({
        routineId,
        name: state.routines[routineId]?.name ?? 'Rutina borrada',
        archived: state.routines[routineId]?.archived ?? false,
        summary: routineSummary({ sets, sessions, routineId }),
      }))
      .sort((a, b) => (b.summary.lastAt ?? 0) - (a.summary.lastAt ?? 0))
  }, [sets, sessions, state.routines])

  const records = useMemo(() => {
    const liveSets = new Set(sets.filter((log) => !log.deleted).map((log) => log.id))
    return Object.values(state.personalRecords)
      .filter((record) => !record.deleted && liveSets.has(record.setLogId))
      .sort((a, b) => b.achievedAt - a.achievedAt)
      .slice(0, 5)
  }, [state.personalRecords, sets])

  if (routines.length === 0) {
    return (
      <Screen title="Progreso" description="Como vas en cada rutina, sesion contra sesion.">
        <EmptyState
          icon={TrendingUp}
          title="Sin sesiones todavia"
          description="Termina tu primer entrenamiento y aqui veras como vas en cada rutina."
        />
      </Screen>
    )
  }

  return (
    <Screen title="Progreso" description="Como vas en cada rutina, sesion contra sesion.">
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs uppercase tracking-wider text-muted">Tus rutinas</h2>
          {routines.map(({ routineId, name, archived, summary }) => {
            const line = summaryLine(summary)
            return (
              <button
                key={routineId}
                type="button"
                onClick={() => navigate(`/progreso/rutina/${routineId}`)}
                className="w-full flex items-center gap-3 p-4 rounded-card bg-surface border border-line text-left hover:border-accent-dim transition-colors duration-150"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium truncate">
                    {name}
                    {archived && <span className="text-muted font-normal"> &middot; archivada</span>}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {summary.sessions} {summary.sessions === 1 ? 'sesion' : 'sesiones'}
                    {summary.lastAt !== null && ` · ultima ${formatDate(summary.lastAt)}`}
                  </p>
                  {line && (
                    <p className="text-sm mt-2">
                      <span className="text-muted">Ultima vez: </span>
                      <span className={summary.up > 0 ? 'text-accent' : 'text-text'}>{line}</span>
                    </p>
                  )}
                </div>
                <ChevronRight size={18} className="text-muted shrink-0" />
              </button>
            )
          })}
        </section>

        {records.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-xs uppercase tracking-wider text-muted">Records recientes</h2>
            {records.map((record) => (
              <Card key={record.id} className="p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => navigate(`/progreso/ejercicio/${record.exerciseId}`)}
                  className="w-full p-3 flex items-center gap-3 text-left"
                >
                  <span className="grid place-items-center size-9 shrink-0 rounded-full bg-accent-soft text-accent">
                    <Award size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{exerciseName(state, record.exerciseId)}</p>
                    <p className="text-xs text-muted">
                      {PR_LABELS[record.kind]} &middot; {formatDate(record.achievedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {record.kind === 'reps'
                      ? `${record.value} reps`
                      : `${formatWeight(Math.round(record.value * 10) / 10)} kg`}
                  </span>
                </button>
              </Card>
            ))}
          </section>
        )}
      </div>
    </Screen>
  )
}
