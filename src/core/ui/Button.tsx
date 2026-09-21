import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg' | 'xl'

const VARIANTS: Record<Variant, string> = {
  primary: 'surface-glow font-semibold hover:brightness-110',
  secondary: 'surface-key text-text hover:brightness-125',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-elevated',
}

const SIZES: Record<Size, string> = {
  sm: 'h-10 px-3.5 text-sm rounded-[12px]',
  md: 'h-12 px-4 text-[15px] rounded-control',
  lg: 'h-14 px-5 text-base rounded-control',
  xl: 'h-[58px] px-6 text-[17px] rounded-[18px]',
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
        // Al tocar se hunde un poquito: se siente que respondio.
        'transition-[filter,background-color,transform] duration-150 ease-out-soft active:scale-[0.97]',
        'disabled:opacity-40 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
    />
  )
}
