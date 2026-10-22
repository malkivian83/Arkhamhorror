import { allPlayerCardDefs } from '@lcg/engine'
import { expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import './index'

// RR: Deck Customization, Campaign Upgrades. Each card is registered once and can be
// bought with experience and shuffled into a scenario deck.
it.each([
  ['51001', 'daniela'],
  ['05112', 'dexter'],
  ['60205', 'joe'],
  ['60410', 'dexter'],
  ['11044', 'joe'],
])('%s has one definition and can enter a campaign scenario', (code, investigator) => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', [investigator], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 2
  const option = purchaseOptions(c, id).find((o) => o.code === code)!
  expect(option).toBeDefined()
  c = purchase(
    c,
    id,
    code,
    option.replaces ? { upgrade: true } : { remove: c.investigators[0]!.deck.find(isStandard)! },
  )
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
})
