// RR: Deckbuilding, Signature cards, Basic weaknesses, Campaign Play. Official starter deck.
import { allPlayerCardDefs, playerCardDef } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchaseOptions, startScenario } from '../campaign'
import { deckFromArkhamDb, starterDeckList, validateDeck } from '../decks'
import definitions from '../data/carolyn-fern.json'
import source from './source-en.json'
import starter from './starter-deck.json'
import { C } from './testing'

describe('Carolyn Fern: starter deck and campaign', () => {
  it('ships the official 30-card deck with her signatures and Lethal Curiosity', () => {
    const deck = starterDeckList('carolyn', 'carolyn', 'Carolyn')
    expect(deck.investigator).toBe(C)
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30, unimplemented: [] })
    expect(deck.cards).toHaveLength(33)
    for (const code of ['60252', '60253', '60254'])
      expect(deck.cards.filter((c) => c === code)).toHaveLength(1)
    for (let n = 60255; n <= 60269; n++)
      expect(deck.cards.filter((c) => c === String(n))).toHaveLength(2)
  })

  it('implements every code of the pack exactly once', () => {
    expect(source.map((c) => c.code)).toEqual(
      Array.from({ length: 32 }, (_, n) => String(60251 + n)),
    )
    for (const card of source) {
      expect(isImplemented(card.code), card.code).toBe(true)
      expect(
        allPlayerCardDefs().filter((d) => d.code === card.code),
        card.code,
      ).toHaveLength(1)
    }
    for (const c of definitions) expect(playerCardDef(c.code)).toEqual(c)
  })

  it('imports the official list from ArkhamDB and starts a scenario with a real basic weakness', () => {
    const { deck, unknown } = deckFromArkhamDb(starter, 'car')
    expect(unknown).toEqual([])
    expect(validateDeck(deck).problems).toEqual([])
    const c = newCampaign(
      'night-of-the-zealot',
      [{ investigator: C, cards: deck.cards }],
      'standard',
      3,
    )
    expect(
      c.investigators[0]!.deck.filter((x) => playerCardDef(x)?.weakness === 'basicweakness'),
    ).toHaveLength(1)
    expect(startScenario(c, 3, false).investigators[0]!.id).toBe(C)
    // The starter deck key keeps its selected basic weakness.
    const keyed = newCampaign('night-of-the-zealot', ['carolyn'], 'standard', 4)
    expect(
      keyed.investigators[0]!.deck.filter(
        (code) => playerCardDef(code)?.weakness === 'basicweakness',
      ),
    ).toEqual(['60254'])
    expect(startScenario(keyed, 4, false).investigators[0]!.id).toBe(C)
  })

  it('only allows Seeker/Neutral cards and never sells signatures', () => {
    const deck = starterDeckList('carolyn', 'carolyn', 'Carolyn')
    const cards = [...deck.cards]
    cards.splice(cards.indexOf('60261'), 1, '60105')
    expect(validateDeck({ ...deck, cards }).problems.map((p) => p.key)).toContain(
      'deck.problem.notAllowed',
    )
    const c = newCampaign('night-of-the-zealot', ['carolyn'], 'standard')
    c.log.investigators[C]!.xp = 20
    const shop = purchaseOptions(c, C).map((o) => o.code)
    expect(shop).not.toContain('60252')
    expect(shop).not.toContain('60202')
    expect(shop).toContain('60272')
    expect(shop).toContain('60273')
    expect(shop).not.toContain('60105')
  })
})
