import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-canvas font-semibold hover:brightness-110 active:brightness-95',
  secondary: 'bg-elevated text-text border border-line hover:border-accent-dim active:bg-surface',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-elevated',
}

const SIZES: Record<Size, string> = {
  sm: 'h-10 px-3 text-sm rounded-[10px]',
  md: 'h-12 px-4 text-[15px] rounded-control',
  lg: 'h-14 px-5 text-base rounded-control',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  block?: boolean
  children?: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', block, className, ...props }: Props) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 select-none',
        'transition-[filter,background-color,border-color] duration-150 ease-out-soft',
        'disabled:opacity-40 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
    />
  )
}
