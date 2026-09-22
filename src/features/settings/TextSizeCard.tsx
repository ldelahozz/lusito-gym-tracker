import { useState } from 'react'
import { Card } from '@/core/ui/Card'
import { cn } from '@/core/ui/cn'
import { TEXT_SIZES, readTextSize, saveTextSize, type TextSize } from '@/core/textSize'

/** Tamaño del texto de toda la app, solo en este dispositivo. */
export function TextSizeCard() {
  const [size, setSize] = useState<TextSize>(() => readTextSize())

  const choose = (next: TextSize) => {
    setSize(next)
    saveTextSize(next)
  }

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div>
        <p className="text-[15px] font-semibold">Tamaño del texto</p>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Agranda letras y botones de toda la app. Solo cambia en este dispositivo.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-control surface-well" role="radiogroup" aria-label="Tamaño del texto">
        {TEXT_SIZES.map((option, index) => {
          const selected = option.id === size
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(option.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-h-14 rounded-[11px] transition-[background-color,transform] duration-150 active:scale-95',
                selected ? 'surface-glow font-semibold' : 'text-muted hover:text-text',
              )}
            >
              {/* La "A" crece con cada opcion: se entiende sin leer. */}
              <span aria-hidden="true" className="font-bold leading-none" style={{ fontSize: 15 + index * 4 }}>
                A
              </span>
              <span className="text-xs">{option.label}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
