import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

/** Contenedor de cada seccion: ancho comodo en PC, margenes justos en celular. */
export function Screen({ title, description, actions, children }: Props) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-8 md:py-8">
      <div className="flex items-start justify-between gap-4 mb-5 md:mb-7">
        <div className="hidden md:block min-w-0">
          <h1 className="text-[28px] font-bold tracking-tight text-shine truncate">{title}</h1>
          {description && <p className="text-sm text-muted mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
