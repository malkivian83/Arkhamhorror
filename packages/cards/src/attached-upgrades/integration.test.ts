import { playerCardDef } from '@lcg/engine'
import { expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'

// RR: Deckbuilding and campaign upgrades. One entry per approved code.
for (const code of [
  '04019',
  '04020',
  '04193',
  '60172',
  '60162',
  '60163',
  '05152',
  '10028',
  '10054',
]) {
  it(`purchases ${code} into a legal deck and starts a scenario`, () => {
    // Joe is a Seeker; Daniela covers the Guardian upgrades.
    let c = newCampaign('brethren-of-ash', [code === '10054' ? 'joe' : 'daniela'], 'easy')
    const id = c.investigators[0]!.id
    c.log.investigators[id]!.xp = Math.max(1, playerCardDef(code)!.xp ?? 0)
    const offers = purchaseOptions(c, id).filter((option) => option.code === code)
    expect(offers.filter((option) => !option.replaces)).toHaveLength(1)
    expect(new Set(offers.map((option) => option.replaces ?? 'new')).size).toBe(offers.length)
    c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
    const i = startScenario(c, 3, false).investigators[0]!
    expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
  })
}
