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
          'shrink-0 w-12 h-7 rounded-full p-0.5 transition-[background-color,box-shadow] duration-200',
          checked
            ? 'bg-accent shadow-[0_0_14px_-2px_rgb(76_141_255/0.7)]'
            : 'bg-[#232932] shadow-[inset_0_1px_3px_rgb(0_0_0/0.6)]',
        )}
      >
        <span
          className={cn(
            'block size-6 rounded-full transition-transform duration-200 ease-spring',
            checked ? 'bg-ink' : 'bg-[#8a919c]',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}
