/**
 * Deteccion de plataforma y de lo que soporta cada aparato.
 *
 * La app funciona igual en Android, iPhone/iPad y PC. Lo unico que cambia
 * es como se instala y que avisos estan disponibles:
 *  - Vibracion: Android si, iPhone no (Safari no la expone).
 *  - Pantalla siempre encendida (Wake Lock): Android si, iPhone desde iOS 16.4.
 *  - Notificaciones: en iPhone solo si la app esta instalada en la pantalla de inicio.
 * Todo lo no soportado se degrada en silencio, nunca da error.
 */

export type Platform = 'ios' | 'android' | 'desktop'

export function getPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPad con iPadOS se anuncia como Mac, pero tiene pantalla tactil.
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  if (isIOS) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

/** true cuando la app se abrio instalada (sin barra de navegador). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

export function supportsVibration(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function supportsWakeLock(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

export function supportsNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Pide al navegador que no borre los datos guardados en este dispositivo.
 * Importante sobre todo en iPhone, donde Safari limpia datos de sitios poco usados.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
