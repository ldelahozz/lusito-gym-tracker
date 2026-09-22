/**
 * Tamaño del texto: agranda toda la app (letras, botones y espacios en la misma
 * proporcion), como el zoom del navegador pero guardado en la app.
 *
 * Es de cada dispositivo: puedes tener letra grande en el celular y normal en la PC.
 */

export const TEXT_SIZES = [
  { id: 'normal', label: 'Normal', zoom: 1 },
  { id: 'large', label: 'Grande', zoom: 1.12 },
  { id: 'xlarge', label: 'Muy grande', zoom: 1.25 },
] as const

export type TextSize = (typeof TEXT_SIZES)[number]['id']

const KEY = 'lgt.textSize'

export function readTextSize(): TextSize {
  try {
    const stored = localStorage.getItem(KEY)
    return TEXT_SIZES.some((size) => size.id === stored) ? (stored as TextSize) : 'normal'
  } catch {
    return 'normal'
  }
}

/** Aplica el tamaño a toda la pagina. Se llama al abrir la app y al cambiarlo. */
export function applyTextSize(size: TextSize): void {
  const zoom = TEXT_SIZES.find((item) => item.id === size)?.zoom ?? 1
  document.documentElement.style.zoom = zoom === 1 ? '' : String(zoom)
}

export function saveTextSize(size: TextSize): void {
  try {
    localStorage.setItem(KEY, size)
  } catch {
    /* modo privado: se aplica igual, solo que no se recuerda */
  }
  applyTextSize(size)
}
