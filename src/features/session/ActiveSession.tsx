import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutGrid,
  Minus,
  Pause,
  Play,
  Plus,
  SkipForward,
  Undo2,
} from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { ConfirmDialog } from '@/core/ui/ConfirmDialog'
import { IconButton } from '@/core/ui/IconButton'
import { cn } from '@/core/ui/cn'
import { useToast } from '@/core/ui/toast-context'
import { useChrome } from '@/app/chrome-context'
import { SyncIndicator } from '@/app/SyncIndicator'
import { unlockAudio, notifyRestFinished, restFinishedFeedback, tapFeedback, vibrate } from '@/core/feedback'
import { formatDate, formatDuration, formatRepRange } from '@/core/logic/format'
import { equivalentPreviousSet, prefillFor, previousSessionSets } from '@/core/logic/prefill'
import {
  adjustRest,
  isFinished,
  startRest,
  type RestTimer,
} from '@/core/logic/restTimer'
import { detectRecords, recordMessage, topRecord, type PrSet } from '@/core/logic/prs'
import { renumberSets, rowCount, switchSetType } from '@/core/logic/setRows'
import { finalSkipped, setSkipped, skippedLastTime, skippedOf } from '@/core/logic/skips'
import { endSession, isPaused, pauseSession, resumeSession, sessionElapsedMs } from '@/core/logic/sessionDuration'
import { newId } from '@/core/model/ids'
import type { Session, SetLog, SetType } from '@/core/model/types'
import { useData } from '@/core/sync/data-context'
import { exerciseName, listRoutineExercises } from '@/core/sync/selectors'
import { useNow } from '@/core/useNow'
import { useWakeLock } from '@/core/useWakeLock'
import { NotesPanel } from './NotesPanel'
import { RestBar } from './RestBar'
import { SessionVideoButton } from './SessionVideoButton'
import { SetRow, type SetDraft } from './SetRow'
import { clearSessionState, loadRestTimer, loadSessionPlan, saveRestTimer, saveSessionPlan } from './session-storage'

type Row = {
  key: string
  type: SetType
  /** Numero visible para la persona (1, 2, 3...). */
  position: number
  /** Posicion interna dentro de su tipo (0, 1, 2...). */
  index: number
  log: SetLog | undefined
  /** La misma serie de la vez pasada, para comparar. */
  previous: SetDraft | null
  /** Meta de esa serie segun la rutina ("6-8 · RIR 2"). */
  targetText: string | null
  defaults: SetDraft
}

export type SessionSummary = {
  routineName: string
  durationMs: number
  sets: number
  volume: number
  records: number
  skipped: number
}

export function ActiveSession({
  session,
  onFinished,
}: {
  session: Session
  onFinished: (summary: SessionSummary) => void
}) {
  const { state, settings, save, saveMany, remove } = useData()
  const { showToast } = useToast()
  const { setHideHeader, hideNav, setHideNav } = useChrome()
  const now = useNow(true)
  useWakeLock(true)

  // Modo enfoque: sin cabecera general ni barra de abajo mientras entrenas.
  useEffect(() => {
    setHideHeader(true)
    setHideNav(true)
    return () => {
      setHideHeader(false)
      setHideNav(false)
    }
  }, [setHideHeader, setHideNav])

  const routine = state.routines[session.routineId]
  const links = useMemo(
    () => listRoutineExercises(state, session.routineId),
    [state, session.routineId],
  )

  const [plan, setPlan] = useState(() => loadSessionPlan(session.id))
  const [restTimer, setRestTimer] = useState<RestTimer | null>(() => loadRestTimer())
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({})
  const [confirmFinish, setConfirmFinish] = useState(false)
  const alertedFor = useRef<number | null>(null)
  /** Salto automatico al siguiente ejercicio, pendiente de dispararse. */
  const advanceTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(advanceTimer.current), [])

  /** Cualquier cosa que hagas a mano cancela el salto automatico. */
  const cancelAdvance = () => window.clearTimeout(advanceTimer.current)

  useEffect(() => saveSessionPlan(plan), [plan])
  useEffect(() => saveRestTimer(restTimer), [restTimer])

  const exerciseIndex = Math.min(plan.exerciseIndex, Math.max(0, links.length - 1))
  const link = links[exerciseIndex]
  const currentExerciseId = link?.exerciseId ?? ''
  const currentName = currentExerciseId ? exerciseName(state, currentExerciseId) : ''

  const allSets = useMemo(
    () => Object.values(state.setLogs).filter((log) => !log.deleted),
    [state.setLogs],
  )
  const sessionSets = useMemo(
    () => allSets.filter((log) => log.sessionId === session.id),
    [allSets, session.id],
  )
  const currentSets = useMemo(
    () => sessionSets.filter((log) => log.exerciseId === currentExerciseId),
    [sessionSets, currentExerciseId],
  )
  const previousSets = useMemo(() => {
    if (!currentExerciseId) return []
    return previousSessionSets(allSets, Object.values(state.sessions), currentExerciseId, session.id)
  }, [allSets, state.sessions, currentExerciseId, session.id])

  const planned = plan.rows[currentExerciseId] ?? {
    warmup: link?.warmupSets ?? 0,
    work: link?.workSets.length ?? 0,
  }

  const rows = useMemo<Row[]>(() => {
    if (!link) return []
    const build = (type: SetType): Row[] => {
      const logs = currentSets.filter((log) => log.type === type).sort((a, b) => a.setIndex - b.setIndex)
      const total = rowCount(type === 'warmup' ? planned.warmup : planned.work, logs.length)
      return Array.from({ length: total }, (_, index) => {
        const log = logs.find((item) => item.setIndex === index)
        const previous = equivalentPreviousSet(previousSets, type, index)
        const target = type === 'work' ? (link.workSets[index] ?? null) : null
        return {
          key: `${type}:${index}`,
          type,
          position: index + 1,
          index,
          log,
          previous: previous
            ? { weightKg: previous.weightKg, reps: previous.reps, rir: previous.rir }
            : null,
          targetText: target ? `${formatRepRange(target.repsMin, target.repsMax)} · RIR ${target.rir}` : null,
          defaults: log
            ? { weightKg: log.weightKg, reps: log.reps, rir: log.rir }
            : prefillFor({
                previousSets,
                currentSets,
                type,
                setIndex: index,
                // Sin historial se arranca en el extremo bajo del rango.
                planned: target ? { reps: target.repsMin, rir: target.rir } : null,
              }),
        }
      })
    }
    return [...build('warmup'), ...build('work')]
  }, [link, currentSets, previousSets, planned.warmup, planned.work])

  /** Series que rompieron algun record: la insignia se mantiene aunque cierres la app. */
  const recordSetIds = useMemo(() => {
    const ids = new Set<string>()
    for (const record of Object.values(state.personalRecords)) {
      if (!record.deleted) ids.add(record.setLogId)
    }
    return ids
  }, [state.personalRecords])

  const firstIncomplete = rows.find((row) => !row.log)?.key ?? null
  const activeKey = openKey ?? firstIncomplete
  const workDone = currentSets.filter((log) => log.type === 'work').length

  /** Ejercicios que marcaste como saltados en esta sesion. */
  const skipped = useMemo(() => skippedOf(session), [session])
  const isSkipped = skipped.includes(currentExerciseId) && workDone === 0
  /** Si la vez pasada de esta rutina te saltaste este ejercicio, para avisarte. */
  const lastSkip = useMemo(
    () =>
      currentExerciseId
        ? skippedLastTime({
            sessions: Object.values(state.sessions),
            routineId: session.routineId,
            exerciseId: currentExerciseId,
            currentSessionId: session.id,
          })
        : null,
    [state.sessions, session.routineId, session.id, currentExerciseId],
  )

  const draftOf = (row: Row): SetDraft => drafts[`${currentExerciseId}:${row.key}`] ?? row.defaults

  const setDraftOf = (row: Row, draft: SetDraft) => {
    setDrafts((current) => ({ ...current, [`${currentExerciseId}:${row.key}`]: draft }))
  }

  /** Avisos cuando termina el descanso: vibracion, pitido y notificacion. */
  useEffect(() => {
    if (!restTimer || !isFinished(restTimer, now)) return
    if (alertedFor.current === restTimer.endAt) return
    alertedFor.current = restTimer.endAt
    restFinishedFeedback(settings.sound, settings.vibration)
    void notifyRestFinished(exerciseName(state, restTimer.exerciseId))
  }, [restTimer, now, settings.sound, settings.vibration, state])

  const goToExercise = useCallback(
    (index: number) => {
      // Si te mueves tu, manda lo que tu hiciste.
      window.clearTimeout(advanceTimer.current)
      if (index < 0 || index >= links.length) return
      setPlan((current) => ({ ...current, exerciseIndex: index }))
      setOpenKey(null)
    },
    [links.length],
  )

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return
    goToExercise(exerciseIndex + (dx < 0 ? 1 : -1))
  }

  /** Borra los records que apuntaban a una serie que se corrigio o se borro. */
  const clearRecordsOf = (setLogId: string) => {
    for (const record of Object.values(state.personalRecords)) {
      if (!record.deleted && record.setLogId === setLogId) remove('personalRecords', record)
    }
  }

  /** Revisa si la serie recien guardada rompio algun record y lo anota. */
  const checkRecords = (log: PrSet) => {
    if (log.type !== 'work') return
    clearRecordsOf(log.id)

    const hits = detectRecords(log, allSets)
    if (hits.length === 0) return

    for (const hit of hits) {
      save('personalRecords', {
        id: newId(),
        exerciseId: hit.exerciseId,
        kind: hit.kind,
        value: hit.value,
        setLogId: hit.setLogId,
        achievedAt: hit.achievedAt,
      })
    }

    const top = topRecord(hits)
    if (!top) return
    vibrate(settings.vibration, [20, 60, 30])
    showToast(recordMessage(top, currentName), 'record')
  }

  const completeRow = (row: Row) => {
    unlockAudio()
    tapFeedback(settings.vibration)
    const draft = draftOf(row)
    const rir = row.type === 'work' ? draft.rir : 0

    if (row.log) {
      const updated = { ...row.log, weightKg: draft.weightKg, reps: draft.reps, rir }
      save('setLogs', updated)
      checkRecords(updated)
    } else {
      const created = {
        id: newId(),
        sessionId: session.id,
        exerciseId: currentExerciseId,
        setIndex: row.index,
        type: row.type,
        weightKg: draft.weightKg,
        reps: draft.reps,
        rir,
        completedAt: Date.now(),
      }
      save('setLogs', created)
      checkRecords(created)
      if (row.type === 'work' && skipped.includes(currentExerciseId)) {
        save('sessions', { ...session, skippedExerciseIds: setSkipped(skipped, currentExerciseId, false) })
      }
      const shouldStartRest = row.type === 'work' || settings.warmupStartsTimer
      const restSeconds = row.type === 'warmup' ? link?.warmupRestSeconds : link?.restSeconds
      if (shouldStartRest && link && restSeconds && restSeconds > 0) {
        alertedFor.current = null
        setRestTimer(startRest(currentExerciseId, restSeconds, Date.now()))
      }

      // Con la ultima serie de trabajo hecha, el ejercicio se da por terminado.
      // Los calentamientos que queden sin marcar no lo impiden.
      const pendingWork = rows.some(
        (item) => item.type === 'work' && !item.log && item.key !== row.key,
      )
      if (row.type === 'work' && !pendingWork) {
        const next = links[exerciseIndex + 1]
        window.clearTimeout(advanceTimer.current)
        // Un momento para ver la serie marcada antes de cambiar de pantalla.
        advanceTimer.current = window.setTimeout(() => {
          if (next) {
            goToExercise(exerciseIndex + 1)
            showToast(`Siguiente: ${exerciseName(state, next.exerciseId)}`)
          } else {
            showToast('Terminaste el último ejercicio')
          }
        }, 1100)
      }
    }

    setDrafts((current) => {
      const next = { ...current }
      delete next[`${currentExerciseId}:${row.key}`]
      return next
    })
    setOpenKey(null)
  }

  const deleteRow = (row: Row) => {
    if (!row.log) return
    cancelAdvance()
    const remaining = currentSets.filter((log) => log.id !== row.log?.id)
    remove('setLogs', row.log)
    clearRecordsOf(row.log.id)
    const changes = renumberSets(remaining)
    if (changes.length > 0) {
      saveMany(changes.map((doc) => ({ collection: 'setLogs' as const, doc })))
    }
    setOpenKey(null)
    showToast('Serie borrada')
  }

  const switchType = (row: Row) => {
    if (row.log) {
      const changes = switchSetType(currentSets, row.log.id)
      saveMany(changes.map((doc) => ({ collection: 'setLogs' as const, doc })))
    } else {
      const other: SetType = row.type === 'warmup' ? 'work' : 'warmup'
      setPlan((current) => ({
        ...current,
        rows: {
          ...current.rows,
          [currentExerciseId]: {
            ...planned,
            [row.type]: Math.max(0, planned[row.type] - 1),
            [other]: planned[other] + 1,
          },
        },
      }))
    }
    setOpenKey(null)
  }

  const changeRowCount = (type: SetType, delta: 1 | -1) => {
    cancelAdvance()
    const logged = currentSets.filter((log) => log.type === type).length
    const next = Math.max(logged, planned[type] + delta)
    setPlan((current) => ({
      ...current,
      rows: { ...current.rows, [currentExerciseId]: { ...planned, [type]: next } },
    }))
  }

  const skipExercise = () => {
    cancelAdvance()
    tapFeedback(settings.vibration)
    save('sessions', { ...session, skippedExerciseIds: setSkipped(skipped, currentExerciseId, true) })
    const next = links[exerciseIndex + 1]
    if (next) {
      goToExercise(exerciseIndex + 1)
      showToast(`Saltaste ${currentName}. Siguiente: ${exerciseName(state, next.exerciseId)}`)
    } else {
      showToast(`Saltaste ${currentName}`)
    }
  }

  const unskipExercise = () => {
    save('sessions', { ...session, skippedExerciseIds: setSkipped(skipped, currentExerciseId, false) })
  }

  const togglePause = () => {
    const updated = isPaused(session)
      ? resumeSession(session, Date.now())
      : pauseSession(session, Date.now())
    save('sessions', updated)
  }

  const pendingWorkSets = useMemo(() => {
    let pending = 0
    for (const item of links) {
      if (skipped.includes(item.exerciseId)) continue
      const logged = sessionSets.filter(
        (log) => log.exerciseId === item.exerciseId && log.type === 'work',
      ).length
      pending += Math.max(0, item.workSets.length - logged)
    }
    return pending
  }, [links, sessionSets, skipped])

  /** Cuantos records se rompieron en esta sesion. */
  const sessionRecords = useMemo(() => {
    const ids = new Set(sessionSets.map((log) => log.id))
    return Object.values(state.personalRecords).filter(
      (record) => !record.deleted && ids.has(record.setLogId),
    ).length
  }, [sessionSets, state.personalRecords])

  const finishSession = () => {
    const skippedFinal = finalSkipped({
      planned: links.map((item) => item.exerciseId),
      marked: skipped,
      sets: sessionSets,
      sessionId: session.id,
    })
    const ended = { ...endSession(session, Date.now()), skippedExerciseIds: skippedFinal }
    save('sessions', ended)
    const workSets = sessionSets.filter((log) => log.type === 'work')
    setRestTimer(null)
    clearSessionState()
    setConfirmFinish(false)
    // El resumen lo muestra la pantalla de arriba, porque esta se desmonta al terminar.
    onFinished({
      routineName: routine?.name ?? 'Entrenamiento',
      durationMs: sessionElapsedMs(ended, Date.now()),
      sets: workSets.length,
      volume: workSets.reduce((total, log) => total + log.weightKg * log.reps, 0),
      records: sessionRecords,
      skipped: skippedFinal.length,
    })
  }

  const elapsed = sessionElapsedMs(session, now)
  const paused = isPaused(session)

  /** Una rayita por ejercicio: hecho, a medias, saltado o pendiente. */
  const segments = links.map((item, index) => {
    const logged = sessionSets.filter(
      (log) => log.exerciseId === item.exerciseId && log.type === 'work',
    ).length
    const target = item.workSets.length
    const status =
      skipped.includes(item.exerciseId) && logged === 0
        ? 'skipped'
        : target > 0 && logged >= target
          ? 'done'
          : logged > 0
            ? 'partial'
            : 'pending'
    return { id: item.id, exerciseId: item.exerciseId, status, current: index === exerciseIndex }
  })

  const firstTarget = link?.workSets[0]
  const sameTarget =
    firstTarget &&
    link.workSets.every(
      (set) =>
        set.repsMin === firstTarget.repsMin &&
        set.repsMax === firstTarget.repsMax &&
        set.rir === firstTarget.rir,
    )
  const headTarget = !link
    ? ''
    : sameTarget && firstTarget
      ? `${link.workSets.length} × ${formatRepRange(firstTarget.repsMin, firstTarget.repsMax)} · RIR ${firstTarget.rir}`
      : `${link.workSets.length} series`

  const smallButton =
    'inline-flex items-center gap-1 h-8 px-2.5 rounded-full surface-key text-xs text-muted hover:text-text transition-transform duration-100 active:scale-95 disabled:opacity-30 disabled:pointer-events-none'

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-20 surface-glass border-b border-line/60 pt-safe">
        <div className="mx-auto max-w-3xl flex items-center gap-2 h-14 px-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold truncate">{routine?.name ?? 'Entrenamiento'}</p>
            <p className="text-xs text-muted">
              {links.length > 0 ? `Ejercicio ${exerciseIndex + 1} de ${links.length}` : 'Sin ejercicios'}
            </p>
          </div>

          <button
            type="button"
            onClick={togglePause}
            className={cn(
              'flex items-center gap-2 h-10 px-3 rounded-full surface-key transition-transform duration-100 active:scale-95',
              paused && 'border-accent-dim',
            )}
            aria-label={paused ? 'Reanudar cronómetro' : 'Pausar cronómetro'}
          >
            {paused ? <Play size={15} className="text-accent-hi" /> : <Pause size={15} className="text-muted" />}
            <span className={cn('text-sm font-semibold tabular-nums', paused && 'text-accent-hi')}>
              {formatDuration(elapsed)}
            </span>
          </button>

          <IconButton
            icon={LayoutGrid}
            label={hideNav ? 'Mostrar menú' : 'Ocultar menú'}
            active={!hideNav}
            onClick={() => setHideNav(!hideNav)}
            className="md:hidden size-10"
            size={18}
          />
          <SyncIndicator />
        </div>

        {links.length > 1 && (
          <div className="mx-auto max-w-3xl flex gap-1 px-3 pb-2" aria-label="Avance de la sesión">
            {segments.map((segment, index) => (
              <button
                key={segment.id}
                type="button"
                onClick={() => goToExercise(index)}
                aria-label={`Ir a ${exerciseName(state, segment.exerciseId)}`}
                aria-current={segment.current ? 'step' : undefined}
                className="flex-1 h-4 flex items-center"
              >
                <span
                  className={cn(
                    'h-1.5 w-full rounded-full transition-[background-color,box-shadow] duration-300',
                    segment.status === 'done' &&
                      'bg-gradient-to-r from-accent to-violet shadow-[0_0_8px_-1px_rgb(76_141_255/0.8)]',
                    segment.status === 'partial' && 'bg-accent/45',
                    segment.status === 'skipped' &&
                      'bg-[repeating-linear-gradient(-45deg,#3a4150_0_3px,#1d222b_3px_6px)]',
                    segment.status === 'pending' && 'bg-[#232a35]',
                    segment.current && 'ring-2 ring-accent/70 ring-offset-2 ring-offset-canvas',
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </header>

      <div
        className={cn(
          'flex-1 mx-auto w-full max-w-3xl px-3 pt-4 flex flex-col gap-5',
          restTimer ? 'pb-48' : 'pb-16',
        )}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {!link ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted">Esta rutina no tiene ejercicios.</p>
            <Button variant="primary" onClick={() => setConfirmFinish(true)}>
              Terminar sesión
            </Button>
          </div>
        ) : (
          <>
            <div key={currentExerciseId} className="flex items-center gap-1 animate-rise">
              <IconButton
                icon={ChevronLeft}
                label="Ejercicio anterior"
                disabled={exerciseIndex === 0}
                onClick={() => goToExercise(exerciseIndex - 1)}
              />
              <div className="flex-1 min-w-0 text-center">
                <h1 className="text-[22px] leading-tight font-extrabold tracking-tight text-shine truncate">
                  {currentName}
                </h1>
                <div className="mt-1.5 flex items-center justify-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-hi font-medium whitespace-nowrap">
                    Meta {headTarget}
                  </span>
                  <span className="text-muted tabular-nums whitespace-nowrap">
                    {workDone} de {planned.work} hechas
                  </span>
                </div>
              </div>
              <SessionVideoButton exerciseId={currentExerciseId} exerciseName={currentName} />
              <IconButton
                icon={ChevronRight}
                label="Siguiente ejercicio"
                disabled={exerciseIndex === links.length - 1}
                onClick={() => goToExercise(exerciseIndex + 1)}
              />
            </div>

            {isSkipped ? (
              <div className="flex items-center gap-3 pl-3.5 pr-1.5 py-1.5 rounded-control surface-card">
                <SkipForward size={16} className="text-muted shrink-0" />
                <p className="flex-1 min-w-0 text-sm">Saltaste este ejercicio</p>
                <Button size="sm" variant="ghost" onClick={unskipExercise}>
                  <Undo2 size={16} />
                  Deshacer
                </Button>
              </div>
            ) : (
              (lastSkip || workDone === 0) && (
                <div className="flex flex-col gap-2 -mt-2">
                  {lastSkip && (
                    <p className="flex items-center justify-center gap-1.5 px-1 text-xs text-muted">
                      <SkipForward size={13} className="shrink-0" />
                      La vez pasada ({formatDate(lastSkip.startedAt)}) te lo saltaste
                    </p>
                  )}
                  {workDone === 0 && (
                    <button type="button" onClick={skipExercise} className={cn(smallButton, 'self-end h-9 px-3')}>
                      <SkipForward size={14} />
                      Saltar ejercicio
                    </button>
                  )}
                </div>
              )
            )}

            {(['warmup', 'work'] as const).map((type) => {
              const typeRows = rows.filter((row) => row.type === type)
              const logged = currentSets.filter((log) => log.type === type).length
              return (
                <section key={type} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {type === 'warmup' ? 'Calentamiento' : 'Series de trabajo'}
                    </h2>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className={smallButton}
                        disabled={typeRows.length <= logged || typeRows.length === 0}
                        onClick={() => changeRowCount(type, -1)}
                        aria-label={type === 'warmup' ? 'Quitar un calentamiento' : 'Quitar una serie'}
                      >
                        <Minus size={13} />
                        Quitar
                      </button>
                      <button
                        type="button"
                        className={smallButton}
                        onClick={() => changeRowCount(type, 1)}
                        aria-label={type === 'warmup' ? 'Agregar un calentamiento' : 'Agregar una serie'}
                      >
                        <Plus size={13} />
                        Agregar
                      </button>
                    </div>
                  </div>

                  {typeRows.length === 0 ? (
                    <p className="text-sm text-muted px-1 pb-1">
                      {type === 'warmup' ? 'Sin calentamiento' : 'Sin series'}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {typeRows.map((row) => (
                        <SetRow
                          key={row.key}
                          position={row.position}
                          type={row.type}
                          logged={Boolean(row.log)}
                          open={activeKey === row.key}
                          draft={draftOf(row)}
                          previous={row.previous}
                          targetText={row.targetText}
                          weightStep={settings.weightStep}
                          isRecord={Boolean(row.log && recordSetIds.has(row.log.id))}
                          onOpen={() => {
                            cancelAdvance()
                            setOpenKey(row.key)
                          }}
                          onChange={(draft) => setDraftOf(row, draft)}
                          onComplete={() => completeRow(row)}
                          onDelete={() => deleteRow(row)}
                          onSwitchType={() => switchType(row)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}

            <NotesPanel sessionId={session.id} exerciseId={currentExerciseId} />

            <Button variant="ghost" onClick={() => setConfirmFinish(true)} className="mt-1">
              <Flag size={18} />
              Finalizar sesión
            </Button>
          </>
        )}
      </div>

      {restTimer && (
        <RestBar
          timer={restTimer}
          now={now}
          exerciseName={exerciseName(state, restTimer.exerciseId)}
          aboveNav={!hideNav}
          onAdjust={(delta) => setRestTimer((current) => adjustRest(current, delta, Date.now()))}
          onSkip={() => setRestTimer(null)}
        />
      )}

      <ConfirmDialog
        open={confirmFinish}
        title="Finalizar sesión"
        description={
          pendingWorkSets > 0
            ? `Quedan ${pendingWorkSets} series sin registrar. Puedes terminar igual: se guarda lo que sí hiciste, y los ejercicios sin ninguna serie quedan como saltados.`
            : 'Se guarda la duración y todo lo registrado.'
        }
        confirmLabel="Finalizar"
        onCancel={() => setConfirmFinish(false)}
        onConfirm={finishSession}
      />
    </div>
  )
}
