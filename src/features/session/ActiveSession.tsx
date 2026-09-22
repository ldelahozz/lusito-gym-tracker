import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftRight,
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
import { Modal } from '@/core/ui/Modal'
import { IconButton } from '@/core/ui/IconButton'
import { InfoTip } from '@/core/ui/InfoTip'
import { cn } from '@/core/ui/cn'
import { useToast } from '@/core/ui/toast-context'
import { useChrome } from '@/app/chrome-context'
import { SyncIndicator } from '@/app/SyncIndicator'
import { unlockAudio, notifyRestFinished, restFinishedFeedback, tapFeedback, vibrate } from '@/core/feedback'
import { formatDate, formatDuration, formatRepRange, formatWeight } from '@/core/logic/format'
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
import { canSwap, effectiveLinks, setSwap, swapsOf } from '@/core/logic/swaps'
import { endSession, isPaused, pauseSession, resumeSession, sessionElapsedMs } from '@/core/logic/sessionDuration'
import { newId } from '@/core/model/ids'
import type { Session, SetLog, SetType } from '@/core/model/types'
import { useData } from '@/core/sync/data-context'
import { exerciseName, listRoutineExercises } from '@/core/sync/selectors'
import { useNow } from '@/core/useNow'
import { useWakeLock } from '@/core/useWakeLock'
import { ExercisePicker } from '@/features/routines/ExercisePicker'
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
  // Con los cambios de hoy ya aplicados: si cambiaste un ejercicio, aqui ya es el nuevo.
  const links = useMemo(
    () => effectiveLinks(listRoutineExercises(state, session.routineId), session),
    [state, session],
  )

  const [plan, setPlan] = useState(() => loadSessionPlan(session.id))
  const [restTimer, setRestTimer] = useState<RestTimer | null>(() => loadRestTimer())
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({})
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const alertedFor = useRef<number | null>(null)
  /** Salto automatico al siguiente ejercicio, pendiente de dispararse. */
  const advanceTimer = useRef<number | undefined>(undefined)
  /** Serie que arranco el descanso en curso: si se deshace, el descanso tambien. */
  const restStartedBy = useRef<string | null>(null)
  /** Hacia que lado entra el ejercicio nuevo: 1 desde la derecha, -1 desde la izquierda. */
  const [slideDir, setSlideDir] = useState(1)
  /** Contenido que se mueve con el dedo al deslizar entre ejercicios. */
  const swipeRef = useRef<HTMLDivElement>(null)

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

  /**
   * La serie abierta siempre a la vista: al terminar una serie la pantalla baja
   * sola a la siguiente, sin quedar tapada por el descanso. Al cambiar de
   * ejercicio, vuelve arriba.
   */
  const lastScroll = useRef<{ exercise: string; key: string | null } | null>(null)
  useEffect(() => {
    const previous = lastScroll.current
    lastScroll.current = { exercise: currentExerciseId, key: activeKey }
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    if (previous && previous.exercise !== currentExerciseId) {
      window.scrollTo({ top: 0, behavior })
      return
    }
    if (!activeKey || previous?.key === activeKey) return
    // Un instante despues: la serie recien abierta todavia se esta acomodando.
    const timer = window.setTimeout(() => {
      document.querySelector(`[data-set-key="${activeKey}"]`)?.scrollIntoView({ behavior, block: 'nearest' })
    }, 60)
    return () => window.clearTimeout(timer)
  }, [activeKey, currentExerciseId])
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
      setSlideDir(index >= exerciseIndex ? 1 : -1)
      setPlan((current) => ({ ...current, exerciseIndex: index }))
      setOpenKey(null)
    },
    [links.length, exerciseIndex],
  )

  /**
   * Deslizar entre ejercicios: el contenido sigue al dedo y, si lo sueltas lejos,
   * pasa al siguiente. Se mueve directo en la pantalla, sin recalcular todo.
   */
  const touchStart = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null)
  const setSwipeOffset = (offset: number, animate: boolean) => {
    const element = swipeRef.current
    if (!element) return
    element.style.transition = animate ? 'transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none'
    element.style.transform = offset === 0 ? '' : `translate3d(${offset}px, 0, 0)`
  }
  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY, axis: null }
  }
  const onTouchMove = (event: React.TouchEvent) => {
    const start = touchStart.current
    if (!start) return
    const touch = event.touches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (start.axis === null && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
      start.axis = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y'
    }
    if (start.axis !== 'x') return
    // En el primer o ultimo ejercicio se resiste: no hay a donde ir.
    const blocked = (dx > 0 && exerciseIndex === 0) || (dx < 0 && exerciseIndex === links.length - 1)
    setSwipeOffset(dx * (blocked ? 0.15 : 0.45), false)
  }
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    setSwipeOffset(0, true)
    if (!start || start.axis !== 'x') return
    const dx = event.changedTouches[0].clientX - start.x
    if (Math.abs(dx) < 70) return
    setSwipeOffset(0, false)
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
        restStartedBy.current = created.id
        setRestTimer(startRest(currentExerciseId, restSeconds, Date.now()))
      }
      showToast(
        `${row.type === 'warmup' ? 'Calentamiento' : 'Serie'} ${row.position} guardada`,
        'info',
        { label: 'Deshacer', onAction: () => undoRef.current(created.id) },
      )

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

  /**
   * Deshace una serie recien registrada: la quita, borra sus records, detiene el
   * descanso que arranco y deja la serie abierta con lo que habias puesto.
   * Se llama desde el aviso, asi que siempre usa lo mas reciente (ver undoRef).
   */
  const undoLog = (logId: string) => {
    const log = state.setLogs[logId]
    if (!log || log.deleted) return
    cancelAdvance()
    const remaining = sessionSets.filter(
      (item) => item.exerciseId === log.exerciseId && item.type === log.type && item.id !== log.id,
    )
    remove('setLogs', log)
    clearRecordsOf(log.id)
    const changes = renumberSets(remaining)
    if (changes.length > 0) saveMany(changes.map((doc) => ({ collection: 'setLogs' as const, doc })))
    if (restStartedBy.current === log.id) {
      restStartedBy.current = null
      setRestTimer(null)
    }
    const index = links.findIndex((item) => item.exerciseId === log.exerciseId)
    if (index >= 0 && index !== exerciseIndex) goToExercise(index)
    const key = `${log.type}:${log.setIndex}`
    setDrafts((current) => ({
      ...current,
      [`${log.exerciseId}:${key}`]: { weightKg: log.weightKg, reps: log.reps, rir: log.rir },
    }))
    setOpenKey(key)
  }
  const undoRef = useRef(undoLog)
  useEffect(() => {
    undoRef.current = undoLog
  })

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

  /** Cambia el ejercicio actual solo por hoy (o vuelve al original, con null). */
  const swapExercise = (exerciseId: string | null, pickedName?: string) => {
    if (!link) return
    const target = exerciseId ?? link.swappedFrom ?? link.exerciseId
    const check = canSwap({
      links,
      currentLinkId: link.id,
      newExerciseId: target,
      loggedSets: currentSets.length,
    })
    if (!check.ok) {
      showToast(
        check.reason === 'has-sets'
          ? 'Ya registraste series de este ejercicio: bórralas antes de cambiarlo'
          : 'Ese ejercicio ya está en la sesión de hoy',
      )
      return
    }
    const original = link.swappedFrom ?? link.exerciseId
    save('sessions', {
      ...session,
      exerciseSwaps: setSwap(swapsOf(session), { id: link.id, exerciseId: original }, exerciseId),
    })
    setSwapping(false)
    setOpenKey(null)
    showToast(
      exerciseId === null || exerciseId === original
        ? `De vuelta a ${exerciseName(state, original)}`
        : `Hoy haces ${pickedName ?? exerciseName(state, exerciseId)} en lugar de ${exerciseName(state, original)}`,
    )
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

  /** Lo que sigue, para ir preparando la barra mientras descansas. */
  const nextRow = rows.find((row) => !row.log && (row.type === 'work' || workDone === 0))
  const nextLink = links[exerciseIndex + 1]
  const nextUp = nextRow
    ? `${nextRow.type === 'warmup' ? 'Calentamiento' : 'Serie'} ${nextRow.position} · ${formatWeight(draftOf(nextRow).weightKg)} kg × ${draftOf(nextRow).reps}`
    : nextLink
      ? exerciseName(state, nextLink.exerciseId)
      : 'Terminaste los ejercicios'

  const smallButton =
    'inline-flex items-center gap-1 h-11 px-3.5 rounded-full surface-key text-sm text-muted hover:text-text transition-transform duration-100 active:scale-95 disabled:opacity-30 disabled:pointer-events-none'

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
              'flex items-center gap-2 h-11 px-3.5 rounded-full surface-key transition-transform duration-100 active:scale-95',
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
            className="md:hidden"
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
                className="flex-1 h-7 flex items-center"
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
        ref={swipeRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {!link ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted">Esta rutina no tiene ejercicios.</p>
            <Button variant="primary" onClick={() => setConfirmFinish(true)}>
              Terminar sesión
            </Button>
          </div>
        ) : (
          <div
            key={currentExerciseId}
            className="flex flex-col gap-5 animate-slide-in"
            style={{ '--dir': slideDir } as React.CSSProperties}
          >
            <div className="flex items-center gap-1">
              <IconButton
                icon={ChevronLeft}
                label="Ejercicio anterior"
                disabled={exerciseIndex === 0}
                onClick={() => goToExercise(exerciseIndex - 1)}
              />
              <div className="flex-1 min-w-0 text-center">
                <h1 className="text-[22px] leading-tight font-bold tracking-tight text-shine truncate">
                  {currentName}
                </h1>
                <div className="mt-1.5 flex items-center justify-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-hi font-medium whitespace-nowrap">
                    Meta {headTarget}
                  </span>
                  <InfoTip topic="repRange" />
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
              (lastSkip || workDone === 0 || link.swappedFrom) && (
                <div className="flex flex-col gap-2 -mt-2">
                  {link.swappedFrom && (
                    <p className="flex items-center justify-center gap-1.5 px-1 text-xs text-muted">
                      <ArrowLeftRight size={13} className="shrink-0" />
                      Solo hoy, en lugar de {exerciseName(state, link.swappedFrom)}
                    </p>
                  )}
                  {lastSkip && (
                    <p className="flex items-center justify-center gap-1.5 px-1 text-xs text-muted">
                      <SkipForward size={13} className="shrink-0" />
                      La vez pasada ({formatDate(lastSkip.startedAt)}) te lo saltaste
                    </p>
                  )}
                  {workDone === 0 && (
                    <div className="flex items-center justify-end gap-2">
                      {/* Cambiar solo antes de registrar cualquier serie; saltar, antes de las de trabajo. */}
                      {currentSets.length > 0 ? null : link.swappedFrom ? (
                        <button type="button" onClick={() => swapExercise(null)} className={smallButton}>
                          <Undo2 size={14} />
                          Volver al original
                        </button>
                      ) : (
                        <button type="button" onClick={() => setSwapping(true)} className={smallButton}>
                          <ArrowLeftRight size={14} />
                          Cambiar
                        </button>
                      )}
                      <button type="button" onClick={skipExercise} className={smallButton}>
                        <SkipForward size={14} />
                        Saltar
                      </button>
                      <InfoTip topic="skip" />
                    </div>
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
                    <h2 className="section-label">
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
                        // El margen le avisa al navegador que no la deje bajo la cabecera ni bajo el descanso.
                        <div key={row.key} data-set-key={row.key} className="scroll-mt-32 scroll-mb-56">
                          <SetRow
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
                        </div>
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
          </div>
        )}
      </div>

      {restTimer && (
        <RestBar
          timer={restTimer}
          now={now}
          nextUp={nextUp}
          aboveNav={!hideNav}
          onAdjust={(delta) => setRestTimer((current) => adjustRest(current, delta, Date.now()))}
          onSkip={() => setRestTimer(null)}
        />
      )}

      <Modal
        open={swapping}
        onClose={() => setSwapping(false)}
        title="Cambiar solo por hoy"
        description={
          link
            ? `¿Qué harás en lugar de ${currentName}? Se queda con sus series, rangos y descansos. Tu rutina no cambia.`
            : undefined
        }
      >
        <ExercisePicker onPick={(exerciseId, name) => swapExercise(exerciseId, name)} placeholder="Busca o escribe el ejercicio" />
      </Modal>

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
