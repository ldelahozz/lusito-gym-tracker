import { describe, expect, it } from 'vitest'
import { accessFrom, canUseApp, isValidEmail, normalizeEmail, parseAccess } from './access'

describe('accessFrom', () => {
  it('invitado o dueño según la lista', () => {
    expect(accessFrom({ kind: 'found', admin: true }, null)).toBe('admin')
    expect(accessFrom({ kind: 'found', admin: false }, null)).toBe('guest')
  })

  it('sin invitación, se bloquea', () => {
    expect(accessFrom({ kind: 'missing' }, 'guest')).toBe('denied')
  })

  it('si no se pudo revisar, se queda con lo último que se supo', () => {
    expect(accessFrom({ kind: 'error' }, 'guest')).toBe('guest')
    expect(accessFrom({ kind: 'error' }, 'denied')).toBe('denied')
    expect(accessFrom({ kind: 'error' }, null)).toBe('unknown')
  })
})

describe('canUseApp', () => {
  it('sin internet nunca deja fuera a nadie', () => {
    expect(canUseApp('unknown')).toBe(true)
    expect(canUseApp('guest')).toBe(true)
    expect(canUseApp('admin')).toBe(true)
    expect(canUseApp('denied')).toBe(false)
  })
})

describe('parseAccess', () => {
  it('lee lo guardado y descarta lo dañado', () => {
    expect(parseAccess('admin')).toBe('admin')
    expect(parseAccess('unknown')).toBeNull()
    expect(parseAccess('x')).toBeNull()
    expect(parseAccess(null)).toBeNull()
  })
})

describe('correos', () => {
  it('se guardan en minúsculas y sin espacios', () => {
    expect(normalizeEmail('  Mama.Perez@Gmail.com ')).toBe('mama.perez@gmail.com')
  })

  it('revisa que tengan forma de correo', () => {
    expect(isValidEmail('mama@gmail.com')).toBe(true)
    expect(isValidEmail(' Mama@Gmail.com ')).toBe(true)
    expect(isValidEmail('mama@gmail')).toBe(false)
    expect(isValidEmail('mama gmail.com')).toBe(false)
    expect(isValidEmail('ma/ma@gmail.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})
