import { allPlayerCardDefs } from '@lcg/engine'
import { expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import './index'

// RR: Deck Customization, Campaign Upgrades. Each card is registered once and can be
// bought with experience and shuffled into a scenario deck.
it.each([
  ['08024', 'daniela'],
  ['08037', 'joe'],
  ['02231', 'jenny'],
  ['60526', 'pete'],
  ['60180', 'daniela'],
])('%s has one definition and can enter a campaign scenario', (code, investigator) => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', [investigator], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
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
