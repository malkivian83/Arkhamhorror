import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardBehavior } from '@lcg/engine'
import { newCampaign, purchase, purchaseOptions, startScenario, isStandard } from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import data from '../../../../packages/cards/src/data/services-parley.json'
import en from '../../../../packages/cards/src/services-parley/source-en.json'
import es from '../../../../packages/cards/src/services-parley/source-es.json'
const investigators: Record<string, string> = {
  rogue: 'jenny',
  seeker: 'joe',
  mystic: 'dexter',
  survivor: 'isabelle',
}
it.each(data)('$code is unique, purchasable, playable and presented in EN/ES', (card) => {
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
    const source = (lang === 'en' ? en : es).find((c) => c.code === card.code)!
    const shown = fallbackCards(lang).filter((c) => c.code === card.code)
    expect(shown).toHaveLength(1)
    expect(shown[0]).toMatchObject({ name: source.name, text: source.text, traits: source.traits })
    expect(cardImages(card.code, false, lang)[0]).toBe(
      `/local-assets/cards/${lang === 'es' && ['04105', '05113'].includes(card.code) ? 'en' : lang}/${card.code}.avif`,
    )
  }
})
