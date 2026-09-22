import type { ReactNode } from 'react'
import type { HelpKey } from '@/core/help'
import { InfoTip } from './InfoTip'

type Props = {
  label: string
  hint?: string
  /** Globo de ayuda junto a la etiqueta. */
  help?: HelpKey
  children: ReactNode
}

export function Field({ label, hint, help, children }: Props) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="section-label flex items-center gap-2">
        {label}
        {help && <InfoTip topic={help} />}
      </span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}
