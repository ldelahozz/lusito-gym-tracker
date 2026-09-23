/**
 * Temporizador flotante: el descanso en una ventanita que se queda encima de
 * otras apps (WhatsApp, musica...), con la funcion "imagen en imagen" del
 * sistema.
 *
 * Esa ventanita solo sabe mostrar video, asi que el temporizador se dibuja en
 * un lienzo y ese lienzo se convierte en un video en vivo. Android solo deja
 * abrirla con un toque de la persona, por eso siempre sale de un boton.
 *
 * Funciona en Chrome para Android (version 105 o mas nueva) y en Chrome de PC.
 * Donde no se puede, el boton simplemente no aparece.
 */

export type FloatingState = {
  remainingMs: number
  totalMs: number
  /** Lo que sigue: "Serie 3 · 82.5 kg × 6". */
  nextUp: string
}

const WIDTH = 480
const HEIGHT = 270

const COLORS = {
  canvas: '#0d0f12',
  track: '#232a36',
  text: '#e6e8eb',
  muted: '#8a919c',
  accentFrom: '#6aa2ff',
  accentTo: '#8a74ff',
  done: '#7aabff',
}

let canvas: HTMLCanvasElement | null = null
let video: HTMLVideoElement | null = null
let loop: number | undefined
let source: (() => FloatingState | null) | null = null

export function canFloat(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.pictureInPictureEnabled === true &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    typeof HTMLVideoElement.prototype.requestPictureInPicture === 'function'
  )
}

export function isFloating(): boolean {
  return video !== null && document.pictureInPictureElement === video
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Recorta un texto con "…" para que quepa en el ancho dado. */
function fit(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && context.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
  return `${cut}…`
}

function draw(state: FloatingState | null): void {
  const context = canvas?.getContext('2d')
  if (!context) return
  const font = "'Inter Variable', system-ui, sans-serif"
  const remaining = state?.remainingMs ?? 0
  const finished = remaining <= 0
  const fraction = state && state.totalMs > 0 ? Math.min(1, remaining / state.totalMs) : 0

  context.fillStyle = COLORS.canvas
  context.fillRect(0, 0, WIDTH, HEIGHT)

  // Anillo a la izquierda con el tiempo al centro.
  const cx = 138
  const cy = HEIGHT / 2
  const radius = 98
  context.lineWidth = 16
  context.lineCap = 'round'
  context.strokeStyle = COLORS.track
  context.beginPath()
  context.arc(cx, cy, radius, 0, Math.PI * 2)
  context.stroke()
  if (fraction > 0) {
    const gradient = context.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius)
    gradient.addColorStop(0, COLORS.accentFrom)
    gradient.addColorStop(1, COLORS.accentTo)
    context.strokeStyle = gradient
    context.beginPath()
    context.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction)
    context.stroke()
  }
  context.fillStyle = finished ? COLORS.done : COLORS.text
  context.font = `700 58px ${font}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(formatClock(remaining), cx, cy + 2)

  // A la derecha: que hacer y que sigue.
  const left = 262
  const width = WIDTH - left - 22
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = COLORS.text
  context.font = `700 30px ${font}`
  context.fillText(finished ? '¡A la siguiente!' : 'Descansa', left, 104, width)
  context.fillStyle = COLORS.muted
  context.font = `500 22px ${font}`
  context.fillText('Sigue:', left, 148)
  context.fillStyle = COLORS.text
  context.font = `600 24px ${font}`
  context.fillText(fit(context, state?.nextUp ?? '', width), left, 182)
}

function stopLoop(): void {
  window.clearInterval(loop)
  loop = undefined
}

function teardown(): void {
  stopLoop()
  source = null
  const stream = video?.srcObject
  if (stream instanceof MediaStream) for (const track of stream.getTracks()) track.stop()
  video?.remove()
  video = null
  canvas = null
}

/**
 * Abre la ventanita. Debe llamarse desde un toque (Android lo exige).
 * `read` se consulta varias veces por segundo para redibujar.
 * Devuelve false si el dispositivo no lo permite o algo fallo.
 */
export async function openFloating(read: () => FloatingState | null): Promise<boolean> {
  if (!canFloat()) return false
  source = read
  if (isFloating()) return true
  teardown()
  source = read

  canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  draw(read())

  video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.setAttribute('aria-hidden', 'true')
  // Tiene que estar en la pagina, pero sin verse.
  Object.assign(video.style, {
    position: 'fixed',
    left: '0',
    bottom: '0',
    width: '2px',
    height: '2px',
    opacity: '0',
    pointerEvents: 'none',
  })
  document.body.appendChild(video)
  video.srcObject = canvas.captureStream()
  video.addEventListener('leavepictureinpicture', teardown, { once: true })

  try {
    await video.play()
    if (video.readyState === 0) {
      await new Promise<void>((resolve) => video?.addEventListener('loadedmetadata', () => resolve(), { once: true }))
    }
    await video.requestPictureInPicture()
  } catch {
    teardown()
    return false
  }

  // En segundo plano el sistema baja el ritmo a una vez por segundo: suficiente para un reloj.
  loop = window.setInterval(() => draw(source?.() ?? null), 250)
  return true
}

/** Cierra la ventanita si esta abierta. */
export function closeFloating(): void {
  if (isFloating()) void document.exitPictureInPicture().catch(() => undefined)
  teardown()
}
