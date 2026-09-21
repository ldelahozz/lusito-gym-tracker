import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Timestamp,
  collection,
  doc,
  getDocsFromCache,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore'
import { getFirebase } from '@/core/firebase'
import { getDeviceId, getDeviceKind } from '@/core/device'
import { shouldOverwriteRemote, type SyncMeta } from '@/core/logic/conflict'
import {
  advanceCursor,
  deltaSince,
  isPurged,
  needsFullLoad,
  withoutSyncMarks,
} from '@/core/logic/deltaSync'
import { DEFAULT_SETTINGS, SETTINGS_ID, type Settings } from '@/core/model/types'
import { useOnlineStatus } from './useOnlineStatus'
import { COLLECTION_NAMES, type CollectionName, type DocOf } from './collections'
import { readCursor, readLastFullLoad, writeCursor, writeLastFullLoad } from './cursors'
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

type StampedDoc = DocumentData & SyncMeta & { id: string }

type PendingWrite = {
  collection: CollectionName
  doc: StampedDoc
}

/** Un cambio para la pantalla: el registro nuevo, o null si hay que quitarlo. */
type TableChange = [id: string, value: Record<string, unknown> | null]

/**
 * Mantiene en memoria una copia completa de tus datos y la sincroniza con Firestore.
 *
 * Como funciona:
 *  - Al entrar, lo que ya esta en el dispositivo se lee de su memoria (gratis e
 *    instantaneo, con o sin internet).
 *  - A la nube solo se le piden los registros que cambiaron desde la ultima vez
 *    (ver src/core/logic/deltaSync.ts). La primera vez en cada dispositivo, y una
 *    vez al mes por seguridad, se baja todo.
 *  - Al guardar, la pantalla se actualiza al momento y la subida ocurre despues.
 *  - Si un mismo registro cambio en dos dispositivos, aplica la regla de conflictos
 *    (gana el celular) y, si nuestra version debe prevalecer, la vuelve a escribir.
 */
export function DataProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [state, setState] = useState<DataState>(EMPTY_STATE)
  const [inFlight, setInFlight] = useState(0)
  const online = useOnlineStatus()

  /** Ultima version escrita desde este dispositivo, por si hay que defenderla. */
  const pendingWrites = useRef(new Map<string, PendingWrite>())

  /** Aplica cambios a una coleccion en pantalla. */
  const applyToTable = useCallback((name: CollectionName, changes: TableChange[]) => {
    if (changes.length === 0) return
    setState((previous) => {
      const table = { ...previous[name] } as Record<string, unknown>
      for (const [id, value] of changes) {
        if (value === null) delete table[id]
        else table[id] = value
      }
      return { ...previous, [name]: table }
    })
  }, [])

  useEffect(() => {
    const { db } = getFirebase()
    let cancelled = false
    const unsubscribes: Array<() => void> = []
    const loaded = new Set<CollectionName>()

    const markLoaded = (name: CollectionName) => {
      loaded.add(name)
      if (loaded.size === COLLECTION_NAMES.length) {
        setState((previous) => (previous.ready ? previous : { ...previous, ready: true }))
      }
    }

    /** Procesa lo que entrega Firestore para una coleccion. */
    const handleSnapshot = (
      name: CollectionName,
      snapshot: QuerySnapshot,
      mode: 'full' | 'delta',
      maxSeen: { value: number | null },
    ) => {
      const changes: TableChange[] = []
      const seen: number[] = []

      // includeMetadataChanges: tambien avisa cuando una escritura nuestra ya quedo
      // confirmada en la nube, que es cuando toca revisar conflictos.
      for (const change of snapshot.docChanges({ includeMetadataChanges: true })) {
        const id = change.doc.id
        const key = `${name}/${id}`

        if (change.type === 'removed') {
          // Con "solo cambios", que un registro salga del resultado no significa que se
          // borro: pasa, por ejemplo, mientras una escritura nuestra espera la hora de la nube.
          if (mode === 'full') {
            changes.push([id, null])
            pendingWrites.current.delete(key)
          }
          continue
        }

        const raw = { ...change.doc.data(), id } as StampedDoc
        const confirmed = !change.doc.metadata.hasPendingWrites
        if (confirmed && raw.syncedAt instanceof Timestamp) seen.push(raw.syncedAt.toMillis())

        if (isPurged(raw)) {
          changes.push([id, null])
          pendingWrites.current.delete(key)
          continue
        }

        let value: Record<string, unknown> = withoutSyncMarks(raw)
        // Solo revisamos conflictos cuando la version ya viene confirmada del servidor.
        if (confirmed) {
          const mine = pendingWrites.current.get(key)
          if (mine) {
            if (mine.doc.deviceId !== raw.deviceId && shouldOverwriteRemote(mine.doc, raw)) {
              // Nuestra version gana: se vuelve a escribir tal cual.
              void setDoc(doc(db, 'users', uid, name, id), mine.doc).catch(() => undefined)
              value = withoutSyncMarks(mine.doc)
            } else {
              pendingWrites.current.delete(key)
            }
          }
        }
        changes.push([id, value])
      }

      applyToTable(name, changes)
      maxSeen.value = advanceCursor(maxSeen.value, seen)

      // Solo cuando la respuesta ya viene de la nube (no de la memoria del
      // dispositivo) se sabe que no falta nada: ahi se guarda el marcador.
      if (!snapshot.metadata.fromCache) {
        writeCursor(uid, name, maxSeen.value ?? 0)
        if (mode === 'full') writeLastFullLoad(uid, name, Date.now())
      }
      markLoaded(name)
    }

    const listen = (name: CollectionName, mode: 'full' | 'delta', cursor: number | null) => {
      const ref = collection(db, 'users', uid, name)
      const target =
        mode === 'full'
          ? ref
          : query(ref, where('syncedAt', '>', Timestamp.fromMillis(deltaSince(cursor ?? 0))))
      const maxSeen = { value: cursor }
      unsubscribes.push(
        onSnapshot(
          target,
          { includeMetadataChanges: true },
          (snapshot) => handleSnapshot(name, snapshot, mode, maxSeen),
          (error) => {
            console.error(`Error al sincronizar ${name}:`, error)
            // Sin permiso o con error, igual se muestra lo que ya hay en el dispositivo.
            markLoaded(name)
          },
        ),
      )
    }

    const start = async (name: CollectionName) => {
      const cursor = readCursor(uid, name)
      if (needsFullLoad({ cursor, lastFullAt: readLastFullLoad(uid, name), now: Date.now() })) {
        listen(name, 'full', null)
        return
      }
      try {
        // Lo que ya esta en el dispositivo sale de su memoria: no cuesta nada.
        const cached = await getDocsFromCache(collection(db, 'users', uid, name))
        if (cancelled) return
        if (cached.empty) {
          // Memoria vacia (datos del navegador borrados, por ejemplo): se baja todo.
          listen(name, 'full', null)
          return
        }
        const changes: TableChange[] = []
        cached.forEach((snapshot) => {
          const raw = { ...snapshot.data(), id: snapshot.id }
          changes.push([snapshot.id, isPurged(raw) ? null : withoutSyncMarks(raw)])
        })
        applyToTable(name, changes)
        markLoaded(name)
        listen(name, 'delta', cursor)
      } catch {
        if (!cancelled) listen(name, 'full', null)
      }
    }

    for (const name of COLLECTION_NAMES) void start(name)

    return () => {
      cancelled = true
      for (const unsubscribe of unsubscribes) unsubscribe()
    }
  }, [uid, applyToTable])

  /** Cuenta las escrituras que aun no confirma la nube, para el puntito de estado. */
  const track = useCallback((write: Promise<unknown>, what: string) => {
    setInFlight((count) => count + 1)
    void write
      .catch((error) => console.error(`No se pudo guardar ${what}:`, error))
      .finally(() => setInFlight((count) => count - 1))
  }, [])

  /** Anade los campos de sincronizacion a cualquier documento antes de guardarlo. */
  const stamp = useCallback(<N extends CollectionName>(input: NewDoc<N>): StampedDoc => {
    return {
      ...input,
      deleted: input.deleted ?? false,
      updatedAt: Date.now(),
      deviceId: getDeviceId(),
      deviceKind: getDeviceKind(),
      // La hora la pone la nube al recibirlo: asi los demas saben que es nuevo.
      syncedAt: serverTimestamp(),
    } as StampedDoc
  }, [])

  const save = useCallback(
    <N extends CollectionName>(name: N, input: NewDoc<N>) => {
      const { db } = getFirebase()
      const stamped = stamp(input)
      pendingWrites.current.set(`${name}/${stamped.id}`, { collection: name, doc: stamped })
      applyToTable(name, [[stamped.id, withoutSyncMarks(stamped)]])
      track(setDoc(doc(db, 'users', uid, name, stamped.id), stamped), `en ${name}`)
    },
    [stamp, uid, applyToTable, track],
  )

  const saveMany = useCallback(
    (docs: Array<{ collection: CollectionName; doc: NewDoc<CollectionName> }>) => {
      if (docs.length === 0) return
      const { db } = getFirebase()
      const byCollection = new Map<CollectionName, TableChange[]>()
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
          const list = byCollection.get(entry.collection) ?? []
          list.push([stamped.id, withoutSyncMarks(stamped)])
          byCollection.set(entry.collection, list)
        }
        track(batch.commit(), 'el lote')
      }
      for (const [name, changes] of byCollection) applyToTable(name, changes)
    },
    [stamp, uid, applyToTable, track],
  )

  const remove = useCallback(
    <N extends CollectionName>(name: N, target: DocOf<N>) => {
      save(name, { ...target, deleted: true } as NewDoc<N>)
    },
    [save],
  )

  /**
   * Borrado definitivo: el registro se reemplaza por una marca vacia, sin ninguno de
   * sus datos. Asi los demas dispositivos tambien se enteran y lo quitan.
   */
  const destroy = useCallback(
    async (docs: Array<{ collection: CollectionName; id: string }>) => {
      const { db } = getFirebase()
      const byCollection = new Map<CollectionName, TableChange[]>()
      // Todos los lotes se encolan de una vez: sin internet, la pantalla ya los ve
      // borrados y la nube se entera al volver la conexion.
      const commits: Promise<void>[] = []
      for (let start = 0; start < docs.length; start += 450) {
        const batch = writeBatch(db)
        for (const entry of docs.slice(start, start + 450)) {
          pendingWrites.current.delete(`${entry.collection}/${entry.id}`)
          batch.set(doc(db, 'users', uid, entry.collection, entry.id), {
            id: entry.id,
            deleted: true,
            purged: true,
            updatedAt: Date.now(),
            deviceId: getDeviceId(),
            deviceKind: getDeviceKind(),
            syncedAt: serverTimestamp(),
          })
          const list = byCollection.get(entry.collection) ?? []
          list.push([entry.id, null])
          byCollection.set(entry.collection, list)
        }
        const commit = batch.commit()
        track(commit, 'el borrado')
        commits.push(commit)
      }
      for (const [name, changes] of byCollection) applyToTable(name, changes)
      await Promise.all(commits)
    },
    [uid, applyToTable, track],
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

  const status: SyncStatus = !online ? 'offline' : inFlight > 0 ? 'syncing' : 'synced'

  const value = useMemo<DataValue>(
    () => ({ state, status, settings, save, saveMany, remove, destroy }),
    [state, status, settings, save, saveMany, remove, destroy],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
