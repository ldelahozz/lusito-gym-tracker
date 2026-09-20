import { useMemo, useState } from 'react'
import { Check, Trash } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { ConfirmDialog } from '@/core/ui/ConfirmDialog'
import { Modal } from '@/core/ui/Modal'
import { NumberField } from '@/core/ui/NumberField'
import { useToast } from '@/core/ui/toast-context'
import { formatDateTime, formatDuration, formatWeight } from '@/core/logic/format'
import { sessionDuration } from '@/core/logic/weeks'
import type { SetLog } from '@/core/model/types'
import { useData } from '@/core/sync/data-context'
import { exerciseName, recordsOfSet, sessionSetsByExercise } from '@/core/sync/selectors'

type Draft = { weightKg: number; reps: number; rir: number }

function SetLine({
  log,
  position,
  open,
  weightStep,
  onOpen,
  onSave,
  onDelete,
}: {
  log: SetLog
  position: number
  open: boolean
  weightStep: number
  onOpen: () => void
  onSave: (draft: Draft) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState<Draft>({
    weightKg: log.weightKg,
    reps: log.reps,
    rir: log.rir,
  })

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center gap-3 h-11 px-3 rounded-control bg-surface text-left"
      >
        <span className="w-6 shrink-0 text-xs text-muted tabular-nums">
          {log.type === 'warmup' ? 'C' : position}
        </span>
        <span className="flex-1 min-w-0 text-sm tabular-nums">
          {formatWeight(log.weightKg)} kg &times; {log.reps}
          {log.type === 'work' ? ` · RIR ${log.rir}` : ''}
        </span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-control bg-surface border border-accent-dim">
      <div className="grid grid-cols-3 gap-2">
        <NumberField
          compact
          value={draft.weightKg}
          onChange={(weightKg) => setDraft({ ...draft, weightKg })}
          min={0}
          max={500}
          step={weightStep}
          decimals={2}
          suffix="kg"
          ariaLabel="Peso en kilos"
        />
        <NumberField
          compact
          value={draft.reps}
          onChange={(reps) => setDraft({ ...draft, reps })}
          min={0}
          max={100}
          suffix="reps"
          ariaLabel="Repeticiones"
        />
        <NumberField
          compact
          value={draft.rir}
          onChange={(rir) => setDraft({ ...draft, rir })}
          min={0}
          max={5}
          suffix="RIR"
          ariaLabel="RIR"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" className="flex-1" onClick={() => onSave(draft)}>
          <Check size={16} />
          Guardar
        </Button>
        <Button size="sm" onClick={onDelete}>
          <Trash size={16} />
          Borrar
        </Button>
      </div>
    </div>
  )
}

export function SessionDetail({
  sessionId,
  onClose,
}: {
  sessionId: string | null
  onClose: () => void
}) {
  const { state, settings, save, remove } = useData()
  const { showToast } = useToast()
  const [openSet, setOpenSet] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const session = sessionId ? state.sessions[sessionId] : undefined
  const groups = useMemo(
    () => (sessionId ? sessionSetsByExercise(state, sessionId) : []),
    [state, sessionId],
  )

  const routineName = session ? (state.routines[session.routineId]?.name ?? 'Entrenamiento') : ''
  const duration = session ? sessionDuration(session) : null

  const close = () => {
    setOpenSet(null)
    onClose()
  }

  const saveSet = (log: SetLog, draft: Draft) => {
    save('setLogs', { ...log, ...draft, rir: log.type === 'warmup' ? 0 : draft.rir })
    setOpenSet(null)
    showToast('Serie actualizada')
  }

  const deleteSet = (log: SetLog) => {
    remove('setLogs', log)
    // Si esa serie tenia un record, el record se va con ella.
    for (const record of recordsOfSet(state, log.id)) remove('personalRecords', record)
    setOpenSet(null)
    showToast('Serie borrada')
  }

  const deleteSession = () => {
    if (!session) return
    for (const group of groups) {
      for (const log of group.sets) {
        remove('setLogs', log)
        for (const record of recordsOfSet(state, log.id)) remove('personalRecords', record)
      }
    }
    remove('sessions', session)
    setConfirmDelete(false)
    close()
    showToast('Sesion borrada')
  }

  return (
    <>
      <Modal
        open={Boolean(session) && !confirmDelete}
        onClose={close}
        title={routineName}
        description={session ? formatDateTime(session.startedAt) : ''}
        className="md:max-w-lg max-h-[85vh] overflow-y-auto"
        footer={
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash size={18} />
            Borrar sesion
          </Button>
        }
      >
        <div className="flex gap-2 text-center">
          <div className="flex-1 p-2 rounded-control bg-surface">
            <p className="text-[11px] text-muted">Duracion</p>
            <p className="text-sm font-medium tabular-nums">
              {duration === null ? '-' : formatDuration(duration)}
            </p>
          </div>
          <div className="flex-1 p-2 rounded-control bg-surface">
            <p className="text-[11px] text-muted">Series</p>
            <p className="text-sm font-medium tabular-nums">
              {groups.reduce(
                (total, group) => total + group.sets.filter((log) => log.type === 'work').length,
                0,
              )}
            </p>
          </div>
          <div className="flex-1 p-2 rounded-control bg-surface">
            <p className="text-[11px] text-muted">Volumen</p>
            <p className="text-sm font-medium tabular-nums">
              {formatWeight(
                Math.round(
                  groups.reduce(
                    (total, group) =>
                      total +
                      group.sets
                        .filter((log) => log.type === 'work')
                        .reduce((sum, log) => sum + log.weightKg * log.reps, 0),
                    0,
                  ),
                ),
              )}{' '}
              kg
            </p>
          </div>
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-muted py-2">Esta sesion no tiene series registradas.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <section key={group.exerciseId} className="flex flex-col gap-1.5">
                <h3 className="text-xs uppercase tracking-wider text-muted px-1">
                  {exerciseName(state, group.exerciseId)}
                </h3>
                {group.sets.map((log) => (
                  <SetLine
                    key={`${log.id}:${openSet === log.id}`}
                    log={log}
                    position={log.setIndex + 1}
                    open={openSet === log.id}
                    weightStep={settings.weightStep}
                    onOpen={() => setOpenSet(openSet === log.id ? null : log.id)}
                    onSave={(draft) => saveSet(log, draft)}
                    onDelete={() => deleteSet(log)}
                  />
                ))}
              </section>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteSession}
        title="Borrar esta sesion"
        description="Se borran todas sus series y los records que hayan salido de ella. Esto no se puede deshacer."
        confirmLabel="Borrar"
      />
    </>
  )
}
