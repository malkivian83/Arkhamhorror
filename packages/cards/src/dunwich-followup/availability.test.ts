import { describe, expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { starterDeckList, validateDeck, isStandard } from '../decks'
import '../index'
// RR: Deckbuilding; Experience; Deck Customization.
describe('Dunwich followup availability', () => {
  it('starts a scenario with Art Student in a legal level-zero deck', () => {
    const deck = starterDeckList('joe', 'j', 'J')
    deck.cards.splice(deck.cards.findIndex(isStandard), 1, '02149')
    expect(validateDeck(deck).problems).toEqual([])
    const c = newCampaign(
      'brethren-of-ash',
      [{ investigator: deck.investigator, cards: deck.cards }],
      'easy',
    )
    const s = startScenario(c, 3, false),
      i = s.investigators[0]!
    expect([...i.deck, ...i.hand, ...i.discard]).toContain('02149')
  })
  it.each([
    ['02035', 'daniela'],
    ['02194', 'joe'],
  ])('purchases %s for experience and preserves it in scenario setup', (code, investigator) => {
    let c = newCampaign('brethren-of-ash', [investigator], 'easy')
    const id = c.investigators[0]!.id
    c.log.investigators[id]!.xp = 2
    const option = purchaseOptions(c, id).find((o) => o.code === code)!
    expect(option.cost).toBe(2)
    const remove = c.investigators[0]!.deck.find(isStandard)!
    c = purchase(c, id, code, option.replaces ? { upgrade: true } : { remove })
    expect(c.log.investigators[id]!.xp).toBe(0)
    const s = startScenario(c, 3, false),
      i = s.investigators[0]!
    expect([...i.deck, ...i.hand, ...i.discard]).toContain(code)
  })
})
