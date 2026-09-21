import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, NotebookPen } from 'lucide-react'
import { cn } from '@/core/ui/cn'
import { newId } from '@/core/model/ids'
import { useData } from '@/core/sync/data-context'
import { findSessionNote } from '@/core/sync/selectors'

type Props = {
  sessionId: string
  exerciseId: string
}

/** Notas del ejercicio, guardadas por sesion. Colapsadas para no estorbar. */
export function NotesPanel({ sessionId, exerciseId }: Props) {
  const { state, save } = useData()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const note = findSessionNote(state, sessionId, exerciseId)

  const previousNote = useMemo(() => {
    const sessions = Object.values(state.sessions)
      .filter((session) => !session.deleted && session.id !== sessionId)
      .sort((a, b) => b.startedAt - a.startedAt)
    for (const session of sessions) {
      const found = findSessionNote(state, session.id, exerciseId)
      if (found?.text.trim()) return found.text.trim()
    }
    return null
  }, [state, sessionId, exerciseId])

  useEffect(() => {
    setText(note?.text ?? '')
  }, [note?.text, exerciseId])

  const commit = () => {
    const clean = text.trim()
    if (clean === (note?.text ?? '')) return
    if (note) {
      save('sessionNotes', { ...note, text: clean })
    } else if (clean) {
      save('sessionNotes', { id: newId(), sessionId, exerciseId, text: clean })
    }
  }

  const hasContent = Boolean(note?.text.trim()) || Boolean(text.trim())

  return (
    <div className="rounded-control border border-line bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center gap-2 h-12 px-3 text-left"
      >
        <NotebookPen size={18} className={hasContent ? 'text-accent' : 'text-muted'} />
        <span className="flex-1 text-sm text-muted truncate">
          {hasContent ? (note?.text || text).trim() : 'Nota de este ejercicio'}
        </span>
        <ChevronDown
          size={18}
          className={cn('text-muted transition-transform duration-200 shrink-0', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2 border-t border-line pt-3">
          {previousNote && (
            <p className="text-xs text-muted leading-relaxed">
              <span className="uppercase tracking-wider">Última vez:</span> {previousNote}
            </p>
          )}
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={commit}
            rows={3}
            placeholder="Cómo se sintió, qué ajustar la próxima vez..."
            className="w-full p-3 rounded-control bg-elevated border border-line text-text placeholder:text-muted/70 focus:border-accent focus:outline-none resize-none"
          />
        </div>
      )}
    </div>
  )
}
