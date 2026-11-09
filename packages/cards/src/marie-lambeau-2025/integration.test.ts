// RR: Deckbuilding, Signature Cards, Weakness, Campaign Play, Committing Cards, Uses.
import { dispatch, playerCardDef, type GameState } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchaseOptions, startScenario } from '../campaign'
import { STARTER_DECKS } from '../core-2026/player-cards'
import { starterDeckList, validateDeck } from '../decks'
import {
  ARCANE_INITIATE,
  clear,
  HEMOPHOBIA,
  makeGame,
  MARIE,
  marie,
  TORRENT_OF_POWER,
  withMarie,
} from './testing'

const PACK = Array.from({ length: 33 }, (_, n) => String(60451 + n))

describe('Marie Lambeau (60451): starter deck and campaign', () => {
  const starter = () => starterDeckList('marie2025', 'marie2025', 'Marie')

  it('ships her official 30-card starter deck with her signatures and Hemophobia', () => {
    const deck = starter()
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30 })
    expect(deck.cards).toHaveLength(33)
    for (const code of ['60452', '60453', HEMOPHOBIA]) expect(deck.cards).toContain(code)
    for (const code of PACK.slice(4, 19))
      expect(deck.cards.filter((c) => c === code)).toHaveLength(2)
    for (const code of new Set([MARIE, ...deck.cards])) expect(isImplemented(code), code).toBe(true)
  })

  it('every code of the pack is playable, and both Marie Lambeau editions are kept', () => {
    for (const code of PACK) expect(isImplemented(code), code).toBe(true)
    expect(STARTER_DECKS.marie!.investigatorCode).toBe('05006')
    expect(STARTER_DECKS.marie2025!.investigatorCode).toBe(MARIE)
    expect(playerCardDef('05006')!.signatures).not.toEqual(playerCardDef(MARIE)!.signatures)
  })

  it('only allows Mystic and Neutral cards and never offers her signatures', () => {
    const deck = starter()
    const cards = [...deck.cards]
    cards.splice(cards.indexOf('60456'), 1, '01086')
    expect(validateDeck({ ...deck, cards }).problems).toEqual([])
    cards.splice(cards.indexOf('01086'), 1, '12016')
    expect(validateDeck({ ...deck, cards }).problems.map((p) => p.key)).toContain(
      'deck.problem.notAllowed',
    )
    const c = newCampaign('night-of-the-zealot', ['marie2025'], 'standard')
    c.log.investigators[MARIE]!.xp = 5
    const options = purchaseOptions(c, MARIE).map((o) => o.code)
    expect(options).not.toContain('60452')
    expect(options).toContain('60473')
    expect(options).toContain('60480')
  })

  it('a deck without its basic weakness draws a real one and starts a scenario', () => {
    const cards = starter().cards.filter((c) => c !== HEMOPHOBIA)
    expect(validateDeck({ ...starter(), cards })).toMatchObject({ needsBasicWeakness: true })
    const c = newCampaign('night-of-the-zealot', [{ investigator: MARIE, cards }], 'standard', 3)
    const deck = c.investigators[0]!.deck
    expect(deck.filter((x) => playerCardDef(x)?.weakness === 'basicweakness')).toHaveLength(1)
    const game = startScenario(c, 3, false)
    expect(game.investigators[0]!.id).toBe(MARIE)
  })
})

describe('Reprints', () => {
  it('Arcane Initiate (60455): 1 doom on entering play; fast search for a Spell', () => {
    let s = withMarie(clear(makeGame()), { hand: [], deck: ['01088', '01060', '01089'] })
    s = dispatch(s, { type: 'PutAssetIntoPlay', investigator: MARIE, code: ARCANE_INITIATE })
    const initiate = Object.values(s.assets).find((a) => a.code === ARCANE_INITIATE)!
    expect(initiate.doom).toBe(1)
    s = dispatch(clear(s), { type: 'PlayerWindow', investigator: MARIE })
    s = choose(s, 'ability.searchDeck', { card: 'Arcane Initiate' })
    for (let n = 0; n < 5 && s.pending && !marie(s).hand.includes('01060'); n++)
      s = choose(s, labels(s)[0]!)
    expect(marie(s).hand).toContain('01060')
  })

  it('Torrent of Power (60469): each charge spent gives [willpower] [wild]', () => {
    let s = withMarie(clear(makeGame()), { hand: [TORRENT_OF_POWER] })
    s = dispatch(s, { type: 'PutAssetIntoPlay', investigator: MARIE, code: '01060' })
    s = dispatch(clear(s), {
      type: 'BeginSkillTest',
      investigator: MARIE,
      skill: 'willpower',
      difficulty: 9,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    })
    s = choose(s, 'choice.commit')
    for (let n = 0; n < 2; n++) s = choose(s, 'choice.tokenSkillCharge', { card: 'Shrivelling' })
    s = choose(s, 'choice.skip')
    for (let n = 0; n < 10 && s.pending; n++)
      s = choose(s, labels(s).includes('choice.revealToken') ? 'choice.revealToken' : labels(s)[0]!)
    // Willpower 4 + [wild] + 2 × ([willpower] [wild]) = 9 against 9.
    const result = (s as GameState).log.findLast((e) => e.key.startsWith('log.test'))
    expect(result?.key).toBe('log.testSuccess')
    expect(Object.values(s.assets).find((a) => a.code === '01060')!.uses).toBe(2)
  })
})
