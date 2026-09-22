import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/core/ui/Input'
import { cn } from '@/core/ui/cn'
import { newId } from '@/core/model/ids'
import {
  cleanExerciseName,
  findExerciseByName,
  normalizeExerciseName,
  suggestExercises,
} from '@/core/logic/names'
import { useData } from '@/core/sync/data-context'
import { listExercises } from '@/core/sync/selectors'

type Props = {
  /** Recibe tambien el nombre: un ejercicio recien creado aun no aparece en los datos. */
  onPick: (exerciseId: string, name: string) => void
  placeholder?: string
}

/**
 * Campo para agregar un ejercicio.
 * Sugiere los que ya usaste (sin importar acentos ni mayusculas) y,
 * si escribes uno nuevo, lo crea en el catalogo.
 */
export function ExercisePicker({ onPick, placeholder = 'Escribe un ejercicio...' }: Props) {
  const { state, save } = useData()
  const [query, setQuery] = useState('')

  const available = useMemo(() => listExercises(state), [state])
  const all = useMemo(() => listExercises(state, true), [state])
  const suggestions = useMemo(() => suggestExercises(available, query), [available, query])
  const trimmed = cleanExerciseName(query)
  const exactMatch = trimmed ? findExerciseByName(all, trimmed) : undefined

  const pick = (exerciseId: string, name: string) => {
    onPick(exerciseId, name)
    setQuery('')
  }

  const createFromQuery = () => {
    if (!trimmed) return
    if (exactMatch) {
      // Si existia archivado, se reactiva en lugar de crear un duplicado.
      if (exactMatch.archived) save('exercises', { ...exactMatch, archived: false })
      pick(exactMatch.id, exactMatch.name)
      return
    }
    const id = newId()
    save('exercises', {
      id,
      name: trimmed,
      normalizedName: normalizeExerciseName(trimmed),
      archived: false,
    })
    pick(id, trimmed)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              createFromQuery()
            }
          }}
          placeholder={placeholder}
          className="pl-10"
          autoComplete="off"
        />
      </div>

      {(suggestions.length > 0 || trimmed) && (
        <div className="flex flex-col gap-1">
          {trimmed && !exactMatch && (
            <button
              type="button"
              onClick={createFromQuery}
              className="flex items-center gap-2 h-12 px-3 rounded-control text-left text-[15px] text-accent bg-accent-soft"
            >
              <Plus size={18} className="shrink-0" />
              <span className="truncate">Crear &laquo;{trimmed}&raquo;</span>
            </button>
          )}

          {suggestions.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => pick(exercise.id, exercise.name)}
              className={cn(
                'flex items-center h-12 px-3 rounded-control text-left text-[15px]',
                'text-text hover:bg-elevated transition-colors duration-150',
              )}
            >
              <span className="truncate">{exercise.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
