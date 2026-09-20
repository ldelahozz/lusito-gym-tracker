import { cn } from './cn'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

/** Interruptor de encendido/apagado con su etiqueta. */
export function Switch({ checked, onChange, label, description, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-center gap-3 py-2 text-left',
        disabled && 'opacity-40 pointer-events-none',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{label}</span>
        {description && <span className="block text-xs text-muted leading-relaxed">{description}</span>}
      </span>
      <span
        className={cn(
          'shrink-0 w-12 h-7 rounded-full p-0.5 transition-colors duration-150',
          checked ? 'bg-accent' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'block size-6 rounded-full bg-canvas transition-transform duration-150',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}
