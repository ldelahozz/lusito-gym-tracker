import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Minus,
  Pause,
  Play,
  Plus,
} from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { ConfirmDialog } from '@/core/ui/ConfirmDialog'
import { IconButton } from '@/core/ui/IconButton'
import { useToast } from '@/core/ui/toast-context'
import { useChrome } from '@/app/chrome-context'
import { SyncIndicator } from '@/app/SyncIndicator'
import { unlockAudio, notifyRestFinished, restFinishedFeedback, tapFeedback, vibrate } from '@/core/feedback'
import { formatDuration, formatRepRange } from '@/core/logic/format'
import {
  equivalentPreviousSet,
  prefillFor,
  previousLabel,
  previousSessionSets,
} from '@/core/logic/prefill'
import {
  adjustRest,
  isFinished,
  startRest,
  type RestTimer,
} from '@/core/logic/restTimer'
import { detectRecords, recordMessage, topRecord, type PrSet } from '@/core/logic/prs'
import { renumberSets, rowCount, switchSetType } from '@/core/logic/setRows'
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
  previousText: string | null
  /** Objetivo de esa serie segun la rutina ("6-8 reps @RIR 2"). */
  targetText: string | null
  defaults: SetDraft
}

export type SessionSummary = {
  routineName: string
  durationMs: number
  sets: number
  volume: number
  records: number
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
  const { setHideHeader } = useChrome()
  const now = useNow(true)
  useWakeLock(true)

  useEffect(() => {
    setHideHeader(true)
    return () => setHideHeader(false)
  }, [setHideHeader])

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
          previousText: previousLabel(previous),
          targetText: target
            ? `Objetivo ${formatRepRange(target.repsMin, target.repsMax)} reps @RIR ${target.rir}`
            : null,
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
            showToast('Terminaste el ultimo ejercicio')
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

  const togglePause = () => {
    const updated = isPaused(session)
      ? resumeSession(session, Date.now())
      : pauseSession(session, Date.now())
    save('sessions', updated)
  }

  const pendingWorkSets = useMemo(() => {
    let pending = 0
    for (const item of links) {
      const logged = sessionSets.filter(
        (log) => log.exerciseId === item.exerciseId && log.type === 'work',
      ).length
      pending += Math.max(0, item.workSets.length - logged)
    }
    return pending
  }, [links, sessionSets])

  /** Cuantos records se rompieron en esta sesion. */
  const sessionRecords = useMemo(() => {
    const ids = new Set(sessionSets.map((log) => log.id))
    return Object.values(state.personalRecords).filter(
      (record) => !record.deleted && ids.has(record.setLogId),
    ).length
  }, [sessionSets, state.personalRecords])

  const finishSession = () => {
    const ended = endSession(session, Date.now())
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
    })
  }

  const elapsed = sessionElapsedMs(session, now)
  const paused = isPaused(session)

  return (
    <div className="min-h-full flex flex-col bg-canvas">
      <header className="sticky top-0 z-20 bg-canvas/95 backdrop-blur border-b border-line pt-safe">
        <div className="mx-auto max-w-3xl flex items-center gap-3 h-14 px-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{routine?.name ?? 'Entrenamiento'}</p>
            <p className="text-xs text-muted">
              {links.length > 0 ? `Ejercicio ${exerciseIndex + 1} de ${links.length}` : 'Sin ejercicios'}
            </p>
          </div>

          <button
            type="button"
            onClick={togglePause}
            className="flex items-center gap-2 h-10 px-3 rounded-control bg-elevated border border-line"
            aria-label={paused ? 'Reanudar cronometro' : 'Pausar cronometro'}
          >
            {paused ? <Play size={16} className="text-accent" /> : <Pause size={16} className="text-muted" />}
            <span className="text-sm tabular-nums">{formatDuration(elapsed)}</span>
          </button>

          <SyncIndicator />
        </div>
      </header>

      <div
        className="flex-1 mx-auto w-full max-w-3xl px-3 pb-40 pt-3 flex flex-col gap-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {!link ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted">Esta rutina no tiene ejercicios.</p>
            <Button variant="primary" onClick={() => setConfirmFinish(true)}>
              Terminar sesion
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <IconButton
                icon={ChevronLeft}
                label="Ejercicio anterior"
                disabled={exerciseIndex === 0}
                onClick={() => goToExercise(exerciseIndex - 1)}
              />
              <div className="flex-1 min-w-0 text-center">
                <h1 className="text-lg font-semibold truncate">{currentName}</h1>
                <p className="text-xs text-muted">
                  {workDone} de {planned.work} series
                </p>
              </div>
              <SessionVideoButton exerciseId={currentExerciseId} exerciseName={currentName} />
              <IconButton
                icon={ChevronRight}
                label="Siguiente ejercicio"
                disabled={exerciseIndex === links.length - 1}
                onClick={() => goToExercise(exerciseIndex + 1)}
              />
            </div>

            {(['warmup', 'work'] as const).map((type) => {
              const typeRows = rows.filter((row) => row.type === type)
              const logged = currentSets.filter((log) => log.type === type).length
              return (
                <section key={type} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <h2 className="text-xs uppercase tracking-wider text-muted">
                      {type === 'warmup' ? 'Calentamiento' : 'Series de trabajo'}
                    </h2>
                    <div className="flex items-center gap-1">
                      <IconButton
                        icon={Minus}
                        label={type === 'warmup' ? 'Quitar calentamiento' : 'Quitar serie'}
                        size={16}
                        className="size-9"
                        disabled={typeRows.length <= logged || typeRows.length === 0}
                        onClick={() => changeRowCount(type, -1)}
                      />
                      <IconButton
                        icon={Plus}
                        label={type === 'warmup' ? 'Agregar calentamiento' : 'Agregar serie'}
                        size={16}
                        className="size-9"
                        onClick={() => changeRowCount(type, 1)}
                      />
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
                          previousText={row.previousText}
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

            <Button variant="ghost" onClick={() => setConfirmFinish(true)} className="mt-2">
              <Flag size={18} />
              Finalizar sesion
            </Button>
          </>
        )}
      </div>

      {restTimer && (
        <RestBar
          timer={restTimer}
          now={now}
          exerciseName={exerciseName(state, restTimer.exerciseId)}
          onAdjust={(delta) => setRestTimer((current) => adjustRest(current, delta, Date.now()))}
          onSkip={() => setRestTimer(null)}
        />
      )}

      <ConfirmDialog
        open={confirmFinish}
        title="Finalizar sesion"
        description={
          pendingWorkSets > 0
            ? `Quedan ${pendingWorkSets} series sin registrar. Puedes terminar igual: se guarda lo que si hiciste.`
            : 'Se guarda la duracion y todo lo registrado.'
        }
        confirmLabel="Finalizar"
        onCancel={() => setConfirmFinish(false)}
        onConfirm={finishSession}
      />

    </div>
  )
}
