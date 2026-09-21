import { describe, expect, it } from 'vitest'
import {
  CURSOR_MARGIN_MS,
  advanceCursor,
  cursorKey,
  FULL_RESYNC_MS,
  deltaSince,
  fullLoadKey,
  isPurged,
  needsFullLoad,
  parseCursor,
  withoutSyncMarks,
} from './deltaSync'

describe('advanceCursor', () => {
  it('se queda con la hora más alta que llegó de la nube', () => {
    expect(advanceCursor(100, [150, 120, 90])).toBe(150)
  })

  it('nunca retrocede', () => {
    expect(advanceCursor(500, [100, 200])).toBe(500)
  })

  it('sin marcador y sin nada nuevo queda en 0: lo viejo ya está en el dispositivo', () => {
    expect(advanceCursor(null, [])).toBe(0)
  })

  it('ignora valores que no son números', () => {
    expect(advanceCursor(10, [Number.NaN, Number.POSITIVE_INFINITY, 20])).toBe(20)
  })
})

describe('deltaSince', () => {
  it('pide desde un minuto antes del marcador, por si acaso', () => {
    expect(deltaSince(1_000_000)).toBe(1_000_000 - CURSOR_MARGIN_MS)
  })

  it('no baja de cero', () => {
    expect(deltaSince(0)).toBe(0)
    expect(deltaSince(10)).toBe(0)
  })
})

describe('needsFullLoad', () => {
  const now = 10 * FULL_RESYNC_MS

  it('la primera vez en un dispositivo se baja todo', () => {
    expect(needsFullLoad({ cursor: null, lastFullAt: null, now })).toBe(true)
    expect(needsFullLoad({ cursor: 5, lastFullAt: null, now })).toBe(true)
  })

  it('con marcador reciente, solo los cambios', () => {
    expect(needsFullLoad({ cursor: 5, lastFullAt: now - 86_400_000, now })).toBe(false)
  })

  it('una vez al mes se vuelve a bajar todo, por si acaso', () => {
    expect(needsFullLoad({ cursor: 5, lastFullAt: now - FULL_RESYNC_MS - 1, now })).toBe(true)
  })

  it('si el reloj del dispositivo se movió hacia atrás, también', () => {
    expect(needsFullLoad({ cursor: 5, lastFullAt: now + 60_000, now })).toBe(true)
  })
})

describe('parseCursor', () => {
  it('lee un marcador guardado', () => {
    expect(parseCursor('1700000000000')).toBe(1_700_000_000_000)
    expect(parseCursor('0')).toBe(0)
  })

  it('sin marcador o dañado devuelve null, y entonces se baja todo', () => {
    expect(parseCursor(null)).toBeNull()
    expect(parseCursor('')).toBeNull()
    expect(parseCursor('abc')).toBeNull()
    expect(parseCursor('-5')).toBeNull()
  })
})

describe('cursorKey', () => {
  it('es distinto por cuenta y por colección', () => {
    expect(cursorKey('a', 'setLogs')).not.toBe(cursorKey('b', 'setLogs'))
    expect(cursorKey('a', 'setLogs')).not.toBe(cursorKey('a', 'sessions'))
    expect(fullLoadKey('a', 'setLogs')).not.toBe(cursorKey('a', 'setLogs'))
  })
})

describe('isPurged y withoutSyncMarks', () => {
  it('reconoce la marca de borrado definitivo', () => {
    expect(isPurged({ purged: true })).toBe(true)
    expect(isPurged({ purged: false })).toBe(false)
    expect(isPurged({})).toBe(false)
    expect(isPurged(undefined)).toBe(false)
  })

  it('quita syncedAt y deja lo demás intacto', () => {
    expect(withoutSyncMarks({ id: 'x', reps: 8, syncedAt: 123 })).toEqual({ id: 'x', reps: 8 })
  })
})
