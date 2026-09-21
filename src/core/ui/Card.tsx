import type { HTMLAttributes } from 'react'
import { cn } from './cn'

type Props = HTMLAttributes<HTMLDivElement> & {
  /** "hero" es la tarjeta protagonista de la pantalla: con luz de color. */
  variant?: 'default' | 'hero'
}

export function Card({ variant = 'default', className, ...props }: Props) {
  return (
    <div
      {...props}
      className={cn(variant === 'hero' ? 'surface-hero' : 'surface-card', 'rounded-card', className)}
    />
  )
}
