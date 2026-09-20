import { useCallback, useEffect, useState } from 'react'
import {
  MAX_VIDEO_BYTES,
  deleteVideo,
  getVideo,
  saveVideo,
  type StoredVideo,
} from './videoStore'

export type ExerciseVideo = {
  /** Datos del video guardado en este dispositivo, o null si no hay. */
  video: StoredVideo | null
  /** Direccion temporal para reproducirlo en un <video>. */
  url: string | null
  loading: boolean
  error: string | null
  save: (file: File) => Promise<void>
  remove: () => Promise<void>
}

/** Carga (y libera) el video guardado para un ejercicio en este dispositivo. */
export function useExerciseVideo(exerciseId: string): ExerciseVideo {
  const [video, setVideo] = useState<StoredVideo | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getVideo(exerciseId).then((found) => {
      if (cancelled) return
      setVideo(found)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [exerciseId])

  useEffect(() => {
    if (!video) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(video.blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [video])

  const save = useCallback(
    async (file: File) => {
      setError(null)
      if (!file.type.startsWith('video/')) {
        setError('Ese archivo no es un video.')
        return
      }
      if (file.size > MAX_VIDEO_BYTES) {
        setError('El video es muy pesado. Usa un clip corto, de menos de 150 MB.')
        return
      }
      try {
        const stored = await saveVideo(exerciseId, file)
        setVideo(stored)
      } catch {
        setError('No se pudo guardar el video en este dispositivo.')
      }
    },
    [exerciseId],
  )

  const remove = useCallback(async () => {
    await deleteVideo(exerciseId)
    setVideo(null)
  }, [exerciseId])

  return { video, url, loading, error, save, remove }
}
