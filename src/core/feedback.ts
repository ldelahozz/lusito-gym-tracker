/**
 * Avisos al terminar el descanso: vibracion, pitido y notificacion.
 *
 * Todo es "mejor esfuerzo": si el aparato no lo soporta (por ejemplo, el iPhone
 * no tiene vibracion en el navegador), simplemente no pasa nada, nunca da error.
 */

let audioContext: AudioContext | null = null

type AudioContextConstructor = new () => AudioContext

function getAudioContextClass(): AudioContextConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const legacy = (window as unknown as { webkitAudioContext?: AudioContextConstructor })
    .webkitAudioContext
  return window.AudioContext ?? legacy
}

/**
 * Los navegadores solo permiten sonar despues de que tocas algo.
 * Por eso esto se llama justo al tocar "Termine serie".
 */
export function unlockAudio(): void {
  try {
    const AudioContextClass = getAudioContextClass()
    if (!AudioContextClass) return
    if (!audioContext) audioContext = new AudioContextClass()
    if (audioContext.state === 'suspended') void audioContext.resume()
  } catch {
    audioContext = null
  }
}

/** Dos pitidos cortos, suaves. */
export function beep(enabled: boolean): void {
  if (!enabled) return
  try {
    unlockAudio()
    if (!audioContext) return
    const context = audioContext
    const start = context.currentTime

    for (const [index, frequency] of [880, 1175].entries()) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const at = start + index * 0.22

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, at)
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)

      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(at)
      oscillator.stop(at + 0.2)
    }
  } catch {
    /* sin sonido, pero la app sigue */
  }
}

/** Vibracion. En iPhone no existe y se ignora sin error. */
export function vibrate(enabled: boolean, pattern: number | number[]): void {
  if (!enabled) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignorado */
  }
}

/** Golpecito corto al guardar una serie. */
export function tapFeedback(enabled: boolean): void {
  vibrate(enabled, 12)
}

/** Patron de fin de descanso: dos toques. */
export function restFinishedFeedback(sound: boolean, vibration: boolean): void {
  vibrate(vibration, [120, 80, 120])
  beep(sound)
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function askNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/**
 * Aviso del sistema al terminar el descanso, solo si ya diste permiso.
 * Se manda a traves del service worker para que llegue aunque la app este en segundo plano.
 */
export async function notifyRestFinished(exerciseName: string): Promise<void> {
  try {
    if (notificationPermission() !== 'granted') return
    const registration = await navigator.serviceWorker?.getRegistration()
    const options: NotificationOptions = {
      body: exerciseName,
      tag: 'descanso',
      silent: false,
    }
    if (registration) {
      await registration.showNotification('Descanso terminado', options)
    } else {
      new Notification('Descanso terminado', options)
    }
  } catch {
    /* ignorado */
  }
}
