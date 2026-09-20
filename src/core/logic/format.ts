/** Formatos de texto compartidos por varias pantallas. */

/** 150 -> "2:30" (siempre minutos y segundos) */
export function formatMinutesSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** 120 -> "2:00", 45 -> "45s" */
export function formatRest(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, '0')}` : `${rest}s`
}

/** 3_725_000 ms -> "1:02:05"; menos de una hora -> "12:34" */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

/** 62.5 -> "62.5", 60 -> "60" */
export function formatWeight(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : String(Math.round(kg * 100) / 100)
}
