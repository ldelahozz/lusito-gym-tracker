import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, ArchiveRestore, ArrowLeft, Dumbbell, Merge, Pencil, Trash } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { ConfirmDialog } from '@/core/ui/ConfirmDialog'
import { EmptyState } from '@/core/ui/EmptyState'
import { Field } from '@/core/ui/Field'
import { IconButton } from '@/core/ui/IconButton'
import { Input } from '@/core/ui/Input'
import { Modal } from '@/core/ui/Modal'
import { Screen } from '@/core/ui/Screen'
import { useToast } from '@/core/ui/toast-context'
import { cleanExerciseName, findExerciseByName, normalizeExerciseName, planExerciseMerge } from '@/core/logic/names'
import type { Exercise } from '@/core/model/types'
import type { CollectionName } from '@/core/sync/collections'
import { useData, type NewDoc } from '@/core/sync/data-context'
import {
  countRoutinesUsing,
  countSetsOf,
  exerciseHasHistory,
  listExercises,
} from '@/core/sync/selectors'

type SaveEntry = { collection: CollectionName; doc: NewDoc<CollectionName> }

export function ExerciseCatalogScreen() {
  const navigate = useNavigate()
  const { state, save, saveMany, remove } = useData()
  const { showToast } = useToast()

  const [showArchived, setShowArchived] = useState(false)
  const [renaming, setRenaming] = useState<Exercise | null>(null)
  const [renameText, setRenameText] = useState('')
  const [merging, setMerging] = useState<Exercise | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Exercise | null>(null)

  const exercises = useMemo(() => listExercises(state, showArchived), [state, showArchived])
  const archivedCount = useMemo(
    () => listExercises(state, true).filter((exercise) => exercise.archived).length,
    [state],
  )
  const mergeCandidates = useMemo(
    () => listExercises(state, true).filter((exercise) => exercise.id !== merging?.id),
    [state, merging],
  )

  const applyRename = () => {
    if (!renaming) return
    const clean = cleanExerciseName(renameText)
    if (!clean) return
    const duplicate = findExerciseByName(
      listExercises(state, true).filter((exercise) => exercise.id !== renaming.id),
      clean,
    )
    if (duplicate) {
      showToast('Ya existe un ejercicio con ese nombre. Usa Fusionar.')
      return
    }
    save('exercises', { ...renaming, name: clean, normalizedName: normalizeExerciseName(clean) })
    setRenaming(null)
    showToast('Nombre actualizado en todo el historial')
  }

  const applyMerge = () => {
    if (!merging || !mergeTargetId) return
    const plan = planExerciseMerge({
      sourceId: merging.id,
      targetId: mergeTargetId,
      routineExercises: Object.values(state.routineExercises).filter((link) => !link.deleted),
      setLogs: Object.values(state.setLogs).filter((log) => !log.deleted),
      sessionNotes: Object.values(state.sessionNotes).filter((note) => !note.deleted),
      personalRecords: Object.values(state.personalRecords).filter((record) => !record.deleted),
    })

    const entries: SaveEntry[] = []
    const reassign = (collection: CollectionName, ids: string[]) => {
      for (const id of ids) {
        const current = (state[collection] as Record<string, { id: string }>)[id]
        if (current) entries.push({ collection, doc: { ...current, exerciseId: mergeTargetId } as NewDoc<CollectionName> })
      }
    }

    reassign('routineExercises', plan.reassign.routineExercises)
    reassign('setLogs', plan.reassign.setLogs)
    reassign('sessionNotes', plan.reassign.sessionNotes)
    reassign('personalRecords', plan.reassign.personalRecords)

    for (const id of plan.dropRoutineExercises) {
      const current = state.routineExercises[id]
      if (current) entries.push({ collection: 'routineExercises', doc: { ...current, deleted: true } })
    }

    entries.push({ collection: 'exercises', doc: { ...merging, deleted: true } })

    saveMany(entries)
    setMerging(null)
    setMergeTargetId(null)
    showToast('Ejercicios fusionados, con todo su historial')
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    for (const link of Object.values(state.routineExercises)) {
      if (!link.deleted && link.exerciseId === pendingDelete.id) remove('routineExercises', link)
    }
    remove('exercises', pendingDelete)
    setPendingDelete(null)
    showToast('Ejercicio eliminado')
  }

  const targetName = mergeTargetId ? state.exercises[mergeTargetId]?.name : ''

  return (
    <Screen
      title="Ejercicios"
      description="Tu catálogo. Renombrar cambia el nombre en todo el historial; fusionar junta dos historiales en uno."
      actions={
        <Button variant="ghost" onClick={() => navigate('/rutinas')}>
          <ArrowLeft size={18} />
          Rutinas
        </Button>
      }
    >
      {exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={showArchived ? 'No hay ejercicios archivados' : 'El catálogo está vacío'}
          description="Los ejercicios se crean solos cuando los agregas a una rutina."
        />
      ) : (
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
          {exercises.map((exercise) => {
            const routines = countRoutinesUsing(state, exercise.id)
            const sets = countSetsOf(state, exercise.id)
            const hasHistory = exerciseHasHistory(state, exercise.id)
            return (
              <Card key={exercise.id} className="p-3 pl-4 flex flex-col gap-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium truncate">{exercise.name}</p>
                  <p className="text-sm text-muted">
                    {routines === 0 ? 'En ninguna rutina' : `En ${routines} ${routines === 1 ? 'rutina' : 'rutinas'}`}
                    {sets > 0 ? ` · ${sets} series registradas` : ''}
                    {exercise.archived ? ' · Archivado' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 -ml-2">
                  <IconButton
                    icon={Pencil}
                    label="Renombrar"
                    onClick={() => {
                      setRenaming(exercise)
                      setRenameText(exercise.name)
                    }}
                  />
                  <IconButton
                    icon={Merge}
                    label="Fusionar con otro"
                    onClick={() => {
                      setMerging(exercise)
                      setMergeTargetId(null)
                    }}
                  />
                  <IconButton
                    icon={exercise.archived ? ArchiveRestore : Archive}
                    label={exercise.archived ? 'Restaurar' : 'Archivar'}
                    onClick={() => save('exercises', { ...exercise, archived: !exercise.archived })}
                  />
                  {!hasHistory && (
                    <IconButton icon={Trash} label="Eliminar" onClick={() => setPendingDelete(exercise)} />
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {archivedCount > 0 && (
        <div className="mt-6 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? 'Ocultar archivados' : `Ver archivados (${archivedCount})`}
          </Button>
        </div>
      )}

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Renombrar ejercicio"
        description="El nuevo nombre se aplica a todo el historial de este ejercicio."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={applyRename}>
              Guardar
            </Button>
          </>
        }
      >
        <Field label="Nombre">
          <Input
            value={renameText}
            onChange={(event) => setRenameText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyRename()
            }}
            autoFocus
          />
        </Field>
      </Modal>

      <Modal
        open={merging !== null}
        onClose={() => setMerging(null)}
        title="Fusionar ejercicios"
        description={`Elige con cuál se junta "${merging?.name ?? ''}". Todo su historial pasará al que elijas.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMerging(null)}>
              Cancelar
            </Button>
            <Button variant="primary" disabled={!mergeTargetId} onClick={applyMerge}>
              Fusionar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {mergeCandidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setMergeTargetId(candidate.id)}
              className={
                mergeTargetId === candidate.id
                  ? 'flex items-center h-12 px-3 rounded-control text-left text-[15px] bg-accent-soft text-accent'
                  : 'flex items-center h-12 px-3 rounded-control text-left text-[15px] hover:bg-surface'
              }
            >
              <span className="truncate">{candidate.name}</span>
            </button>
          ))}
        </div>
        {mergeTargetId && (
          <p className="text-sm text-muted leading-relaxed">
            &laquo;{merging?.name}&raquo; desaparecerá del catálogo y sus series quedarán registradas
            en &laquo;{targetName}&raquo;.
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar ejercicio"
        description={`Se elimina "${pendingDelete?.name ?? ''}" del catálogo. No tiene series registradas, así que no pierdes historial.`}
        confirmLabel="Eliminar"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Screen>
  )
}
