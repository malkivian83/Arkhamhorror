import { accountStorage } from '../account/storage'
import { cardPool, newCampaign, starterDeckList } from '@lcg/cards'
import { isPermanent } from '@lcg/engine'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { session, SESSION_KEY } from '../game/session'
import { useDecksStore } from './decks'
import { useGameStore } from './game'

let values: Map<string, string>
beforeEach(() => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
  vi.stubGlobal('document', { visibilityState: 'visible' })
  accountStorage.clear()
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
  it('inicia una campaña con un mazo válido que incluye una recompensa ganada', () => {
    const decks = useDecksStore()
    decks.addRewards(['12181'])
    const deck = starterDeckList('daniela', 'collector', 'Collector')
    const extra = cardPool(deck.investigator)
      .filter((c) => !c.xp && !isPermanent(c.code) && !deck.cards.includes(c.code))
      .slice(0, 5)
    deck.cards.push('12181', ...extra.map((c) => c.code))
    expect(decks.check(deck).problems).toEqual([])
    const game = useGameStore()
    game.start('brethren-of-ash', [deck], 'standard')
    expect(game.campaign?.log.rewards).toContain('12181')
    expect(game.state?.scenarioId).toBe('spreading-flames')
    expect(game.storageIssue).toBeNull()
  })

  it('rechazar un mazo inválido conserva la campaña y el guardado actuales', () => {
    const game = useGameStore()
    game.start('brethren-of-ash', ['joe'], 'standard')
    const campaign = game.campaign
    const state = game.state
    const saved = accountStorage.getItem(SESSION_KEY)
    accountStorage.setItem('active-save', 'current-adventure')
    expect(() =>
      game.start('brethren-of-ash', [{ investigator: '12001', cards: [] }], 'standard'),
    ).toThrow()
    expect(game.campaign).toBe(campaign)
    expect(game.state).toBe(state)
    expect(accountStorage.getItem(SESSION_KEY)).toBe(saved)
    expect(accountStorage.getItem('active-save')).toBe('current-adventure')
  })
  it('importar una campaña recupera Collector en el constructor de mazos', () => {
    const game = useGameStore()
    expect(game.importSession(JSON.stringify(rewarded()))).toBe(true)
    expect(useDecksStore().rewards).toContain('12181')
  })
  it('recargar una campaña también reconstruye la recompensa si falta la clave auxiliar', () => {
    accountStorage.setItem(SESSION_KEY, JSON.stringify(rewarded()))
    expect(useGameStore().campaign?.log.rewards).toContain('12181')
    expect(useDecksStore().rewards).toContain('12181')
  })
  it('una clave auxiliar de recompensas dañada no impide recuperar la campaña', () => {
    accountStorage.setItem('lcg:rewards', '{}')
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
