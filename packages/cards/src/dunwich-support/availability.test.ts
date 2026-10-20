import { describe, expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { starterDeckList, validateDeck, isStandard } from '../decks'
import '../index'
// RR: Deckbuilding; Experience; Deck Customization.
describe('Dunwich support availability', () => {
  it('starts with Preposterous Sketches in a legal starting deck', () => {
    const deck = starterDeckList('joe', 'j', 'J')
    deck.cards.splice(deck.cards.findIndex(isStandard), 1, '02186')
    expect(validateDeck(deck).problems).toEqual([])
    const c = newCampaign(
      'brethren-of-ash',
      [{ investigator: deck.investigator, cards: deck.cards }],
      'easy',
    )
    const i = startScenario(c, 3, false).investigators[0]!
    expect([...i.deck, ...i.hand, ...i.discard]).toContain('02186')
  })
  it.each([
    ['02148', 'daniela', 3],
    ['02150', 'joe', 2],
    ['02268', 'dexter', 2],
    ['02273', 'joe', 3],
  ])('purchases %s for experience and preserves it during setup', (code, investigator, cost) => {
    let c = newCampaign('brethren-of-ash', [investigator as 'daniela' | 'joe' | 'dexter'], 'easy')
    const id = c.investigators[0]!.id
    c.log.investigators[id]!.xp = Number(cost)
    const option = purchaseOptions(c, id).find((o) => o.code === code)!
    expect(option.cost).toBe(cost)
    const remove = c.investigators[0]!.deck.find(isStandard)!
    c = purchase(c, id, String(code), option.replaces ? { upgrade: true } : { remove })
    expect(c.log.investigators[id]!.xp).toBe(0)
    const i = startScenario(c, 3, false).investigators[0]!
    expect([...i.deck, ...i.hand, ...i.discard]).toContain(code)
  })
})
