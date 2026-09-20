import { useEffect } from 'react'

type WakeLockSentinelLike = { release: () => Promise<void>; released: boolean }
type WakeLockLike = { request: (type: 'screen') => Promise<WakeLockSentinelLike> }

/**
 * Mantiene la pantalla encendida mientras entrenas.
 *
 * Android la soporta; iPhone desde iOS 16.4. Si el navegador no la tiene,
 * no pasa nada. Se vuelve a pedir al regresar a la app, porque el sistema
 * la suelta cada vez que sales.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock
    if (!wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const request = async () => {
      if (cancelled || document.visibilityState !== 'visible') return
      try {
        sentinel = await wakeLock.request('screen')
      } catch {
        /* el sistema puede negarla, por ejemplo con poca bateria */
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) {
        void request()
      }
    }

    void request()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void sentinel?.release().catch(() => undefined)
    }
  }, [active])
}
