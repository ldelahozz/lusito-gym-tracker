import { createContext, useContext } from 'react'
import type { CollectionName, CollectionTypes, DocOf } from './collections'
import type { Settings } from '@/core/model/types'

export type Table<T> = Record<string, T>

export type DataState = {
  /** false hasta que llegan los primeros datos (de la memoria local, al instante). */
  ready: boolean
  exercises: Table<CollectionTypes['exercises']>
  routines: Table<CollectionTypes['routines']>
  routineExercises: Table<CollectionTypes['routineExercises']>
  sessions: Table<CollectionTypes['sessions']>
  setLogs: Table<CollectionTypes['setLogs']>
  sessionNotes: Table<CollectionTypes['sessionNotes']>
  personalRecords: Table<CollectionTypes['personalRecords']>
  settings: Table<CollectionTypes['settings']>
}

export type SyncStatus = 'synced' | 'syncing' | 'offline'

export type NewDoc<N extends CollectionName> = Omit<
  DocOf<N>,
  'updatedAt' | 'deviceId' | 'deviceKind' | 'deleted'
> & {
  deleted?: boolean
}

export type DataValue = {
  state: DataState
  status: SyncStatus
  /** Ajustes ya listos para usar (con los valores por defecto si aun no existen). */
  settings: Settings
  /** Guarda un documento completo. La pantalla se actualiza al instante, con o sin internet. */
  save: <N extends CollectionName>(collection: N, doc: NewDoc<N>) => void
  /** Guarda varios documentos de una sola vez. */
  saveMany: (docs: Array<{ collection: CollectionName; doc: NewDoc<CollectionName> }>) => void
  /** Borrado logico: se marca como borrado y se sincroniza. */
  remove: <N extends CollectionName>(collection: N, doc: DocOf<N>) => void
  /** Borrado real y definitivo (solo desde Ajustes, con confirmacion). */
  destroy: (docs: Array<{ collection: CollectionName; id: string }>) => Promise<void>
}

export const DataContext = createContext<DataValue | null>(null)

export function useData(): DataValue {
  const value = useContext(DataContext)
  if (!value) throw new Error('useData debe usarse dentro de <DataProvider>')
  return value
}
