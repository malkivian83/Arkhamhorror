import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardBehavior } from '@lcg/engine'
import { newCampaign, purchase, purchaseOptions, startScenario, isStandard } from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import data from '../../../../packages/cards/src/data/secret-scrolls.json'
import en from '../../../../packages/cards/src/secret-scrolls/source-en.json'
import es from '../../../../packages/cards/src/secret-scrolls/source-es.json'
const investigators: Record<string, string> = {
  neutral: 'daniela',
  guardian: 'daniela',
  seeker: 'joe',
  rogue: 'jenny',
  mystic: 'dexter',
  survivor: 'isabelle',
}
it.each(data)('$code is unique, purchasable, playable and presented in EN/ES', (card) => {
  expect(allPlayerCardDefs().filter((c) => c.code === card.code)).toHaveLength(1)
  expect(playerCardBehavior(card.code)).toBeDefined()
  let c = newCampaign('brethren-of-ash', [investigators[card.class]!], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 40
  const offer = purchaseOptions(c, id).find((o) => o.code === card.code && !o.replaces)!
  expect(offer).toBeDefined()
  c = purchase(c, id, card.code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const s = startScenario(c, 3, false),
    i = s.investigators[0]!
  if (playerCardBehavior(card.code)!.permanent)
    expect(Object.values(s.assets).some((a) => a.code === card.code)).toBe(true)
  else expect([...i.hand, ...i.deck, ...i.discard]).toContain(card.code)
  for (const lang of ['en', 'es'] as const) {
    const source = (lang === 'en' ? en : es).find((c) => c.code === card.code)!,
      shown = fallbackCards(lang).filter((c) => c.code === card.code)
    expect(shown).toHaveLength(1)
    expect(shown[0]).toMatchObject({ name: source.name, text: source.text, traits: source.traits })
    expect(cardImages(card.code, false, lang)[0]).toBe(`/local-assets/cards/en/${card.code}.avif`)
  }
})
