import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardBehavior } from '@lcg/engine'
import {
  newCampaign,
  purchase,
  purchaseOptions,
  startScenario,
  finishScenario,
  isStandard,
  validateDeck,
} from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import data from '../../../../packages/cards/src/data/token-skills.json'
import en from '../../../../packages/cards/src/token-skills/source-en.json'
import es from '../../../../packages/cards/src/token-skills/source-es.json'
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
  c.log.investigators[id]!.xp = 30
  expect(purchaseOptions(c, id).filter((o) => o.code === card.code && !o.replaces)).toHaveLength(1)
  c = purchase(c, id, card.code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(card.code)
  for (const lang of ['en', 'es'] as const) {
    const source = (lang === 'en' ? en : es).find((c) => c.code === card.code)!,
      shown = fallbackCards(lang).filter((c) => c.code === card.code)
    expect(shown).toHaveLength(1)
    expect(shown[0]).toMatchObject({ name: source.name, text: source.text, traits: source.traits })
    expect(cardImages(card.code, false, lang)[0]).toBe(
      `/local-assets/cards/${lang === 'es' && card.code === '06199' ? 'en' : lang}/${card.code}.avif`,
    )
    if (card.code === '06034') expect(shown[0]!.cost).toBe(-2)
  }
})
it.each(['11042', '06199', '06245', '06034'])(
  '%s allows three copies with two free additional purchases, and rejects a fourth',
  (code) => {
    const card = data.find((c) => c.code === code)!
    let c = newCampaign('brethren-of-ash', [investigators[card.class]!], 'easy')
    const id = c.investigators[0]!.id
    c.log.investigators[id]!.xp = 10
    for (let n = 0; n < 3; n++) {
      const offer = purchaseOptions(c, id).find((o) => o.code === code && !o.replaces)!
      expect(offer.cost).toBe(n === 0 ? 1 : 0)
      c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
    }
    expect(c.log.investigators[id]!.xp).toBe(9)
    expect(purchaseOptions(c, id).some((o) => o.code === code)).toBe(false)
    expect(
      validateDeck({
        id: 'myriad',
        name: 'Myriad',
        investigator: id,
        cards: c.investigators[0]!.deck,
      }).problems.some((p) => p.key === 'deck.problem.tooManyCopies'),
    ).toBe(false)
    expect(
      validateDeck({
        id: 'myriad',
        name: 'Myriad',
        investigator: id,
        cards: [...c.investigators[0]!.deck, code],
      }).problems.some((p) => p.key === 'deck.problem.tooManyCopies'),
    ).toBe(true)
  },
)
it('Myriad free-purchase credits survive serialization and expire when the scenario ends', () => {
  let c = newCampaign('brethren-of-ash', ['jenny'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 10
  c = purchase(c, id, '06199', { remove: c.investigators[0]!.deck.find(isStandard)! })
  c = JSON.parse(JSON.stringify(c)) as typeof c
  expect(c.investigators[0]!.myriadCredits?.['06199']).toBe(2)
  const s = startScenario(c, 3, false)
  c = finishScenario(c, { ...s, outcome: { type: 'resolution', resolution: 1 } })
  expect(c.investigators[0]!.myriadCredits).toBeUndefined()
  expect(purchaseOptions(c, id).find((o) => o.code === '06199' && !o.replaces)?.cost).toBe(1)
})
