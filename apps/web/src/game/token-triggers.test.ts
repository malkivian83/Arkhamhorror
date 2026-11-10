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
  reprintSource,
} from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import data from '../../../../packages/cards/src/data/token-triggers.json'
import en from '../../../../packages/cards/src/token-triggers/source-en.json'
import es from '../../../../packages/cards/src/token-triggers/source-es.json'
it.each(data)(
  '$code is unique, has legal deckbuilding/purchase behavior and official EN/ES presentation',
  (card) => {
    expect(allPlayerCardDefs().filter((c) => c.code === card.code)).toHaveLength(1)
    const offered = reprintSource(card.code)
    expect(offered).toBe(card.code)
    const behavior = playerCardBehavior(card.code)!,
      buyer = investigatorCards().find((i) => cardPool(i.code).some((c) => c.code === offered))!
    expect(behavior).toBeDefined()
    expect(buyer).toBeDefined()
    const cards = [
      ...(buyer.signatures ?? []),
      ...cardPool(buyer.code)
        .filter(
          (c) =>
            c.xp === 0 &&
            !playerCardBehavior(c.code)?.permanent &&
            ((c.classes ?? [c.class]).includes(buyer.class) || c.class === 'neutral'),
        )
        .slice(0, buyer.deckSize ?? 30)
        .map((c) => c.code),
    ]
    let campaign = newCampaign('brethren-of-ash', [{ investigator: buyer.code, cards }], 'easy')
    const id = campaign.investigators[0]!.id
    campaign.log.investigators[id]!.xp = 40
    const offer = purchaseOptions(campaign, id).find((o) => o.code === offered && !o.replaces)!
    expect(offer).toBeDefined()
    // Exceptional cards cost twice their level ("Lucky" Penny).
    const xp = card.xp * ('exceptional' in card && card.exceptional ? 2 : 1)
    expect(offer.cost).toBe(card.xp === 0 ? (offer.needsRemoval ? 1 : 0) : xp)
    campaign = purchase(campaign, id, offered, {
      remove: campaign.investigators[0]!.deck.find(isStandard)!,
    })
    const s = startScenario(campaign, 3, false),
      i = s.investigators[0]!
    if (behavior.permanent)
      expect(Object.values(s.assets).some((a) => a.code === card.code)).toBe(true)
    else expect([...i.hand, ...i.deck, ...i.discard]).toContain(offered)
    for (const lang of ['en', 'es'] as const) {
      const source = (lang === 'en' ? en : es).find((c) => c.code === card.code)!,
        shown = fallbackCards(lang).filter((c) => c.code === card.code)
      expect(shown).toHaveLength(1)
      expect(shown[0]).toMatchObject({
        name: source.name,
        text: source.text,
        traits: source.traits,
      })

      const scan = lang
      expect(cardImages(card.code, false, lang)[0]).toBe(
        `/local-assets/cards/${scan}/${card.code}.avif`,
      )
    }
  },
)
