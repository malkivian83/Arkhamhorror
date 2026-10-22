import { playerCardDef } from '@lcg/engine'
import { expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import approvals from './approvals.json'

const INVESTIGATORS = ['daniela', 'joe', 'trish', 'dexter', 'isabelle', 'pete']

// RR: Deckbuilding and campaign upgrades. One entry per approved code.
it.each(approvals.cards.map((c) => c.code))(
  'purchases %s into a legal deck and starts a scenario',
  (code) => {
    const buyer = INVESTIGATORS.map((id) => {
      const c = newCampaign('brethren-of-ash', [id], 'easy')
      c.log.investigators[c.investigators[0]!.id]!.xp = Math.max(1, playerCardDef(code)!.xp ?? 0)
      return c
    }).find((c) =>
      purchaseOptions(c, c.investigators[0]!.id).some((o) => o.code === code && !o.replaces),
    )
    expect(buyer, code).toBeDefined()
    const c = purchase(buyer!, buyer!.investigators[0]!.id, code, {
      remove: buyer!.investigators[0]!.deck.find(isStandard)!,
    })
    const i = startScenario(c, 3, false).investigators[0]!
    expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
  },
)
