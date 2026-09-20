import { useMemo, useState } from 'react'
import { Award, ChevronDown, Clock, Dumbbell, TrendingUp } from 'lucide-react'
import { Card } from '@/core/ui/Card'
import { EmptyState } from '@/core/ui/EmptyState'
import { Input } from '@/core/ui/Input'
import { Modal } from '@/core/ui/Modal'
import { Screen } from '@/core/ui/Screen'
import { cn } from '@/core/ui/cn'
import { formatDate, formatDateTime, formatDuration, formatWeight } from '@/core/logic/format'
import { normalizeExerciseName } from '@/core/logic/names'
import { PR_LABELS } from '@/core/logic/prs'
import { aggregateWeeks, sessionDuration } from '@/core/logic/weeks'
import { useData } from '@/core/sync/data-context'
import { exerciseName, listExercises, listRoutines } from '@/core/sync/selectors'
import { SessionDetail } from './SessionDetail'
import { WeekChart } from './WeekChart'

type Scope = { kind: 'all' } | { kind: 'exercise'; id: string } | { kind: 'routine'; id: string }

const RANGES = [
  { label: '4 sem', weeks: 4 },
  { label: '8 sem', weeks: 8 },
  { label: '12 sem', weeks: 12 },
  { label: 'Todo', weeks: null },
] as const

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
        'h-10 px-3 rounded-control text-sm whitespace-nowrap transition-colors duration-150',
        active
          ? 'bg-accent text-canvas font-medium'
          : 'bg-elevated text-muted border border-line hover:text-text',
      )}
    >
      {children}
    </button>
  )
}

export function ProgressScreen() {
  const { state } = useData()
  const [scope, setScope] = useState<Scope>({ kind: 'all' })
  const [weeks, setWeeks] = useState<number | null>(12)
  const [picking, setPicking] = useState<'exercise' | 'routine' | null>(null)
  const [search, setSearch] = useState('')
  const [openSession, setOpenSession] = useState<string | null>(null)

  const exercises = useMemo(() => listExercises(state, true), [state])
  const routines = useMemo(() => listRoutines(state, true), [state])

  const allSets = useMemo(
    () => Object.values(state.setLogs).filter((log) => !log.deleted),
    [state.setLogs],
  )
  const allSessions = useMemo(
    () => Object.values(state.sessions).filter((session) => !session.deleted && session.endedAt !== null),
    [state.sessions],
  )

  /** Sesiones y series que entran en lo que se esta viendo. */
  const { sets, sessions } = useMemo(() => {
    if (scope.kind === 'exercise') {
      const filtered = allSets.filter((log) => log.exerciseId === scope.id)
      const ids = new Set(filtered.map((log) => log.sessionId))
      return { sets: filtered, sessions: allSessions.filter((session) => ids.has(session.id)) }
    }
    if (scope.kind === 'routine') {
      const filtered = allSessions.filter((session) => session.routineId === scope.id)
      const ids = new Set(filtered.map((session) => session.id))
      return { sets: allSets.filter((log) => ids.has(log.sessionId)), sessions: filtered }
    }
    return { sets: allSets, sessions: allSessions }
  }, [scope, allSets, allSessions])

  const data = useMemo(
    () => aggregateWeeks({ sets, sessions, weeks, now: Date.now() }),
    [sets, sessions, weeks],
  )

  const history = useMemo(
    () => [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 30),
    [sessions],
  )

  const records = useMemo(() => {
    const setIds = new Set(sets.map((log) => log.id))
    return Object.values(state.personalRecords)
      .filter((record) => !record.deleted && setIds.has(record.setLogId))
      .sort((a, b) => b.achievedAt - a.achievedAt)
      .slice(0, 12)
  }, [state.personalRecords, sets])

  const scopeLabel =
    scope.kind === 'exercise'
      ? exerciseName(state, scope.id)
      : scope.kind === 'routine'
        ? (state.routines[scope.id]?.name ?? 'Rutina')
        : 'Todo'

  const options = picking === 'exercise' ? exercises : routines
  const filtered = options.filter((option) =>
    normalizeExerciseName(option.name).includes(normalizeExerciseName(search)),
  )

  const hasAnything = allSessions.length > 0 || allSets.length > 0

  if (!hasAnything) {
    return (
      <Screen title="Progreso" description="Tus semanas, tus records y el historial de sesiones.">
        <EmptyState
          icon={TrendingUp}
          title="Sin datos todavia"
          description="Cuando registres tu primer entrenamiento, aqui apareceran tus graficas y records."
        />
      </Screen>
    )
  }

  const perExercise = scope.kind === 'exercise'

  return (
    <Screen title="Progreso" description="Tus semanas, tus records y el historial de sesiones.">
      <div className="flex flex-col gap-5">
        {/* Que se mira y en que rango */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <Chip active={scope.kind === 'all'} onClick={() => setScope({ kind: 'all' })}>
              Todo
            </Chip>
            <Chip active={scope.kind === 'exercise'} onClick={() => setPicking('exercise')}>
              <span className="flex items-center gap-1.5">
                {scope.kind === 'exercise' ? scopeLabel : 'Por ejercicio'}
                <ChevronDown size={15} />
              </span>
            </Chip>
            <Chip active={scope.kind === 'routine'} onClick={() => setPicking('routine')}>
              <span className="flex items-center gap-1.5">
                {scope.kind === 'routine' ? scopeLabel : 'Por rutina'}
                <ChevronDown size={15} />
              </span>
            </Chip>
          </div>

          <div className="flex gap-2">
            {RANGES.map((range) => (
              <Chip
                key={range.label}
                active={weeks === range.weeks}
                onClick={() => setWeeks(range.weeks)}
              >
                {range.label}
              </Chip>
            ))}
          </div>
        </div>

        {data.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Nada registrado aqui"
            description="Prueba con otro rango o con otro ejercicio."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {perExercise && (
              <>
                <WeekChart
                  title="Peso maximo"
                  hint="El kilaje mas alto de la semana"
                  dataKey="maxWeight"
                  data={data}
                  format={(value) => `${formatWeight(value)}`}
                />
                <WeekChart
                  title="Mejor 1RM estimado"
                  hint="Lo que podrias levantar una vez"
                  dataKey="bestE1rm"
                  data={data}
                  format={(value) => `${Math.round(value)}`}
                />
              </>
            )}

            <WeekChart
              title="Volumen"
              hint="Kilos por repeticiones, sumado"
              dataKey="volume"
              data={data}
              kind="bar"
              format={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value)))}
            />
            <WeekChart title="Series de trabajo" dataKey="sets" data={data} kind="bar" format={(value) => String(Math.round(value))} />

            {perExercise ? (
              <WeekChart
                title="RIR promedio"
                hint="Mas bajo es mas cerca del fallo"
                dataKey="avgRir"
                data={data}
                format={(value) => value.toFixed(1)}
              />
            ) : (
              <>
                <WeekChart
                  title="Entrenamientos"
                  dataKey="sessions"
                  data={data}
                  kind="bar"
                  format={(value) => String(Math.round(value))}
                />
                <WeekChart
                  title="Duracion promedio"
                  dataKey="avgDurationMs"
                  data={data}
                  format={(value) => formatDuration(value)}
                />
              </>
            )}
          </div>
        )}

        {/* Records */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs uppercase tracking-wider text-muted">Records</h2>
          {records.length === 0 ? (
            <Card className="p-4">
              <p className="text-sm text-muted">
                Todavia no hay records aqui. Salen solos cuando superas una marca.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {records.map((record) => (
                <Card key={record.id} className="p-3 flex items-center gap-3">
                  <span className="grid place-items-center size-9 shrink-0 rounded-full bg-accent-soft text-accent">
                    <Award size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">
                      {exerciseName(state, record.exerciseId)}
                      <span className="text-muted"> &middot; {PR_LABELS[record.kind]}</span>
                    </p>
                    <p className="text-xs text-muted">{formatDate(record.achievedAt)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {record.kind === 'reps'
                      ? `${record.value} reps`
                      : `${formatWeight(Math.round(record.value * 10) / 10)} kg`}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Historial */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs uppercase tracking-wider text-muted">Historial</h2>
          {history.length === 0 ? (
            <Card className="p-4">
              <p className="text-sm text-muted">Sin entrenamientos terminados en esta seleccion.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((session) => {
                const logs = allSets.filter(
                  (log) => log.sessionId === session.id && log.type === 'work',
                )
                const duration = sessionDuration(session)
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setOpenSession(session.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-card bg-surface border border-line text-left hover:border-accent-dim transition-colors duration-150"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {state.routines[session.routineId]?.name ?? 'Entrenamiento'}
                      </p>
                      <p className="text-xs text-muted">{formatDateTime(session.startedAt)}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3 text-xs text-muted tabular-nums">
                      <span className="flex items-center gap-1">
                        <Dumbbell size={13} />
                        {logs.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {duration === null ? '-' : formatDuration(duration)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Selector de ejercicio o rutina */}
      <Modal
        open={picking !== null}
        onClose={() => {
          setPicking(null)
          setSearch('')
        }}
        title={picking === 'exercise' ? 'Elige un ejercicio' : 'Elige una rutina'}
        className="max-h-[80vh] overflow-y-auto"
      >
        {picking === 'exercise' && (
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar..."
            autoFocus
          />
        )}
        <div className="flex flex-col gap-1.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted py-2">Nada con ese nombre.</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setScope(
                    picking === 'exercise'
                      ? { kind: 'exercise', id: option.id }
                      : { kind: 'routine', id: option.id },
                  )
                  setPicking(null)
                  setSearch('')
                }}
                className="w-full h-12 px-4 rounded-control bg-surface border border-line text-left text-[15px] truncate hover:border-accent-dim transition-colors duration-150"
              >
                {option.name}
              </button>
            ))
          )}
        </div>
      </Modal>

      <SessionDetail sessionId={openSession} onClose={() => setOpenSession(null)} />
    </Screen>
  )
}
