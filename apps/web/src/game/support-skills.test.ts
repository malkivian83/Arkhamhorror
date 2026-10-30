import { expect, it } from 'vitest'
import { allPlayerCardDefs } from '@lcg/engine'
import { newCampaign, purchase, purchaseOptions, startScenario, isStandard } from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import data from '../../../../packages/cards/src/data/support-skills.json'
import en from '../../../../packages/cards/src/support-skills/source-en.json'
import es from '../../../../packages/cards/src/support-skills/source-es.json'
const investigators: Record<string, string> = {
  guardian: 'daniela',
  neutral: 'daniela',
  seeker: 'joe',
  rogue: 'jenny',
  mystic: 'dexter',
  survivor: 'isabelle',
}
it.each(data)(
  '$code is unique, purchasable, starts legally and has official EN/ES presentation',
  (card) => {
    expect(allPlayerCardDefs().filter((c) => c.code === card.code)).toHaveLength(1)
    let c = newCampaign('brethren-of-ash', [investigators[card.class]!], 'easy')
    const id = c.investigators[0]!.id
    c.log.investigators[id]!.xp = 30
    expect(purchaseOptions(c, id).filter((o) => o.code === card.code && !o.replaces)).toHaveLength(
      1,
    )
    c = purchase(c, id, card.code, { remove: c.investigators[0]!.deck.find(isStandard)! })
    const i = startScenario(c, 3, false).investigators[0]!
    expect([...i.hand, ...i.deck, ...i.discard]).toContain(card.code)
    for (const lang of ['en', 'es'] as const) {
      const original = (lang === 'en' ? en : es).find((c) => c.code === card.code)!
      const cards = fallbackCards(lang).filter((c) => c.code === card.code)
      expect(cards).toHaveLength(1)
      expect(cards[0]).toMatchObject({
        name: original.name,
        text: original.text,
        traits: original.traits,
      })
      expect(cardImages(card.code, false, lang)[0]).toBe(
        `/local-assets/cards/${lang}/${card.code}.avif`,
      )
    }
  },
)
