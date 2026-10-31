import { expect, it } from 'vitest'
import { allPlayerCardDefs } from '@lcg/engine'
import { newCampaign, purchase, purchaseOptions, startScenario, isStandard } from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import data from '../../../../packages/cards/src/data/charged-assets.json'
import en from '../../../../packages/cards/src/charged-assets/source-en.json'
import es from '../../../../packages/cards/src/charged-assets/source-es.json'
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
        ...('subname' in original ? { subname: original.subname } : {}),
      })
      expect(cardImages(card.code, false, lang)[0]).toBe(
        `/local-assets/cards/${lang}/${card.code}.avif`,
      )
    }
  },
)
it.each(
  data.flatMap(
    (card) =>
      ('classes' in card ? card.classes : undefined)?.map((faction) => ({
        code: card.code,
        faction,
      })) ?? [],
  ),
)('$code is offered to its $faction faction', ({ code, faction }) => {
  const c = newCampaign('brethren-of-ash', [investigators[faction]!], 'easy'),
    id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 30
  expect(purchaseOptions(c, id).some((o) => o.code === code)).toBe(true)
})
