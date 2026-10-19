import { afterEach, expect, it, vi } from 'vitest'
import { accountStorage, discardLegacySaves } from './storage'

afterEach(() => {
  accountStorage.clear()
  vi.unstubAllGlobals()
})

it('elimina los guardados antiguos sin borrar preferencias ni escribir nuevos datos', () => {
  const values = new Map([
    ['lcg:user:a:tab:active-save', 'campaign'],
    ['lcg:user:a:guest-import', '{}'],
    ['lcg:session:v1', 'save'],
    ['lcg:session:backup:v1', 'backup'],
    ['lcg:session:unreadable:v1', 'recovery'],
    ['lcg:decks', '[]'],
    ['lcg:rewards', '[]'],
    ['lcg:last-account', 'profile'],
    ['locale', 'es'],
    ['playmat', 'green'],
  ])
  vi.stubGlobal('localStorage', {
    get length() {
      return values.size
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
  })
  const removeItem = vi.fn()
  const deleteDatabase = vi.fn()
  vi.stubGlobal('sessionStorage', { removeItem })
  vi.stubGlobal('indexedDB', { deleteDatabase })
  discardLegacySaves()
  expect([...values]).toEqual([
    ['locale', 'es'],
    ['playmat', 'green'],
  ])
  expect(removeItem).toHaveBeenCalledWith('lcg:client')
  expect(deleteDatabase).toHaveBeenCalledWith('lcg-account-library')
})

it('el estado de juego funciona en memoria con el almacenamiento del navegador bloqueado', () => {
  const blocked = () => {
    throw new Error('storage blocked')
  }
  vi.stubGlobal('localStorage', {
    get length() {
      return blocked()
    },
  })
  vi.stubGlobal('indexedDB', { deleteDatabase: blocked })
  expect(() => discardLegacySaves()).not.toThrow()
  accountStorage.setItem('lcg:session:v1', 'temporary')
  expect(accountStorage.getItem('lcg:session:v1')).toBe('temporary')
  accountStorage.clear()
  expect(accountStorage.getItem('lcg:session:v1')).toBeNull()
})
