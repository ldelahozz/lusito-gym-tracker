/** Acciones sobre sesiones terminadas que se usan desde varias pantallas. */
import type { DataState, DataValue } from '@/core/sync/data-context'
import { recordsOfSet } from '@/core/sync/selectors'

/**
 * Borra una sesion completa: sus series, sus notas y los records que salieron
 * de ella. Asi no quedan restos sueltos en Progreso.
 */
export function removeSessionCascade(
  state: DataState,
  remove: DataValue['remove'],
  sessionId: string,
): void {
  const session = state.sessions[sessionId]
  if (!session || session.deleted) return

  for (const log of Object.values(state.setLogs)) {
    if (log.deleted || log.sessionId !== sessionId) continue
    for (const record of recordsOfSet(state, log.id)) remove('personalRecords', record)
    remove('setLogs', log)
  }
  for (const note of Object.values(state.sessionNotes)) {
    if (!note.deleted && note.sessionId === sessionId) remove('sessionNotes', note)
  }
  remove('sessions', session)
}
