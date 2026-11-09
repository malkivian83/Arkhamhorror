// RR: Deckbuilding, Signature Cards, Weakness, Campaign Play. Official starter deck.
import { allPlayerCardDefs, playerCardDef } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchaseOptions, startScenario } from '../campaign'
import { deckFromArkhamDb, starterDeckList, validateDeck } from '../decks'
import source from './source-en.json'
import decklist from './starter-deck.json'
import { BLOOD_DRINKER, FELINE_HYBRID, KNAPSACK, MIGUEL } from './testing'

describe('Miguel de la Cruz: complete investigator starter pack', () => {
  const starter = () => starterDeckList('miguel', 'miguel', 'Miguel de la Cruz')

  it('ships the official 30-card deck with both signatures and its basic weakness', () => {
    const deck = starter()
    expect(deck.investigator).toBe(MIGUEL)
    expect(validateDeck(deck)).toMatchObject({ size: 30, problems: [] })
    expect(deck.cards).toHaveLength(33)
    for (const code of [KNAPSACK, FELINE_HYBRID, BLOOD_DRINKER])
      expect(deck.cards.filter((c) => c === code)).toHaveLength(1)
    for (let n = 60555; n <= 60569; n++)
      expect(deck.cards.filter((c) => c === String(n))).toHaveLength(2)
  })

  it('every code of the pack is implemented and defined exactly once', () => {
    expect(source).toHaveLength(32)
    for (const card of source) {
      expect(isImplemented(card.code), card.code).toBe(true)
      expect(
        allPlayerCardDefs().filter((d) => d.code === card.code),
        card.code,
      ).toHaveLength(1)
    }
  })

  it('imports the same exact codes from ArkhamDB and starts a campaign scenario', () => {
    const imported = deckFromArkhamDb(decklist, 'miguel')
    expect(imported.unknown).toEqual([])
    expect(imported.deck.cards.toSorted()).toEqual(starter().cards.toSorted())
    const campaign = newCampaign(
      'night-of-the-zealot',
      [{ investigator: MIGUEL, cards: imported.deck.cards }],
      'standard',
      3,
    )
    expect(
      campaign.investigators[0]!.deck.filter((c) => playerCardDef(c)?.weakness === 'basicweakness'),
    ).toEqual([BLOOD_DRINKER])
    const game = startScenario(campaign, 3, false)
    expect(game.investigators[0]!.id).toBe(MIGUEL)
    expect(game.investigators[0]!.name).toBe('Miguel de la Cruz')
  })

  it('a campaign started with a random basic weakness also starts a scenario', () => {
    const deck = starter().cards.filter((c) => c !== BLOOD_DRINKER)
    const campaign = newCampaign(
      'night-of-the-zealot',
      [{ investigator: MIGUEL, cards: deck }],
      'standard',
      5,
    )
    const weaknesses = campaign.investigators[0]!.deck.filter(
      (c) => playerCardDef(c)?.weakness === 'basicweakness',
    )
    expect(weaknesses).toHaveLength(1)
    expect(isImplemented(weaknesses[0]!)).toBe(true)
    expect(startScenario(campaign, 5, false).investigators[0]!.id).toBe(MIGUEL)
  })

  it('only allows Survivor and Neutral cards, and never offers his signatures', () => {
    const deck = starter()
    const cards = [...deck.cards]
    cards.splice(cards.indexOf('60555'), 1, '60114')
    expect(validateDeck({ ...deck, cards }).problems.map((p) => p.key)).toContain(
      'deck.problem.notAllowed',
    )
    const campaign = newCampaign('night-of-the-zealot', ['miguel'], 'standard')
    campaign.log.investigators[MIGUEL]!.xp = 20
    const codes = purchaseOptions(campaign, MIGUEL).map((o) => o.code)
    expect(codes).toContain('60576')
    expect(codes).toContain('60581')
    for (const code of [KNAPSACK, FELINE_HYBRID, '60102']) expect(codes).not.toContain(code)
    expect(
      codes.every((code) => {
        const card = playerCardDef(code)!
        return (card.classes ?? [card.class]).some((c) => ['survivor', 'neutral'].includes(c))
      }),
    ).toBe(true)
  })
})
