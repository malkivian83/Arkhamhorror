import { describe, expect, it } from 'vitest'
import { getCard, registerCard } from './index'

describe('registro de cartas', () => {
  it('registra y recupera una carta y rechaza duplicados', () => {
    const card = { code: 'test-001', type: 'asset' as const, name: { en: 'Test', es: 'Prueba' } }
    registerCard(card)
    expect(getCard('test-001')).toEqual(card)
    expect(() => registerCard(card)).toThrow()
  })
})
