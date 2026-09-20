import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from './cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          'w-full h-12 px-3 rounded-control bg-elevated border border-line text-text',
          'placeholder:text-muted/70',
          'focus:border-accent focus:outline-none',
          'transition-colors duration-150',
          className,
        )}
      />
    )
  },
)
