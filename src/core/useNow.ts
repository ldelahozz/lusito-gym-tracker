import { useEffect, useState } from 'react'

/**
 * Hora actual que se refresca cada segundo mientras haga falta.
 *
 * Tambien se recalcula al volver a la app (visibilitychange y focus), que es lo
 * que hace que el cronometro y el descanso sigan correctos tras bloquear el celular.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return

    const tick = () => setNow(Date.now())
    tick()

    const interval = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    window.addEventListener('pageshow', tick)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [active, intervalMs])

  return now
}
