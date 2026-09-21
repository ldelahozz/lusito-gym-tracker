import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, Dumbbell, HardDriveDownload, Moon, Play, SkipForward, Trophy } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Modal } from '@/core/ui/Modal'
import { Card } from '@/core/ui/Card'
import { EmptyState } from '@/core/ui/EmptyState'
import { ProgressRing } from '@/core/ui/ProgressRing'
import { Screen } from '@/core/ui/Screen'
import { cn } from '@/core/ui/cn'
import { backupReminderDue, daysSince } from '@/core/logic/backup'
import { formatDaysAgo, formatDuration, formatWeight } from '@/core/logic/format'
import { routineSummary, summaryText } from '@/core/logic/progress'
import {
  WEEKDAYS,
  isSplitEmpty,
  normalizeSplit,
  weekActivity,
  weekdayIndex,
  type WeekActivity,
  type WeekSplit,
} from '@/core/logic/weekPlan'
import { newId } from '@/core/model/ids'
import type { Routine } from '@/core/model/types'
import { useData } from '@/core/sync/data-context'
import { exerciseName, listRoutineExercises, listRoutines } from '@/core/sync/selectors'
import { ActiveSession, type SessionSummary } from './ActiveSession'
import { clearSessionState } from './session-storage'

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

/** La semana en siete rayitas: que dias ya entrenaste y cual es hoy. */
function WeekStrip({ week, split, todayIndex }: { week: WeekActivity; split: WeekSplit; todayIndex: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5" role="img" aria-label={`Esta semana entrenaste ${week.done} días`}>
        {DAY_LETTERS.map((letter, index) => {
          const trained = week.trained[index]
          const today = index === todayIndex
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'h-1.5 w-full rounded-full',
                  trained
                    ? 'bg-gradient-to-r from-accent to-violet shadow-[0_0_10px_-2px_rgb(76_141_255/0.9)]'
                    : today
                      ? 'bg-accent/35 shadow-[inset_0_0_0_1px_rgb(76_141_255/0.7)]'
                      : split[index]
                        ? 'bg-[#2a3346]'
                        : 'bg-[#1b2029]',
                )}
              />
              <span className={cn('text-[10px]', today ? 'text-text font-bold' : 'text-muted')}>
                {today ? 'Hoy' : letter}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
  // Recordatorio discreto de respaldo: mas de 30 dias sin exportar.
  const firstActivityAt = useMemo(() => {
    const starts = Object.values(state.sessions)
      .filter((session) => !session.deleted && session.endedAt !== null)
      .map((session) => session.startedAt)
    return starts.length > 0 ? Math.min(...starts) : null
  }, [state.sessions])
  const now = Date.now()
  const backupDue = backupReminderDue({ lastExportAt: settings.lastExportAt, firstActivityAt, now })
  const backupDays = daysSince(settings.lastExportAt ?? firstActivityAt ?? now, now)

  const sets = useMemo(() => Object.values(state.setLogs), [state.setLogs])
  const sessions = useMemo(() => Object.values(state.sessions), [state.sessions])
  const week = useMemo(() => weekActivity({ sessions, split, now }), [sessions, split, now])
  /** Como te fue la ultima vez con cada rutina, para decirlo sin tener que ir a Progreso. */
  const lastTime = (routineId: string) => routineSummary({ sets, sessions, routineId })

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
      skippedExerciseIds: [],
    })
  }

  const todayExercises = todayRoutine ? listRoutineExercises(state, todayRoutine.id) : []
  const todaySummary = todayRoutine ? lastTime(todayRoutine.id) : null
  const todaySummaryText = todaySummary ? summaryText(todaySummary) : ''
  const chipClass = 'text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07]'

  return (
    <Screen title="Entrenar" description="Elige la rutina de hoy y empieza.">
      {routines.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Todavía no hay rutinas"
          description="Crea tu primera rutina para poder empezar a entrenar."
          action={
            <Button variant="primary" onClick={() => navigate('/rutinas')}>
              Ir a Rutinas
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {hasSplit ? (
            <Card variant="hero" className="p-5 flex flex-col gap-4 animate-rise">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-hi/85">
                    {WEEKDAYS[todayIndex]} &middot; Hoy toca
                  </p>
                  {todayRoutine ? (
                    <>
                      <h2 className="mt-1.5 text-[34px] leading-[1.05] font-extrabold tracking-tight text-shine truncate">
                        {todayRoutine.name}
                      </h2>
                      <p className="mt-1.5 text-sm text-muted">
                        {exerciseCountText(todayRoutine.id)}
                        {todaySummary?.lastAt != null &&
                          ` · última vez ${formatDaysAgo(todaySummary.lastAt, now)}`}
                      </p>
                    </>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <Moon size={24} className="text-accent-hi shrink-0" />
                      <h2 className="text-[30px] leading-none font-extrabold tracking-tight text-shine">
                        Descanso
                      </h2>
                    </div>
                  )}
                </div>
                <ProgressRing
                  value={week.planned > 0 ? week.done / week.planned : 0}
                  size={60}
                  label={`${week.done} de ${week.planned} entrenos esta semana`}
                >
                  <span className="text-center leading-none">
                    <span className="block text-[17px] font-extrabold tabular-nums">
                      {week.done}
                      <span className="text-muted text-xs font-semibold">/{week.planned}</span>
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider text-muted mt-0.5">
                      semana
                    </span>
                  </span>
                </ProgressRing>
              </div>

              {todayExercises.length > 0 && (
                // Una sola fila que se desliza de lado; se desvanece a la derecha si hay mas.
                <div className="-mx-5 px-5 flex gap-1.5 overflow-x-auto no-scrollbar [mask-image:linear-gradient(90deg,#000_85%,transparent)]">
                  {todayExercises.map((link) => (
                    <span key={link.id} className={cn(chipClass, 'shrink-0 whitespace-nowrap text-[#c9cfd8]')}>
                      {exerciseName(state, link.exerciseId)}
                    </span>
                  ))}
                </div>
              )}

              <WeekStrip week={week} split={split} todayIndex={todayIndex} />

              {todayRoutine ? (
                <>
                  {todaySummaryText && (
                    <p className="text-sm text-muted -mt-1">
                      La última vez: <span className="text-text">{todaySummaryText}</span>
                    </p>
                  )}
                  <Button
                    variant="primary"
                    size="xl"
                    onClick={() => startSession(todayRoutine)}
                    disabled={todayExercises.length === 0}
                  >
                    <Play size={19} fill="currentColor" />
                    Empezar
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted -mt-1">
                  Hoy no te toca. Si quieres, entrena cualquier rutina de abajo.
                </p>
              )}

              <button
                type="button"
                onClick={() => navigate('/rutinas/split')}
                className="self-center flex items-center gap-1.5 h-8 text-xs text-muted hover:text-text transition-colors duration-150"
              >
                <CalendarDays size={14} />
                Cambiar el split semanal
              </button>
            </Card>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/rutinas/split')}
              className="surface-card flex items-center gap-3 p-4 rounded-card text-left hover:border-accent-dim transition-colors duration-150"
            >
              <span className="grid place-items-center size-11 rounded-control bg-accent-soft text-accent-hi shrink-0">
                <CalendarDays size={20} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold">Arma tu split semanal</span>
                <span className="block text-sm text-muted">
                  Asigna una rutina a cada día y aquí verás cuál toca hoy.
                </span>
              </span>
              <ChevronRight size={18} className="text-muted shrink-0" />
            </button>
          )}

          {otherRoutines.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {todayRoutine ? 'Otras rutinas' : 'Tus rutinas'}
              </h2>
              <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-4">
                {otherRoutines.map((routine, index) => {
                  const count = listRoutineExercises(state, routine.id).length
                  const last = lastTime(routine.id).lastAt
                  return (
                    <Card
                      key={routine.id}
                      className="p-3.5 pr-3 flex items-center gap-3 animate-rise"
                      style={{ animationDelay: `${60 + index * 40}ms` }}
                    >
                      <span className="grid place-items-center size-11 rounded-control surface-well text-accent-hi shrink-0">
                        <Dumbbell size={19} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold truncate">{routine.name}</p>
                        <p className="text-sm text-muted truncate">
                          {exerciseCountText(routine.id)}
                          {last !== null && ` · ${formatDaysAgo(last, now)}`}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => startSession(routine)} disabled={count === 0}>
                        <Play size={15} />
                        Empezar
                      </Button>
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {backupDue && (
            <button
              type="button"
              onClick={() => navigate('/ajustes')}
              className="flex items-center gap-2.5 min-h-12 px-3.5 rounded-control border border-dashed border-line text-left text-sm text-muted hover:text-text transition-colors duration-150"
            >
              <HardDriveDownload size={16} className="shrink-0" />
              <span className="flex-1 min-w-0">
                {settings.lastExportAt === null
                  ? 'Todavía no guardas un respaldo de tus datos'
                  : `Hace ${backupDays} días que no guardas un respaldo`}
              </span>
              <ChevronRight size={16} className="shrink-0" />
            </button>
          )}
        </div>
      )}

      <Modal
        open={summary !== null}
        onClose={() => setSummary(null)}
        title="Sesión terminada"
        description={summary?.routineName}
        footer={
          <Button variant="primary" block size="lg" onClick={() => setSummary(null)}>
            Listo
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex justify-center py-1">
            <span
              className={cn(
                'grid place-items-center size-20 rounded-[26px] surface-hero animate-pop',
                (summary?.records ?? 0) > 0 ? 'text-violet' : 'text-accent-hi',
              )}
            >
              <Trophy size={34} strokeWidth={1.7} />
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Duración', formatDuration(summary?.durationMs ?? 0)],
              ['Series', String(summary?.sets ?? 0)],
              ['Volumen', `${formatWeight(Math.round(summary?.volume ?? 0))} kg`],
            ].map(([label, value], index) => (
              <div
                key={label}
                className="surface-well px-2 py-3 rounded-control animate-rise"
                style={{ animationDelay: `${120 + index * 70}ms` }}
              >
                <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
                <p className="mt-1 text-lg font-extrabold tracking-tight tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          {(summary?.records ?? 0) > 0 && (
            <p className="flex items-center justify-center gap-2 h-11 rounded-control bg-violet-soft border border-violet-dim text-violet text-sm font-semibold animate-glow">
              <Trophy size={16} />
              {summary?.records === 1 ? '1 récord nuevo' : `${summary?.records} récords nuevos`}
            </p>
          )}

          {(summary?.skipped ?? 0) > 0 && (
            <p className="flex items-center justify-center gap-2 text-sm text-muted">
              <SkipForward size={15} />
              {summary?.skipped === 1 ? '1 ejercicio saltado' : `${summary?.skipped} ejercicios saltados`}
            </p>
          )}
        </div>
      </Modal>
    </Screen>
  )
}
