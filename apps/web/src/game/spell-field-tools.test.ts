import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardBehavior } from '@lcg/engine'
import {
  newCampaign,
  purchase,
  purchaseOptions,
  startScenario,
  isStandard,
  investigatorCards,
  cardPool,
} from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import data from '../../../../packages/cards/src/data/spell-field-tools.json'
import en from '../../../../packages/cards/src/spell-field-tools/source-en.json'
import es from '../../../../packages/cards/src/spell-field-tools/source-es.json'

it('keeps the incorrect Spanish Longbow scan out of the displayed images and thumbnails', () => {
  expect(cardImages('60580', false, 'es')).toEqual(['/local-assets/cards/en/60580.avif'])
})

it.each(data)(
  '$code is unique, legal to purchase and presented with its official EN/ES resources',
  (card) => {
    expect(allPlayerCardDefs().filter((c) => c.code === card.code)).toHaveLength(1)
    const behavior = playerCardBehavior(card.code)!
    expect(behavior).toBeDefined()
    const buyer = investigatorCards().find((i) =>
      cardPool(i.code).some((c) => c.code === card.code),
    )!
    expect(buyer).toBeDefined()
    const cards = [
      ...(buyer.signatures ?? []),
      ...cardPool(buyer.code)
        .filter((c) => c.xp === 0 && !playerCardBehavior(c.code)?.permanent)
        .slice(0, buyer.deckSize ?? 30)
        .map((c) => c.code),
    ]
    if (behavior.requiredResearch && !cards.includes('60259')) cards[cards.length - 1] = '60259'
    let campaign = newCampaign('brethren-of-ash', [{ investigator: buyer.code, cards }], 'easy')
    const id = campaign.investigators[0]!.id
    campaign.log.investigators[id]!.xp = 40
    if (behavior.requiredResearch) {
      expect(purchaseOptions(campaign, id).some((o) => o.code === card.code)).toBe(false)
      campaign.log.notes.push(behavior.requiredResearch)
    }
    const offer = purchaseOptions(campaign, id).find(
      (o) =>
        o.code === card.code && (behavior.requiredResearch ? o.replaces === '60259' : !o.replaces),
    )!
    expect(offer).toBeDefined()
    expect(offer.cost).toBe(
      card.xp === 0 ? (offer.needsRemoval ? 1 : 0) : card.xp * ('exceptional' in card ? 2 : 1),
    )
    campaign = purchase(campaign, id, card.code, {
      remove: campaign.investigators[0]!.deck.find(isStandard)!,
      ...(offer.replaces ? { upgrade: true, replaces: offer.replaces } : {}),
    })
    if ('exceptional' in card)
      expect(purchaseOptions(campaign, id).some((o) => o.code === card.code)).toBe(false)
    const s = startScenario(campaign, 3, false),
      i = s.investigators[0]!
    if (behavior.permanent)
      expect(Object.values(s.assets).some((a) => a.code === card.code)).toBe(true)
    else expect([...i.hand, ...i.deck, ...i.discard]).toContain(card.code)
    for (const lang of ['en', 'es'] as const) {
      const source = (lang === 'en' ? en : es).find((c) => c.code === card.code)!
      const shown = fallbackCards(lang).filter((c) => c.code === card.code)
      expect(shown).toHaveLength(1)
      expect(shown[0]).toMatchObject({
        name: source.name,
        text: source.text,
        traits: source.traits,
      })
      expect(cardImages(card.code, false, lang)[0]).toBe(
        `/local-assets/cards/${lang === 'es' && card.code === '60580' ? 'en' : lang}/${card.code}.avif`,
      )
    }
  },
)
