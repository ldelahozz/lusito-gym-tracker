/**
 * Entregar un archivo a la persona.
 *
 * En el celular se intenta primero el menu de compartir del sistema (guardar en
 * Archivos, Drive, mandarlo por WhatsApp...). Si el sistema no lo permite para
 * ese tipo de archivo, o en la PC, se descarga directo.
 */

export type SaveOutcome = 'shared' | 'downloaded' | 'cancelled'

function download(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Se libera despues: algunos navegadores leen el archivo un poco mas tarde.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function saveTextFile(params: {
  name: string
  text: string
  mimeType: string
  preferShare: boolean
}): Promise<SaveOutcome> {
  const file = new File([params.text], params.name, { type: params.mimeType })

  const canShare =
    params.preferShare &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })

  if (canShare) {
    try {
      await navigator.share({ files: [file], title: params.name })
      return 'shared'
    } catch (error) {
      // Cerrar el menu de compartir no es un error: la persona decidio no hacerlo.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Cualquier otro problema: se descarga como siempre.
    }
  }

  download(file)
  return 'downloaded'
}
