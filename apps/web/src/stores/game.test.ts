import { accountStorage } from '../account/storage'
import { cardPool, newCampaign, starterDeckList, startScenario } from '@lcg/cards'
import { isPermanent } from '@lcg/engine'
import { throughSetup } from '@lcg/engine/testing'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showAutoSteps } from '../game/autoStepsPreference'
import { session, SESSION_KEY } from '../game/session'
import { markOf } from '../game/undo'
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
  it('starts and reloads a Chapter Two Dunwich campaign from the first prologue frame', () => {
    const game = useGameStore()
    game.start(
      'the-dunwich-legacy',
      ['joe'],
      'standard',
      [],
      'the-house-always-wins',
      'chapter-two',
    )
    expect(game.campaign?.encounterSetVariant).toBe('chapter-two')
    expect(game.state?.scenarioMeta?.chapterTwoEncounters).toBe(1)
    expect(game.storageIssue).toBeNull()
    const saved = accountStorage.getItem(SESSION_KEY)!
    expect(saved).toBeTruthy()
    setActivePinia(createPinia())
    expect(useGameStore().campaign?.encounterSetVariant).toBe('chapter-two')
    expect(useGameStore().state?.scenarioId).toBe('the-house-always-wins')
    expect(useGameStore().storageIssue).toBeNull()
  })
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

describe('pasos automáticos en la mesa', () => {
  it('queues a revealed Carnevale identity without persisting the preview, and clears it on undo', () => {
    const game = useGameStore()
    const state = throughSetup(
      startScenario(newCampaign('carnevale-of-horrors', ['joe'], 'standard'), 42),
    )
    const placed = Object.values(state.placedAssets!).find((p) => p.code === '82017b')!
    const investigator = state.investigators[0]!.id
    state.pending = {
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'test',
        choices: [
          {
            label: 'test',
            then: [{ type: 'ScenarioSpecific', key: 'carnevaleFlip', data: { placed: placed.id } }],
          },
        ],
      },
    }
    state.queue = []
    expect(
      game.importSession(
        JSON.stringify(session(state, { base: state, inputs: [], marks: [markOf(state)] }, null)),
      ),
    ).toBe(true)
    game.answer(0)
    expect(game.error).toBeNull()
    expect(game.cardEntries).toEqual([
      expect.objectContaining({ reason: 'reveal', code: '82017', from: 'masked' }),
    ])
    expect(accountStorage.getItem(SESSION_KEY)).not.toContain('cardEntries')
    const resolved = game.state
    game.acceptCardEntry()
    expect(game.cardEntries).toEqual([])
    expect(game.state).toBe(resolved)
    game.undo('step')
    game.answer(0)
    expect(game.cardEntries).not.toHaveLength(0)
    game.undo('step')
    expect(game.cardEntries).toEqual([])
  })
  it('terminar el turno muestra los pasos resueltos solos, sin guardarlos', () => {
    const game = useGameStore()
    const state = throughSetup(
      startScenario(newCampaign('the-midwinter-gala', ['joe'], 'standard'), 13),
    )
    const history = { base: state, inputs: [], marks: [markOf(state)] }
    expect(game.importSession(JSON.stringify(session(state, history, null)))).toBe(true)
    game.answerLabel('action.endTurn')
    expect(game.error).toBeNull()
    expect(game.autoSteps?.steps.some((s) => s.key === 'log.step.enemyBegins')).toBe(true)
    expect(accountStorage.getItem(SESSION_KEY)).not.toContain('autoSteps')
    game.acceptAutoSteps()
    expect(game.autoSteps).toBeNull()
  })
  it('con el visor desactivado no se abre el resumen de pasos automáticos', () => {
    const game = useGameStore()
    const state = throughSetup(
      startScenario(newCampaign('the-midwinter-gala', ['joe'], 'standard'), 13),
    )
    const history = { base: state, inputs: [], marks: [markOf(state)] }
    expect(game.importSession(JSON.stringify(session(state, history, null)))).toBe(true)
    showAutoSteps.value = false
    try {
      game.answerLabel('action.endTurn')
      expect(game.error).toBeNull()
      expect(game.autoSteps).toBeNull()
    } finally {
      showAutoSteps.value = true
    }
  })
})
