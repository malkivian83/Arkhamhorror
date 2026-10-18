import { newCampaign } from '@lcg/cards'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { session, SESSION_KEY } from '../game/session'
import { useDecksStore } from './decks'
import { useGameStore } from './game'

let values: Map<string, string>
beforeEach(() => {
  values = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
  setActivePinia(createPinia())
})
afterEach(() => vi.unstubAllGlobals())
const rewarded = () => {
  const campaign = newCampaign('brethren-of-ash', ['joe'], 'easy')
  return session(null, null, { ...campaign, log: { ...campaign.log, rewards: ['12181'] } })
}
describe('recuperación de recompensas junto con la campaña', () => {
  it('importar una campaña recupera Collector en el constructor de mazos', () => {
    const game = useGameStore()
    expect(game.importSession(JSON.stringify(rewarded()))).toBe(true)
    expect(useDecksStore().rewards).toContain('12181')
  })
  it('recargar una campaña también reconstruye la recompensa si falta la clave auxiliar', () => {
    values.set(SESSION_KEY, JSON.stringify(rewarded()))
    expect(useGameStore().campaign?.log.rewards).toContain('12181')
    expect(useDecksStore().rewards).toContain('12181')
  })
  it('una clave auxiliar de recompensas dañada no impide recuperar la campaña', () => {
    values.set('lcg:rewards', '{}')
    expect(useGameStore().importSession(JSON.stringify(rewarded()))).toBe(true)
    expect(useDecksStore().rewards).toEqual(['12181'])
  })
  it('un archivo rechazado no concede recompensas ni sustituye el guardado', () => {
    const game = useGameStore()
    expect(game.importSession(JSON.stringify({ ...rewarded(), version: 99 }))).toBe(false)
    expect(useDecksStore().rewards).toEqual([])
    expect(values.has(SESSION_KEY)).toBe(false)
  })
})
