import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, Award, ChevronRight, Equal, SkipForward, Sparkles, TrendingUp } from 'lucide-react'
import { Card } from '@/core/ui/Card'
import { EmptyState } from '@/core/ui/EmptyState'
import { ProgressRing } from '@/core/ui/ProgressRing'
import { Screen } from '@/core/ui/Screen'
import { Sparkline } from '@/core/ui/Sparkline'
import { cn } from '@/core/ui/cn'
import { formatDate, formatWeight } from '@/core/logic/format'
import { finishedSessions, routineSummary, routineVolumes } from '@/core/logic/progress'
import { weekActivity } from '@/core/logic/weekPlan'
import { PR_LABELS } from '@/core/logic/prs'
import { useData } from '@/core/sync/data-context'
import { exerciseName } from '@/core/sync/selectors'

export function ProgressHome() {
  const { state, settings } = useData()
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
      <Screen title="Progreso" description="Cómo vas en cada rutina, sesión contra sesión.">
        <EmptyState
          icon={TrendingUp}
          title="Sin sesiones todavía"
          description="Termina tu primer entrenamiento y aquí verás cómo vas en cada rutina."
        />
      </Screen>
    )
  }

  const now = Date.now()
  const week = weekActivity({ sessions, split: settings.weeklySplit, now })
  const monthRecords = records30(state.personalRecords, sets, now)

  const chip = 'inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-medium whitespace-nowrap'

  return (
    <Screen title="Progreso" description="Cómo vas en cada rutina, sesión contra sesión.">
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
        <Card variant="hero" className="p-4 flex items-center gap-4 animate-rise">
          <ProgressRing
            value={week.planned > 0 ? week.done / week.planned : 0}
            size={68}
            label={`${week.done} de ${week.planned} entrenos esta semana`}
          >
            <span className="text-xl font-extrabold tabular-nums">
              {week.done}
              <span className="text-xs text-muted font-semibold">/{week.planned}</span>
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-hi/85">Esta semana</p>
            <p className="text-lg font-bold leading-snug">
              {week.planned > 0
                ? `${week.done} de ${week.planned} entrenos`
                : `${week.done} ${week.done === 1 ? 'entreno' : 'entrenos'}`}
            </p>
            <p className="text-sm text-muted">
              {monthRecords === 0
                ? 'Sin récords en los últimos 30 días'
                : `${monthRecords} ${monthRecords === 1 ? 'récord' : 'récords'} en los últimos 30 días`}
            </p>
          </div>
        </Card>

        <section className="flex flex-col gap-2.5">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Tus rutinas</h2>
          {routines.map(({ routineId, name, archived, summary }, index) => {
            const volumes = routineVolumes({ sets, sessions, routineId })
            return (
              <button
                key={routineId}
                type="button"
                onClick={() => navigate(`/progreso/rutina/${routineId}`)}
                className="surface-card w-full flex flex-col gap-3 p-4 rounded-card text-left transition-[transform,border-color] duration-150 active:scale-[0.99] hover:border-accent-dim animate-rise"
                style={{ animationDelay: `${60 + index * 50}ms` }}
              >
                <div className="w-full flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-bold tracking-tight truncate">
                      {name}
                      {archived && <span className="text-muted text-sm font-normal"> &middot; archivada</span>}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {summary.sessions} {summary.sessions === 1 ? 'sesión' : 'sesiones'}
                      {summary.lastAt !== null && ` · última ${formatDate(summary.lastAt)}`}
                    </p>
                  </div>
                  <Sparkline values={volumes} label={`Volumen de las últimas ${volumes.length} sesiones`} />
                  <ChevronRight size={18} className="text-muted shrink-0" />
                </div>

                {summary.sessions > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted mr-0.5">Última vez</span>
                    {summary.up > 0 && (
                      <span className={cn(chip, 'bg-accent-soft text-accent-hi')}>
                        <ArrowUp size={12} />
                        {summary.up} {summary.up === 1 ? 'subió' : 'subieron'}
                      </span>
                    )}
                    {summary.same > 0 && (
                      <span className={cn(chip, 'surface-well text-muted')}>
                        <Equal size={12} />
                        {summary.same} igual
                      </span>
                    )}
                    {summary.down > 0 && (
                      <span className={cn(chip, 'surface-well text-muted')}>
                        <ArrowDown size={12} />
                        {summary.down} {summary.down === 1 ? 'bajó' : 'bajaron'}
                      </span>
                    )}
                    {summary.fresh > 0 && (
                      <span className={cn(chip, 'surface-well text-muted')}>
                        <Sparkles size={12} />
                        {summary.fresh} {summary.fresh === 1 ? 'nuevo' : 'nuevos'}
                      </span>
                    )}
                    {summary.skipped > 0 && (
                      <span className={cn(chip, 'surface-well text-muted')}>
                        <SkipForward size={12} />
                        {summary.skipped} {summary.skipped === 1 ? 'saltado' : 'saltados'}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </section>

        {records.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Récords recientes</h2>
            {records.map((record) => (
              <Card key={record.id} className="p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => navigate(`/progreso/ejercicio/${record.exerciseId}`)}
                  className="w-full p-3 flex items-center gap-3 text-left"
                >
                  <span className="grid place-items-center size-10 shrink-0 rounded-[13px] bg-violet-soft border border-violet-dim text-violet">
                    <Award size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{exerciseName(state, record.exerciseId)}</p>
                    <p className="text-xs text-muted">
                      {PR_LABELS[record.kind]} &middot; {formatDate(record.achievedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-base font-extrabold tracking-tight tabular-nums">
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

/** Cuantos records (de series que siguen existiendo) cayeron en los ultimos 30 dias. */
function records30(
  personalRecords: Record<string, { deleted?: boolean; setLogId: string; achievedAt: number }>,
  sets: readonly { id: string; deleted?: boolean }[],
  now: number,
): number {
  const liveSets = new Set(sets.filter((log) => !log.deleted).map((log) => log.id))
  const since = now - 30 * 86_400_000
  return Object.values(personalRecords).filter(
    (record) => !record.deleted && liveSets.has(record.setLogId) && record.achievedAt >= since,
  ).length
}
