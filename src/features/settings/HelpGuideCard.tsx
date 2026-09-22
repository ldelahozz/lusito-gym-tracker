import { ChevronDown } from 'lucide-react'
import { Card } from '@/core/ui/Card'
import { HELP, type HelpKey } from '@/core/help'

/** Orden de lectura: primero lo que usas al entrenar, luego lo de progreso y cuerpo. */
const ORDER: HelpKey[] = [
  'rir',
  'repRange',
  'rest',
  'warmup',
  'suggestion',
  'skip',
  'trend',
  'records',
  'e1rm',
  'volume',
  'relativeStrength',
  'protein',
  'calories',
]

/** Todas las explicaciones de los globos "?", juntas en un solo lugar. */
export function HelpGuideCard() {
  return (
    <Card className="flex flex-col divide-y divide-white/[0.06] overflow-hidden">
      {ORDER.map((key) => {
        const topic = HELP[key]
        return (
          <details key={key} className="group">
            <summary className="flex items-center gap-3 min-h-12 px-4 py-2.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="flex-1 text-[15px]">{topic.title}</span>
              <ChevronDown size={17} className="text-muted shrink-0 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 -mt-1 flex flex-col gap-2 text-sm leading-relaxed text-[#c9cfd8]">
              {topic.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {'source' in topic && topic.source && <p className="text-xs text-muted">Fuente: {topic.source}</p>}
            </div>
          </details>
        )
      })}
    </Card>
  )
}
