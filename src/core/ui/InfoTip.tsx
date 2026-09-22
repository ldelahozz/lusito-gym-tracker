import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleHelp, X } from 'lucide-react'
import { HELP, type HelpKey } from '@/core/help'
import { cn } from './cn'

type Position = {
  left: number
  top?: number
  bottom?: number
  width: number
  /** Donde cae la puntita del globo, medido desde su orilla izquierda. */
  arrow: number
  above: boolean
}

const MAX_WIDTH = 320
const GAP = 8
const EDGE = 12

/** Zoom de "Tamaño del texto": las posiciones fijas se miden en pixeles sin zoom. */
function pageZoom(): number {
  const zoom = Number.parseFloat(document.documentElement.style.zoom || '1')
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1
}

/**
 * Globo de ayuda: un "?" pequeño que, al tocarlo, explica en pocas palabras.
 * Se cierra tocando fuera, con la X, con Escape o al desplazar la pantalla.
 */
export function InfoTip({ topic, className }: { topic: HelpKey; className?: string }) {
  const help = HELP[topic]
  const id = useId()
  const button = useRef<HTMLButtonElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position | null>(null)

  const close = () => setPosition(null)

  const open = (forceAbove = false) => {
    const rect = button.current?.getBoundingClientRect()
    if (!rect) return
    const zoom = pageZoom()
    const viewportWidth = window.innerWidth / zoom
    const viewportHeight = window.innerHeight / zoom
    const center = (rect.left + rect.width / 2) / zoom
    const width = Math.min(MAX_WIDTH, viewportWidth - EDGE * 2)
    const left = Math.min(Math.max(center - width / 2, EDGE), viewportWidth - width - EDGE)
    // Abajo del "?" si cabe; si no, arriba.
    const above = forceAbove || (rect.bottom / zoom + 240 > viewportHeight && rect.top / zoom > 240)
    setPosition({
      left,
      width,
      arrow: Math.min(Math.max(center - left, 18), width - 18),
      above,
      ...(above
        ? { bottom: viewportHeight - rect.top / zoom + GAP }
        : { top: rect.bottom / zoom + GAP }),
    })
  }

  // Si el globo no cupo abajo (texto largo o letra grande), se voltea hacia arriba.
  useLayoutEffect(() => {
    if (!position || position.above || !bubble.current) return
    const overflow = bubble.current.getBoundingClientRect().bottom > window.innerHeight - EDGE
    const room = (button.current?.getBoundingClientRect().top ?? 0) > bubble.current.offsetHeight + GAP * 2
    if (overflow && room) open(true)
  })

  useEffect(() => {
    if (!position) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (bubble.current?.contains(target) || button.current?.contains(target)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    // Si cambia el tamaño de la pantalla (en el celular pasa al esconderse la barra
    // del navegador), el globo se reacomoda en lugar de cerrarse.
    const onResize = () => open(position.above)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', close, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', close)
      window.removeEventListener('resize', onResize)
    }
  }, [position])

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={`Ayuda: ${help.title}`}
        aria-expanded={position !== null}
        aria-controls={position ? id : undefined}
        onClick={(event) => {
          // Dentro de una etiqueta o una fila tocable, el "?" no activa lo de alrededor.
          event.preventDefault()
          event.stopPropagation()
          if (position) close()
          else open()
        }}
        className={cn(
          // Se ve chiquito, pero se puede tocar en un area de 36 px.
          'inline-grid place-items-center size-9 -m-2 shrink-0 rounded-full align-middle',
          'text-muted/80 hover:text-accent-hi transition-colors duration-150',
          position && 'text-accent-hi',
          className,
        )}
      >
        <CircleHelp size={16} strokeWidth={2} />
      </button>

      {position &&
        createPortal(
          <div
            ref={bubble}
            id={id}
            role="dialog"
            aria-label={help.title}
            className={cn(
              'fixed z-50 surface-sheet rounded-[18px] p-4 pr-3 text-left',
              'shadow-[0_18px_44px_-14px_rgb(0_0_0/0.95)]',
              'animate-[toast-in_200ms_var(--ease-spring)]',
            )}
            style={{ left: position.left, top: position.top, bottom: position.bottom, width: position.width }}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute size-3 rotate-45 bg-[#181c22] border-white/[0.07]',
                position.above ? '-bottom-1.5 border-r border-b' : '-top-1.5 border-l border-t',
              )}
              style={{ left: position.arrow - 6 }}
            />
            <div className="flex items-start gap-2">
              <p className="flex-1 text-[15px] font-semibold leading-snug">{help.title}</p>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar ayuda"
                className="grid place-items-center size-9 -mt-2 -mr-1 shrink-0 rounded-full text-muted hover:text-text"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-1.5 flex flex-col gap-2 text-sm leading-relaxed text-[#c9cfd8]">
              {help.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {'source' in help && help.source && (
              <p className="mt-2.5 text-xs text-muted">Fuente: {help.source}</p>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
