import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Card } from '@/core/ui/Card'
import { Input } from '@/core/ui/Input'
import { cn } from '@/core/ui/cn'
import type { BodyProfile, Sex } from '@/core/model/types'
import { useData } from '@/core/sync/data-context'

const EMPTY: BodyProfile = { sex: null, birthYear: null, heightCm: null }

const SEX_OPTIONS: Array<{ value: Sex | null; label: string }> = [
  { value: 'male', label: 'Hombre' },
  { value: 'female', label: 'Mujer' },
  { value: null, label: 'Prefiero no decir' },
]

/** Convierte lo escrito en un numero dentro de un rango, o null si esta vacio o no tiene sentido. */
function parseInRange(text: string, min: number, max: number): number | null {
  const value = Number(text.trim().replace(',', '.'))
  if (text.trim() === '' || !Number.isFinite(value)) return null
  return value >= min && value <= max ? Math.round(value) : null
}

/** Datos del cuerpo para las estimaciones de Progreso. Todo es opcional. */
export function ProfileCard() {
  const { settings, save } = useData()
  const profile = settings.profile ?? EMPTY
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(profile.birthYear ? String(profile.birthYear) : '')
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : '')

  const update = (patch: Partial<BodyProfile>) => {
    save('settings', { ...settings, profile: { ...profile, ...patch } })
  }

  return (
    <Card className="p-4 flex flex-col gap-4">
      <p className="text-sm text-muted leading-relaxed">
        Con tu peso (en Progreso) y estos datos, la app estima tu proteína y tus calorías de mantenimiento.
      </p>

      <div className="flex flex-col gap-1.5">
        <span className="section-label">Sexo</span>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-control surface-well" role="radiogroup" aria-label="Sexo">
          {SEX_OPTIONS.map((option) => {
            const selected = profile.sex === option.value
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ sex: option.value })}
                className={cn(
                  'min-h-11 px-1 rounded-[11px] text-sm leading-tight transition-[background-color,transform] duration-150 active:scale-95',
                  selected ? 'surface-glow font-semibold' : 'text-muted hover:text-text',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        <span className="text-xs text-muted">Solo cambia la fórmula de las calorías.</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="section-label">Año de nacimiento</span>
          <Input
            inputMode="numeric"
            placeholder="1995"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            onBlur={() => {
              const value = parseInRange(year, thisYear - 100, thisYear - 10)
              setYear(value ? String(value) : '')
              update({ birthYear: value })
            }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="section-label">Altura (cm)</span>
          <Input
            inputMode="numeric"
            placeholder="175"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            onBlur={() => {
              const value = parseInRange(height, 100, 250)
              setHeight(value ? String(value) : '')
              update({ heightCm: value })
            }}
          />
        </label>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted leading-relaxed">
        <Lock size={14} className="shrink-0 mt-0.5" />
        Se guardan solo en tu cuenta, como el resto de tus datos. Nadie más los ve.
      </p>
    </Card>
  )
}
