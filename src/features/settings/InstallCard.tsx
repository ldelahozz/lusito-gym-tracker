import { Check, Share, SquarePlus } from 'lucide-react'
import { Card } from '@/core/ui/Card'
import { getPlatform, isStandalone } from '@/core/platform'

const STEPS: Record<ReturnType<typeof getPlatform>, string[]> = {
  android: [
    'Abre la app en Chrome.',
    'Toca el menú de los tres puntos, arriba a la derecha.',
    'Elige "Agregar a la pantalla principal" o "Instalar aplicación".',
  ],
  ios: [
    'Abre la app en Safari (no funciona desde Chrome en iPhone).',
    'Toca el botón Compartir, el cuadrito con la flecha hacia arriba.',
    'Baja y elige "Agregar a inicio".',
  ],
  desktop: [
    'Abre la app en Chrome o Edge.',
    'Busca el ícono de instalar en la barra de direcciones, a la derecha.',
    'Confirma "Instalar".',
  ],
}

export function InstallCard() {
  const platform = getPlatform()
  const installed = isStandalone()

  if (installed) {
    return (
      <Card className="p-4 flex items-center gap-3">
        <span className="grid place-items-center size-9 rounded-full bg-accent-soft text-accent shrink-0">
          <Check size={18} />
        </span>
        <p className="text-sm text-muted">La app ya está instalada en este dispositivo.</p>
      </Card>
    )
  }

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {platform === 'ios' ? <Share size={18} className="text-accent" /> : <SquarePlus size={18} className="text-accent" />}
        <h3 className="text-sm font-semibold">Instalar en este dispositivo</h3>
      </div>
      <ol className="flex flex-col gap-2">
        {STEPS[platform].map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-muted leading-relaxed">
            <span className="shrink-0 grid place-items-center size-5 mt-px rounded-full bg-elevated text-xs text-text">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </Card>
  )
}
