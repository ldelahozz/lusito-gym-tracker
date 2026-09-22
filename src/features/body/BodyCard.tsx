import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Plus, Scale } from 'lucide-react'
import { Button } from '@/core/ui/Button'
import { Card } from '@/core/ui/Card'
import { InfoTip } from '@/core/ui/InfoTip'
import { Sparkline } from '@/core/ui/Sparkline'
import {
  ageFrom,
  latestWeight,
  maintenanceCalories,
  proteinRange,
  trainingDaysPerWeek,
  weightChange,
  weightHistory,
} from '@/core/logic/body'
import { formatDaysAgo, formatWeight } from '@/core/logic/format'
import { normalizeSplit } from '@/core/logic/weekPlan'
import { useData } from '@/core/sync/data-context'
import { WeightEntryModal } from './WeightEntryModal'

/** "Tu cuerpo" en Progreso: tu peso y lo que se puede estimar con el. */
export function BodyCard() {
  const { state, settings } = useData()
  const navigate = useNavigate()
  const [logging, setLogging] = useState(false)
  const now = Date.now()

  const entries = useMemo(() => weightHistory(Object.values(state.bodyWeights)), [state.bodyWeights])
  const weight = latestWeight(entries)
  const last = entries[entries.length - 1]
  const change = weightChange(entries, 30, now)
  const profile = settings.profile ?? { sex: null, birthYear: null, heightCm: null }

  const days = trainingDaysPerWeek({
    plannedDays: normalizeSplit(settings.weeklySplit).filter((day) => day !== null).length,
    sessionStarts: Object.values(state.sessions)
      .filter((session) => !session.deleted && session.endedAt !== null)
      .map((session) => session.startedAt),
    now,
  })
  const calories = maintenanceCalories({
    sex: profile.sex,
    weightKg: weight,
    heightCm: profile.heightCm,
    age: ageFrom(profile.birthYear, now),
    trainingDaysPerWeek: days,
  })
  const protein = weight ? proteinRange(weight) : null

  return (
    <Card className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center size-10 shrink-0 rounded-full bg-accent-soft text-accent-hi">
          <Scale size={18} />
        </span>
        <div className="flex-1 min-w-0">
          {weight ? (
            <>
              <p className="text-xl font-bold tabular-nums leading-tight">
                {formatWeight(weight)} <span className="text-sm font-medium text-muted">kg</span>
              </p>
              <p className="text-xs text-muted flex items-center gap-1">
                {last && formatDaysAgo(last.measuredAt, now)}
                {change !== null && change !== 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    {change > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {formatWeight(Math.abs(change))} kg en 30 días
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] font-semibold">Tu peso</p>
              <p className="text-xs text-muted">Regístralo para ver proteína, calorías y fuerza relativa.</p>
            </>
          )}
        </div>
        <Sparkline values={entries.slice(-12).map((entry) => entry.weightKg)} width={72} height={30} label="Tu peso en el tiempo" />
      </div>

      <Button size="sm" onClick={() => setLogging(true)}>
        <Plus size={16} />
        Registrar peso
      </Button>

      {protein && (
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-control surface-well">
            <p className="text-xs text-muted flex items-center gap-1.5">
              Proteína al día
              <InfoTip topic="protein" />
            </p>
            <p className="mt-0.5 text-base font-bold tabular-nums">
              {protein.min}–{protein.max} g
            </p>
          </div>
          <div className="p-3 rounded-control surface-well">
            <p className="text-xs text-muted flex items-center gap-1.5">
              Mantenimiento
              <InfoTip topic="calories" />
            </p>
            {calories ? (
              <p className="mt-0.5 text-base font-bold tabular-nums">
                ≈ {calories.toLocaleString('es-MX')} <span className="text-xs font-medium text-muted">kcal</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/ajustes')}
                className="mt-0.5 text-left text-xs text-accent-hi min-h-11"
              >
                Completa tus datos en Ajustes
              </button>
            )}
          </div>
        </div>
      )}

      {logging && <WeightEntryModal open lastWeight={weight} onClose={() => setLogging(false)} />}
    </Card>
  )
}
