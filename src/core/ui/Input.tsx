import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from './cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          'w-full h-12 px-3.5 rounded-control surface-well text-text',
          'placeholder:text-muted/70',
          'focus:border-accent-dim focus:outline-none focus:shadow-[inset_0_2px_6px_rgb(0_0_0/0.55),0_0_0_3px_rgb(76_141_255/0.15)]',
          'transition-colors duration-150',
          className,
        )}
      />
    )
  },
)
