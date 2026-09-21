import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Dumbbell, SkipForward } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { EmptyState } from '@/core/ui/EmptyState'
import { Screen } from '@/core/ui/Screen'
import { cn } from '@/core/ui/cn'
import { formatDate, formatWeight } from '@/core/logic/format'
import {
  compareSets,
  exerciseHistory,
  skippedSessions,
  trendBetween,
  type ExerciseSession,
} from '@/core/logic/progress'
import type { SetLog } from '@/core/model/types'
import { useData } from '@/core/sync/data-context'
import { exerciseName } from '@/core/sync/selectors'
import { ProgressChart } from './ProgressChart'
import { SetCompareRow, TrendBadge } from './progress-ui'

type Metric = 'topWeight' | 'bestE1rm' | 'totalReps' | 'volume'

/** Cada vez en la lista: o lo hiciste (con su comparacion) o te lo saltaste. */
type Entry =
  | {
      kind: 'done'
      sessionId: string
      startedAt: number
      routineId: string
      item: ExerciseSession<SetLog>
      previous: ExerciseSession<SetLog> | undefined
    }
  | { kind: 'skipped'; sessionId: string; startedAt: number; routineId: string }

const METRICS: Array<{ key: Metric; label: string; format: (value: number) => string }> = [
  { key: 'topWeight', label: 'Peso máximo', format: (value) => formatWeight(Math.round(value * 10) / 10) },
  { key: 'bestE1rm', label: '1RM estimado', format: (value) => String(Math.round(value)) },
  { key: 'totalReps', label: 'Reps totales', format: (value) => String(Math.round(value)) },
  {
    key: 'volume',
    label: 'Volumen',
    format: (value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value))),
  },
]

/** Cuantas veces se muestran en la lista antes de pedir "ver mas". */
const PAGE = 10

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 h-9 px-3 rounded-control text-sm whitespace-nowrap transition-colors duration-150',
        active
          ? 'bg-accent text-canvas font-medium'
          : 'bg-elevated text-muted border border-line hover:text-text',
      )}
    >
      {children}
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-0 p-3 rounded-control bg-surface border border-line text-center">
      <p className="text-[11px] text-muted truncate">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function ExerciseProgress() {
  const { exerciseId = '' } = useParams()
  const [params] = useSearchParams()
  const fromRoutine = params.get('rutina')
  const navigate = useNavigate()
  const { state } = useData()

  const [metric, setMetric] = useState<Metric>('topWeight')
  const [onlyRoutine, setOnlyRoutine] = useState(Boolean(fromRoutine))
  const [visible, setVisible] = useState(PAGE)

  const sets = useMemo(() => Object.values(state.setLogs), [state.setLogs])
  const sessions = useMemo(() => Object.values(state.sessions), [state.sessions])

  const scopeRoutine = onlyRoutine && fromRoutine ? fromRoutine : undefined

  const history = useMemo(
    () => exerciseHistory({ sets, sessions, exerciseId, routineId: scopeRoutine }),
    [sets, sessions, exerciseId, scopeRoutine],
  )

  const skipped = useMemo(
    () => skippedSessions({ sets, sessions, exerciseId, routineId: scopeRoutine }),
    [sets, sessions, exerciseId, scopeRoutine],
  )

  /** Todo junto, de lo mas nuevo a lo mas viejo. Cada vez hecha se compara con la anterior hecha. */
  const entries = useMemo<Entry[]>(() => {
    const done: Entry[] = history.map((item, index) => ({
      kind: 'done',
      sessionId: item.sessionId,
      startedAt: item.startedAt,
      routineId: item.routineId,
      item,
      previous: history[index - 1],
    }))
    const missed: Entry[] = skipped.map((session) => ({
      kind: 'skipped',
      sessionId: session.id,
      startedAt: session.startedAt,
      routineId: session.routineId,
    }))
    return [...done, ...missed].sort((a, b) => b.startedAt - a.startedAt)
  }, [history, skipped])

  const name = exerciseName(state, exerciseId)
  const routineName = fromRoutine ? (state.routines[fromRoutine]?.name ?? 'esta rutina') : null
  const current = METRICS.find((item) => item.key === metric) ?? METRICS[0]

  const points = history.map((item: ExerciseSession) => ({
    key: item.sessionId,
    label: formatDate(item.startedAt),
    value: item[metric],
  }))

  const back = (
    <Button
      variant="ghost"
      onClick={() => navigate(fromRoutine ? `/progreso/rutina/${fromRoutine}` : '/progreso')}
    >
      <ArrowLeft size={18} />
      {routineName ?? 'Progreso'}
    </Button>
  )

  return (
    <Screen title={name} description="Cada vez que lo hiciste, frente a la anterior." actions={back}>
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-4">
        <h1 className="md:hidden text-xl font-semibold truncate">{name}</h1>

        {fromRoutine && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <Chip active={onlyRoutine} onClick={() => setOnlyRoutine(true)}>
              Solo en {routineName}
            </Chip>
            <Chip active={!onlyRoutine} onClick={() => setOnlyRoutine(false)}>
              En todas las rutinas
            </Chip>
          </div>
        )}

        {history.length === 0 && skipped.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Sin registros"
            description="Todavía no hay sesiones terminadas con este ejercicio."
          />
        ) : (
          <>
            <div className="flex gap-2">
              <Stat
                label="Peso máximo"
                value={
                  history.length > 0
                    ? `${formatWeight(Math.max(...history.map((item) => item.topWeight)))} kg`
                    : '-'
                }
              />
              <Stat
                label="1RM estimado"
                value={
                  history.length > 0
                    ? `${Math.round(Math.max(...history.map((item) => item.bestE1rm)))} kg`
                    : '-'
                }
              />
              <Stat label="Veces" value={String(history.length)} />
            </div>
            {skipped.length > 0 && (
              <p className="-mt-2 px-1 flex items-center gap-1.5 text-xs text-muted">
                <SkipForward size={13} />
                Te lo saltaste {skipped.length} {skipped.length === 1 ? 'vez' : 'veces'}
              </p>
            )}

            <Card className="p-4 flex flex-col gap-3">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {METRICS.map((item) => (
                  <Chip key={item.key} active={metric === item.key} onClick={() => setMetric(item.key)}>
                    {item.label}
                  </Chip>
                ))}
              </div>
              <ProgressChart title={current.label} points={points} format={current.format} />
            </Card>

            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-xs uppercase tracking-wider text-muted">Cada vez</h2>
              {entries.slice(0, visible).map((entry) =>
                entry.kind === 'skipped' ? (
                  <Card key={entry.sessionId} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted">{formatDate(entry.startedAt)}</p>
                      {!onlyRoutine && (
                        <p className="text-xs text-muted truncate">
                          {state.routines[entry.routineId]?.name ?? 'Rutina borrada'}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs whitespace-nowrap bg-elevated text-muted border border-line shrink-0">
                      <SkipForward size={13} />
                      Saltado
                    </span>
                  </Card>
                ) : (
                  <Card key={entry.sessionId} className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{formatDate(entry.startedAt)}</p>
                        {!onlyRoutine && (
                          <p className="text-xs text-muted truncate">
                            {state.routines[entry.routineId]?.name ?? 'Rutina borrada'}
                          </p>
                        )}
                      </div>
                      <TrendBadge trend={trendBetween(entry.item, entry.previous)} className="shrink-0" />
                    </div>
                    <div className="flex flex-col">
                      {compareSets(entry.item.sets, entry.previous?.sets ?? []).map((row) => (
                        <SetCompareRow key={row.position} row={row} firstTime={!entry.previous} />
                      ))}
                    </div>
                  </Card>
                ),
              )}

              {entries.length > visible && (
                <Button className="self-center" onClick={() => setVisible((value) => value + PAGE)}>
                  Ver más
                </Button>
              )}
            </section>
          </>
        )}
      </div>
    </Screen>
  )
}
