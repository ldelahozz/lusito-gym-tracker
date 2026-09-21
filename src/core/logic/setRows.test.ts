import { describe, expect, it } from 'vitest'
import { renumberSets, rowCount, switchSetType, type IndexedSet } from './setRows'

const s = (id: string, type: IndexedSet['type'], setIndex: number): IndexedSet => ({
  id,
  type,
  setIndex,
})

describe('renumberSets', () => {
  it('no cambia nada si ya esta seguido', () => {
    const sets = [s('a', 'work', 0), s('b', 'work', 1), s('c', 'warmup', 0)]
    expect(renumberSets(sets)).toEqual([])
  })

  it('cierra el hueco al borrar una serie del medio', () => {
    const sets = [s('a', 'work', 0), s('c', 'work', 2)]
    expect(renumberSets(sets)).toEqual([s('c', 'work', 1)])
  })

  it('numera cada tipo por separado', () => {
    const sets = [s('w1', 'warmup', 3), s('t1', 'work', 5)]
    expect(renumberSets(sets)).toEqual([s('w1', 'warmup', 0), s('t1', 'work', 0)])
  })

  it('con una lista vacía no hay nada que renumerar', () => {
    expect(renumberSets([])).toEqual([])
  })
})

describe('switchSetType', () => {
  it('pasa un calentamiento a trabajo, al final del grupo', () => {
    const sets = [s('w1', 'warmup', 0), s('w2', 'warmup', 1), s('t1', 'work', 0)]
    const result = switchSetType(sets, 'w1')
    const moved = result.find((set) => set.id === 'w1')
    expect(moved).toEqual(s('w1', 'work', 1))
  })

  it('renumera el grupo del que salio', () => {
    const sets = [s('w1', 'warmup', 0), s('w2', 'warmup', 1)]
    const result = switchSetType(sets, 'w1')
    expect(result.find((set) => set.id === 'w2')).toEqual(s('w2', 'warmup', 0))
  })

  it('pasa una serie de trabajo a calentamiento', () => {
    const sets = [s('t1', 'work', 0), s('t2', 'work', 1)]
    const result = switchSetType(sets, 't2')
    expect(result.find((set) => set.id === 't2')).toEqual(s('t2', 'warmup', 0))
  })

  it('si la serie no existe, no hace nada', () => {
    expect(switchSetType([s('a', 'work', 0)], 'inexistente')).toEqual([])
  })
})

describe('rowCount', () => {
  it('muestra las series planeadas cuando aun no registras nada', () => {
    expect(rowCount(4, 0)).toBe(4)
  })

  it('si registraste más de las planeadas, se muestran todas', () => {
    expect(rowCount(3, 5)).toBe(5)
  })

  it('nunca es negativo', () => {
    expect(rowCount(-2, 0)).toBe(0)
  })
})
