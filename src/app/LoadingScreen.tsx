import { AppMark } from './AppMark'

/** Misma imagen que la pantalla de carga del index.html: nunca parpadea en blanco. */
export function LoadingScreen({ label = 'Cargando' }: { label?: string }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4 bg-canvas">
      <div className="animate-pulse">
        <AppMark size={56} />
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}
