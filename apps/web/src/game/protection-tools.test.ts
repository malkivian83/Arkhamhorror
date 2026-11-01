import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardBehavior } from '@lcg/engine'
import { newCampaign, purchase, purchaseOptions, startScenario, isStandard } from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import data from '../../../../packages/cards/src/data/protection-tools.json'
import en from '../../../../packages/cards/src/protection-tools/source-en.json'
import es from '../../../../packages/cards/src/protection-tools/source-es.json'
const investigators: Record<string, string> = {
  guardian: 'daniela',
  seeker: 'joe',
  rogue: 'jenny',
  mystic: 'dexter',
  survivor: 'isabelle',
}
it.each(data)('$code is unique, purchasable, playable and rendered in EN/ES', (card) => {
  expect(allPlayerCardDefs().filter((c) => c.code === card.code)).toHaveLength(1)
  expect(playerCardBehavior(card.code)).toBeDefined()
  let c = newCampaign('brethren-of-ash', [investigators[card.class]!], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 30
  expect(purchaseOptions(c, id).filter((o) => o.code === card.code)).toHaveLength(1)
  c = purchase(c, id, card.code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(card.code)
  for (const lang of ['en', 'es'] as const) {
    const original = (lang === 'en' ? en : es).find((c) => c.code === card.code)!
    const rendered = fallbackCards(lang).filter((c) => c.code === card.code)
    expect(rendered).toHaveLength(1)
    expect(rendered[0]).toMatchObject({
      name: original.name,
      text: original.text,
      traits: original.traits,
    })
    expect(cardImages(card.code, false, lang)[0]).toBe(
      `/local-assets/cards/${card.code === '03156' && lang === 'es' ? 'en' : lang}/${card.code}.avif`,
    )
  }
})
it('Ice Pick 3 is available to both Seeker and Survivor investigators', () => {
  for (const investigator of ['joe', 'isabelle']) {
    const c = newCampaign('brethren-of-ash', [investigator], 'easy'),
      id = c.investigators[0]!.id
    c.log.investigators[id]!.xp = 30
    expect(purchaseOptions(c, id).some((o) => o.code === '08107')).toBe(true)
  }
})
