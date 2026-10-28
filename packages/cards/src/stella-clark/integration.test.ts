// RR: Deckbuilding, Signature cards, Exile, Campaign Play. ArkhamDB decklists 25117 and 39832.
import { playerCardDef, type GameState } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import {
  finishScenario,
  isImplemented,
  newCampaign,
  purchase,
  purchaseOptions,
  startScenario,
} from '../campaign'
import { deckFromArkhamDb, starterDeckList, validateDeck } from '../decks'
import blunder from './decklist-25117.json'
import guide from './decklist-39832.json'
import { DEJA_VU, LEATHER_COAT_1, STELLA } from './testing'

describe('Stella Clark: decks and campaign', () => {
  it('ships her official 30-card starter deck with her signatures and Atychiphobia', () => {
    const deck = starterDeckList('stella', 'stella', 'Stella')
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30 })
    expect(deck.cards.filter((c) => c === '60502')).toHaveLength(3)
    expect(deck.cards).toContain('60503')
    expect(deck.cards).toContain('60504')
    for (const code of new Set([STELLA, ...deck.cards]))
      expect(isImplemented(code), code).toBe(true)
  })

  it.each([
    [blunder, '25117'],
    [guide, '39832'],
  ])('imports decklist %#: every code is playable and a scenario starts', (data, id) => {
    const { deck, unknown } = deckFromArkhamDb(data, id)
    expect(unknown).toEqual([])
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30, needsBasicWeakness: true })
    for (const code of new Set([STELLA, ...deck.cards]))
      expect(isImplemented(code), code).toBe(true)
    // 39832 includes In the Thick of It: two trauma are chosen when the deck is created.
    const startingTrauma = deck.cards.includes('08125') ? { physical: 1, mental: 1 } : undefined
    const member0 = {
      investigator: STELLA,
      cards: deck.cards,
      ...(startingTrauma ? { startingTrauma } : {}),
    }
    const c = newCampaign('night-of-the-zealot', [member0], 'standard', 3)
    const member = c.investigators[0]!
    expect(member.deck.filter((x) => playerCardDef(x)?.weakness === 'basicweakness')).toHaveLength(
      1,
    )
    expect(startScenario(c, 3, false).investigators[0]!.id).toBe(STELLA)
  })

  it('only allows Survivor and Neutral cards and never offers her signatures', () => {
    const deck = starterDeckList('stella', 'stella', 'Stella')
    const cards = [...deck.cards]
    cards.splice(cards.indexOf('60506'), 1, '12016')
    expect(validateDeck({ ...deck, cards }).problems.map((p) => p.key)).toContain(
      'deck.problem.notAllowed',
    )
    const c = newCampaign('night-of-the-zealot', ['stella'], 'standard')
    c.log.investigators[STELLA]!.xp = 5
    const options = purchaseOptions(c, STELLA).map((o) => o.code)
    expect(options).not.toContain('60502')
    expect(options).toContain(LEATHER_COAT_1)
  })

  it('exiled cards leave the deck; level 0 cards fill it for free and Déjà Vu discounts', () => {
    let c = newCampaign('night-of-the-zealot', ['stella'], 'standard')
    c.log.investigators[STELLA]!.xp = 10
    c = purchase(c, STELLA, DEJA_VU)
    c = purchase(c, STELLA, LEATHER_COAT_1, { remove: '60506' })
    const xp = c.log.investigators[STELLA]!.xp
    const game = startScenario(c, 3, false)
    const ended: GameState = {
      ...game,
      outcome: { type: 'resolution', resolution: 1 },
      exiled: [{ investigator: STELLA, code: LEATHER_COAT_1 }],
    }
    const after = finishScenario(c, ended)
    const member = after.investigators[0]!
    expect(member.deck).not.toContain(LEATHER_COAT_1)
    expect(member.exiled).toEqual([LEATHER_COAT_1])
    const options = purchaseOptions(after, STELLA)
    // FAQ 1.18: a level 0 card fills the missing slot at no cost.
    expect(options.find((o) => o.code === '60506')?.cost).toBe(0)
    // Déjà Vu: repurchasing the exiled Leather Coat (1) costs 1 less.
    expect(options.find((o) => o.code === LEATHER_COAT_1)?.cost).toBe(0)
    const bought = purchase(after, STELLA, LEATHER_COAT_1)
    expect(bought.investigators[0]!.dejaVuUsed).toBe(1)
    expect(bought.log.investigators[STELLA]!.xp).toBeGreaterThanOrEqual(xp)
  })
})
