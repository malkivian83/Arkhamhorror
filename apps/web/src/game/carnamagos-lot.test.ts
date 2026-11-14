// Lot 147 (RR Bonded): summoners are bought and bring their bonded cards set aside; bonded
// cards are never offered; every card keeps its official EN/ES presentation and scans.
import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardBehavior } from '@lcg/engine'
import {
  cardPool,
  investigatorCards,
  isStandard,
  newCampaign,
  purchase,
  purchaseOptions,
  startScenario,
} from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import bonded from '../../../../packages/cards/src/data/carnamagos.json'
import bondedEn from '../../../../packages/cards/src/carnamagos/source-en.json'
import bondedEs from '../../../../packages/cards/src/carnamagos/source-es.json'

const campaignFor = (code: string) => {
  const buyer = investigatorCards().find((i) => cardPool(i.code).some((c) => c.code === code))!
  const cards = [
    ...(buyer.signatures ?? []),
    ...cardPool(buyer.code)
      .filter(
        (c) =>
          c.xp === 0 &&
          c.name !== 'Rod of Carnamagos' &&
          !playerCardBehavior(c.code)?.permanent &&
          ((c.classes ?? [c.class]).includes(buyer.class) || c.class === 'neutral'),
      )
      .slice(0, buyer.deckSize ?? 30)
      .map((c) => c.code),
  ]
  const campaign = newCampaign('brethren-of-ash', [{ investigator: buyer.code, cards }], 'easy')
  campaign.log.investigators[campaign.investigators[0]!.id]!.xp = 40
  return campaign
}

it.each(bonded)('$code has its official EN/ES presentation and scans', (card) => {
  expect(allPlayerCardDefs().filter((c) => c.code === card.code)).toHaveLength(1)
  for (const lang of ['en', 'es'] as const) {
    const source = (lang === 'en' ? bondedEn : bondedEs).find((c) => c.code === card.code)!
    const shown = fallbackCards(lang).filter((c) => c.code === card.code)
    expect(shown).toHaveLength(1)
    expect(shown[0]).toMatchObject({
      name: source.name,
      text: source.text,
      traits: source.traits,
    })
    expect(cardImages(card.code, false, lang)[0]).toBe(
      `/local-assets/cards/${lang}/${card.code}.avif`,
    )
  }
})

it.each(bonded.filter((c) => !('bondedCard' in c)))(
  '$code can be bought once and prepares its own bonded set',
  (card) => {
    let campaign = campaignFor(card.code)
    const id = campaign.investigators[0]!.id
    expect(
      purchaseOptions(campaign, id).filter((o) => o.code === card.code && !o.replaces),
    ).toHaveLength(1)
    campaign = purchase(campaign, id, card.code, {
      remove: campaign.investigators[0]!.deck.find(isStandard)!,
    })
    const s = startScenario(campaign, 3, false),
      i = s.investigators[0]!
    expect([...i.hand, ...i.deck]).toContain(card.code)
    const expected = ('bonded' in card ? card.bonded : []).flatMap((b) =>
      Array<string>(b.count).fill(b.code),
    )
    expect([...(i.outOfPlay ?? [])].sort()).toEqual(expected.sort())
  },
)

it('Rot cards cannot be bought, the base Rod has limit one, and its upgrade has limit two', () => {
  const campaign = campaignFor('10085'),
    id = campaign.investigators[0]!.id
  for (const card of bonded.filter((c) => 'bondedCard' in c))
    expect(purchaseOptions(campaign, id).some((o) => o.code === card.code)).toBe(false)
  expect(allPlayerCardDefs().find((c) => c.code === '10085')?.deckLimit).toBe(1)
  expect(allPlayerCardDefs().find((c) => c.code === '10098')?.deckLimit ?? 2).toBe(2)
})
