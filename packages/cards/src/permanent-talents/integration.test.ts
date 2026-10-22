import { dispatch, isPermanent } from '@lcg/engine'
import { expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, removableCards, startScenario } from '../campaign'
import approvals from './approvals.json'
const ids = ['daniela', 'joe', 'trish', 'dexter', 'isabelle']
// RR: Permanent, Deck Customization, Setup. Permanents do not replace a deck card.
it.each(approvals.cards.map((c) => c.code))(
  '%s can be bought once and starts in play outside the shuffled deck',
  (code) => {
    const c = ids
      .map((id) => {
        const c = newCampaign('brethren-of-ash', [id], 'easy')
        c.log.investigators[c.investigators[0]!.id]!.xp = 6
        return c
      })
      .find((c) =>
        purchaseOptions(c, c.investigators[0]!.id).some((o) => o.code === code && !o.replaces),
      )!
    const id = c.investigators[0]!.id
    expect(isPermanent(code)).toBe(true)
    const options = purchaseOptions(c, id).filter((o) => o.code === code)
    expect(options).toHaveLength(1)
    expect(options[0]!.needsRemoval).toBe(false)
    const next = purchase(c, id, code)
    expect(next.investigators[0]!.deck.length).toBe(c.investigators[0]!.deck.length + 1)
    expect(removableCards(next, id)).not.toContain(code)
    const s = startScenario(next, 3, false)
    expect(Object.values(s.assets).filter((a) => a.code === code)).toHaveLength(1)
    const asset = Object.values(s.assets).find((a) => a.code === code)!
    expect(
      dispatch({ ...s, pending: null, queue: [] }, { type: 'DiscardAsset', asset: asset.id })
        .assets[asset.id],
    ).toBeDefined()
    const i = s.investigators[0]!
    expect([...i.hand, ...i.deck, ...i.discard]).not.toContain(code)
  },
)
it('respects the printed two-copy limit and sets up both Keen Eye permanents', () => {
  let c = newCampaign('brethren-of-ash', ['daniela'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 9
  c = purchase(purchase(c, id, '02185'), id, '02185')
  expect(purchaseOptions(c, id).some((o) => o.code === '02185')).toBe(false)
  expect(() => purchase(c, id, '02185')).toThrow()
  expect(
    Object.values(startScenario(c, 3, false).assets).filter((a) => a.code === '02185'),
  ).toHaveLength(2)
})
