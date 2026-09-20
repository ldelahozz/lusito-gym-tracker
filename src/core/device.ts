/**
 * Identidad del dispositivo.
 *
 * Cada registro que se guarda lleva de donde salio (deviceId) y de que tipo de
 * aparato (deviceKind). El tipo es lo que usa la regla de conflictos:
 * ante un choque entre celular y PC, gana el celular.
 */

const DEVICE_ID_KEY = 'lgt.deviceId'
const DEVICE_KIND_KEY = 'lgt.deviceKind'

export type DeviceKind = 'mobile' | 'desktop'

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* modo privado o almacenamiento lleno: seguimos sin persistir */
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

let cachedDeviceId: string | null = null

/** Identificador estable de este navegador/dispositivo. */
export function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId
  const stored = readStorage(DEVICE_ID_KEY)
  if (stored) {
    cachedDeviceId = stored
    return stored
  }
  const created = randomId()
  writeStorage(DEVICE_ID_KEY, created)
  cachedDeviceId = created
  return created
}

function detectDeviceKind(): DeviceKind {
  if (typeof navigator === 'undefined') return 'desktop'

  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
  if (typeof uaData?.mobile === 'boolean') return uaData.mobile ? 'mobile' : 'desktop'

  const coarsePointer =
    typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0
  if (coarsePointer) return 'mobile'

  return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
}

/** Tipo de dispositivo, con posibilidad de forzarlo a mano desde Ajustes. */
export function getDeviceKind(): DeviceKind {
  const override = readStorage(DEVICE_KIND_KEY)
  if (override === 'mobile' || override === 'desktop') return override
  return detectDeviceKind()
}

export function setDeviceKindOverride(kind: DeviceKind | null): void {
  try {
    if (kind) localStorage.setItem(DEVICE_KIND_KEY, kind)
    else localStorage.removeItem(DEVICE_KIND_KEY)
  } catch {
    /* ignorado */
  }
}
