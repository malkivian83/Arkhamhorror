import { playerCardDef } from '@lcg/engine'
import { expect, it } from 'vitest'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'

// RR: Deckbuilding and campaign upgrades. One entry per approved code.
for (const code of ['60118', '60111', '11045']) {
  it(`purchases ${code} into a legal deck and starts a scenario`, () => {
    let c = newCampaign('brethren-of-ash', [code === '11045' ? 'joe' : 'daniela'], 'easy')
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

it('upgrades Working a Hunch by replacing its lower level rather than another card', () => {
  let c = newCampaign('brethren-of-ash', ['joe'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 2
  const previous = c.investigators[0]!.deck
  const upgrade = purchaseOptions(c, id).find(
    (option) => option.code === '11045' && option.replaces,
  )!
  expect(upgrade.cost).toBe(2)
  expect(upgrade.needsRemoval).toBe(false)
  c = purchase(c, id, '11045', { upgrade: true })
  expect(c.investigators[0]!.deck).toHaveLength(previous.length)
  expect(c.investigators[0]!.deck).toContain('11045')
  expect(c.investigators[0]!.deck.filter((code) => code === upgrade.replaces)).toHaveLength(
    previous.filter((code) => code === upgrade.replaces).length - 1,
  )
  expect(c.log.investigators[id]!.xp).toBe(0)
})
