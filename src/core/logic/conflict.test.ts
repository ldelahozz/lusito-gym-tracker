import { describe, expect, it } from 'vitest'
import { pickWinner, resolveConflict, shouldOverwriteRemote, type SyncMeta } from './conflict'

const phone = (updatedAt: number, deviceId = 'phone-1'): SyncMeta => ({
  updatedAt,
  deviceId,
  deviceKind: 'mobile',
})

const pc = (updatedAt: number, deviceId = 'pc-1'): SyncMeta => ({
  updatedAt,
  deviceId,
  deviceKind: 'desktop',
})

describe('resolveConflict: gana el celular', () => {
  it('el celular gana aunque haya escrito antes que la PC', () => {
    expect(resolveConflict(phone(1_000), pc(9_999))).toBe('a')
    expect(resolveConflict(pc(9_999), phone(1_000))).toBe('b')
  })

  it('el celular gana aunque haya escrito despues que la PC', () => {
    expect(resolveConflict(phone(9_999), pc(1_000))).toBe('a')
  })

  it('entre dos celulares gana el mas reciente', () => {
    expect(resolveConflict(phone(2_000, 'phone-a'), phone(1_000, 'phone-b'))).toBe('a')
    expect(resolveConflict(phone(1_000, 'phone-a'), phone(2_000, 'phone-b'))).toBe('b')
  })

  it('entre dos PCs gana la mas reciente', () => {
    expect(resolveConflict(pc(2_000, 'pc-a'), pc(1_000, 'pc-b'))).toBe('a')
    expect(resolveConflict(pc(1_000, 'pc-a'), pc(2_000, 'pc-b'))).toBe('b')
  })
})

describe('resolveConflict: casos borde', () => {
  it('con la misma hora y mismo tipo, desempata por deviceId de forma fija', () => {
    expect(resolveConflict(phone(5_000, 'phone-b'), phone(5_000, 'phone-a'))).toBe('a')
    expect(resolveConflict(phone(5_000, 'phone-a'), phone(5_000, 'phone-b'))).toBe('b')
  })

  it('el resultado es el mismo sin importar el orden de los argumentos', () => {
    const cases: Array<[SyncMeta, SyncMeta]> = [
      [phone(1_000), pc(2_000)],
      [pc(3_000, 'pc-x'), pc(3_000, 'pc-y')],
      [phone(7_000, 'phone-x'), phone(7_000, 'phone-y')],
      [phone(4_000), phone(4_001)],
    ]
    for (const [a, b] of cases) {
      expect(pickWinner(a, b)).toEqual(pickWinner(b, a))
    }
  })

  it('si es exactamente el mismo registro, no hay cambio', () => {
    const same = phone(5_000)
    expect(pickWinner(same, { ...same })).toEqual(same)
    expect(shouldOverwriteRemote(same, { ...same })).toBe(false)
  })
})

describe('shouldOverwriteRemote', () => {
  it('el celular reescribe lo que llega de la PC', () => {
    expect(shouldOverwriteRemote(phone(1_000), pc(8_000))).toBe(true)
  })

  it('la PC no reescribe lo que llega del celular', () => {
    expect(shouldOverwriteRemote(pc(8_000), phone(1_000))).toBe(false)
  })

  it('la PC si reescribe una version mas vieja de otra PC', () => {
    expect(shouldOverwriteRemote(pc(9_000, 'pc-a'), pc(1_000, 'pc-b'))).toBe(true)
  })
})
