import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { getFirebase } from '@/core/firebase'
import { getDeviceId, getDeviceKind } from '@/core/device'
import { shouldOverwriteRemote, type SyncMeta } from '@/core/logic/conflict'
import { DEFAULT_SETTINGS, SETTINGS_ID, type Settings } from '@/core/model/types'
import { useOnlineStatus } from './useOnlineStatus'
import { COLLECTION_NAMES, type CollectionName, type DocOf } from './collections'
import { DataContext, type DataState, type DataValue, type NewDoc, type SyncStatus } from './data-context'

const EMPTY_STATE: DataState = {
  ready: false,
  exercises: {},
  routines: {},
  routineExercises: {},
  sessions: {},
  setLogs: {},
  sessionNotes: {},
  personalRecords: {},
  settings: {},
}

type PendingWrite = {
  collection: CollectionName
  doc: DocumentData & SyncMeta & { id: string }
}

/**
 * Mantiene en memoria una copia completa de tus datos y la sincroniza con Firestore.
 *
 * Como funciona:
 *  - Al entrar se suscribe a todas las colecciones. Firestore responde primero desde
 *    la memoria del dispositivo (instantaneo, sin internet) y luego con lo de la nube.
 *  - Al guardar, la pantalla se actualiza al momento y la subida ocurre despues.
 *  - Si un mismo registro cambio en dos dispositivos, aplica la regla de conflictos
 *    (gana el celular) y, si nuestra version debe prevalecer, la vuelve a escribir.
 */
export function DataProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [state, setState] = useState<DataState>(EMPTY_STATE)
  const [pendingCount, setPendingCount] = useState(0)
  const online = useOnlineStatus()

  /** Ultima version escrita desde este dispositivo, por si hay que defenderla. */
  const pendingWrites = useRef(new Map<string, PendingWrite>())

  useEffect(() => {
    const { db } = getFirebase()
    const loaded = new Set<CollectionName>()
    const pendingByCollection = new Map<CollectionName, number>()

    const unsubscribes = COLLECTION_NAMES.map((name) =>
      onSnapshot(
        collection(db, 'users', uid, name),
        { includeMetadataChanges: true },
        (snapshot) => {
          setState((previous) => {
            const table = { ...previous[name] } as Record<string, unknown>

            // includeMetadataChanges: tambien avisa cuando una escritura nuestra ya quedo
            // confirmada en la nube, que es cuando toca revisar conflictos.
            for (const change of snapshot.docChanges({ includeMetadataChanges: true })) {
              const id = change.doc.id
              const data = { ...change.doc.data(), id } as DocumentData & SyncMeta & { id: string }

              if (change.type === 'removed') {
                delete table[id]
                pendingWrites.current.delete(`${name}/${id}`)
                continue
              }

              table[id] = data

              // Solo revisamos conflictos cuando la version ya viene confirmada del servidor.
              if (!change.doc.metadata.hasPendingWrites) {
                const key = `${name}/${id}`
                const mine = pendingWrites.current.get(key)
                if (mine) {
                  if (mine.doc.deviceId !== data.deviceId && shouldOverwriteRemote(mine.doc, data)) {
                    // Nuestra version gana: se vuelve a escribir tal cual.
                    void setDoc(doc(db, 'users', uid, name, id), mine.doc).catch(() => undefined)
                    table[id] = mine.doc
                  } else {
                    pendingWrites.current.delete(key)
                  }
                }
              }
            }

            loaded.add(name)
            return { ...previous, [name]: table, ready: loaded.size === COLLECTION_NAMES.length }
          })

          pendingByCollection.set(name, snapshot.metadata.hasPendingWrites ? 1 : 0)
          let total = 0
          for (const value of pendingByCollection.values()) total += value
          setPendingCount(total)
        },
        (error) => {
          console.error(`Error al sincronizar ${name}:`, error)
        },
      ),
    )

    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe()
    }
  }, [uid])

  /** Anade los campos de sincronizacion a cualquier documento antes de guardarlo. */
  const stamp = useCallback(<N extends CollectionName>(input: NewDoc<N>) => {
    return {
      ...input,
      deleted: input.deleted ?? false,
      updatedAt: Date.now(),
      deviceId: getDeviceId(),
      deviceKind: getDeviceKind(),
    } as DocumentData & SyncMeta & { id: string }
  }, [])

  const save = useCallback(
    <N extends CollectionName>(name: N, input: NewDoc<N>) => {
      const { db } = getFirebase()
      const stamped = stamp(input)
      pendingWrites.current.set(`${name}/${stamped.id}`, { collection: name, doc: stamped })
      void setDoc(doc(db, 'users', uid, name, stamped.id), stamped).catch((error) => {
        console.error(`No se pudo guardar en ${name}:`, error)
      })
    },
    [stamp, uid],
  )

  const saveMany = useCallback(
    (docs: Array<{ collection: CollectionName; doc: NewDoc<CollectionName> }>) => {
      if (docs.length === 0) return
      const { db } = getFirebase()
      // Firestore admite hasta 500 escrituras por lote.
      for (let start = 0; start < docs.length; start += 450) {
        const batch = writeBatch(db)
        for (const entry of docs.slice(start, start + 450)) {
          const stamped = stamp(entry.doc)
          pendingWrites.current.set(`${entry.collection}/${stamped.id}`, {
            collection: entry.collection,
            doc: stamped,
          })
          batch.set(doc(db, 'users', uid, entry.collection, stamped.id), stamped)
        }
        void batch.commit().catch((error) => console.error('No se pudo guardar el lote:', error))
      }
    },
    [stamp, uid],
  )

  const remove = useCallback(
    <N extends CollectionName>(name: N, target: DocOf<N>) => {
      save(name, { ...target, deleted: true } as NewDoc<N>)
    },
    [save],
  )

  const destroy = useCallback(
    async (docs: Array<{ collection: CollectionName; id: string }>) => {
      const { db } = getFirebase()
      // Todos los lotes se encolan de una vez: sin internet, la pantalla ya los ve
      // borrados y la nube se entera al volver la conexion.
      const commits: Promise<void>[] = []
      for (let start = 0; start < docs.length; start += 450) {
        const batch = writeBatch(db)
        for (const entry of docs.slice(start, start + 450)) {
          pendingWrites.current.delete(`${entry.collection}/${entry.id}`)
          batch.delete(doc(db, 'users', uid, entry.collection, entry.id))
        }
        commits.push(batch.commit())
      }
      await Promise.all(commits)
    },
    [uid],
  )

  const settings = useMemo<Settings>(() => {
    const stored = state.settings[SETTINGS_ID]
    if (stored) return { ...DEFAULT_SETTINGS, ...stored }
    return {
      ...DEFAULT_SETTINGS,
      id: SETTINGS_ID,
      updatedAt: 0,
      deviceId: '',
      deviceKind: 'desktop',
      deleted: false,
    }
  }, [state.settings])

  const status: SyncStatus = !online ? 'offline' : pendingCount > 0 ? 'syncing' : 'synced'

  const value = useMemo<DataValue>(
    () => ({ state, status, settings, save, saveMany, remove, destroy }),
    [state, status, settings, save, saveMany, remove, destroy],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
