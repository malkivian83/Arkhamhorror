// RR: Deckbuilding, Signature cards, Campaign Play. ArkhamDB decklist 1179 as published.
import { playerCardDef } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { isImplemented, newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { deckFromArkhamDb, isStandard, starterDeckList, validateDeck } from '../decks'
import approvals from './approvals.json'
import data from './decklist-1179.json'
import { JENNY } from './testing'

const imported = () => deckFromArkhamDb(data, '1179').deck
const campaignWith = (cards: string[]) =>
  newCampaign('brethren-of-ash', [{ investigator: JENNY, cards }], 'standard', 7)

describe('decklist 1179: Jenny "Campaign-Breaker" Barnes', () => {
  it('imports every code as published and every card is playable', () => {
    const { deck, unknown } = deckFromArkhamDb(data, '1179')
    expect(unknown).toEqual([])
    expect(deck.investigator).toBe(JENNY)
    expect(deck.cards).toHaveLength(32)
    expect(validateDeck(deck)).toMatchObject({ problems: [], size: 30, needsBasicWeakness: true })
    for (const code of new Set([JENNY, ...deck.cards])) expect(isImplemented(code), code).toBe(true)
  })

  it('creates a campaign with one real basic weakness and starts a scenario', () => {
    const member = campaignWith([...imported().cards, '01000']).investigators[0]!
    expect(member.deck).not.toContain('01000')
    expect(member.deck.filter((c) => playerCardDef(c)?.weakness === 'basicweakness')).toHaveLength(
      1,
    )
    const c = campaignWith(imported().cards)
    const i = startScenario(c, 3, false).investigators.find((x) => x.id === JENNY)!
    expect([...i.hand, ...i.deck]).toContain('02010')
  })

  it('enforces the limit of five level 0 cards from other classes', () => {
    const deck = imported()
    const sixth = { ...deck, cards: [...deck.cards.filter((c) => c !== '01088'), '01024'] }
    expect(validateDeck(sixth).problems.map((p) => p.key)).toContain('deck.problem.offClassLimit')
    const c = campaignWith(deck.cards)
    c.log.investigators[JENNY]!.xp = 1
    const offClass = purchaseOptions(c, JENNY).find(
      (o) => !o.replaces && !['rogue', 'neutral'].includes(playerCardDef(o.code)!.class),
    )!
    expect(() => purchase(c, JENNY, offClass.code, { remove: '01088' })).toThrow('Máximo 5')
  })

  it('ships a valid starter deck built from the same list', () => {
    const starter = starterDeckList('jenny', 'jenny', 'Jenny')
    expect(validateDeck(starter).problems).toEqual([])
    const i = startScenario(newCampaign('brethren-of-ash', ['jenny'], 'easy'), 3, false)
      .investigators[0]!
    expect(i.id).toBe(JENNY)
  })
})

// RR: campaign upgrades. Signatures are never offered; the standard cards are.
it.each(approvals.cards.map((c) => c.code))(
  '%s is purchasable only when it is not a signature',
  (code) => {
    const options = ['daniela', 'joe', 'trish', 'dexter', 'isabelle', 'pete', 'jenny'].flatMap(
      (id) => {
        const c = newCampaign('brethren-of-ash', [id], 'easy')
        c.log.investigators[c.investigators[0]!.id]!.xp = 1
        return purchaseOptions(c, c.investigators[0]!.id)
          .filter((o) => o.code === code && !o.replaces)
          .map(() => c)
      },
    )
    const signature = playerCardDef(JENNY)!.signatures!.includes(code) || code === JENNY
    expect(options.length > 0).toBe(!signature)
    if (signature) return
    const c = options[0]!
    const id = c.investigators[0]!.id
    const bought = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
    const i = startScenario(bought, 3, false).investigators[0]!
    expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
  },
)
