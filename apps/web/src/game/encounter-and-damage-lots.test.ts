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
import encounter from '../../../../packages/cards/src/data/encounter-draws.json'
import damage from '../../../../packages/cards/src/data/damage-reactions.json'
import encounterEn from '../../../../packages/cards/src/encounter-draws/source-en.json'
import encounterEs from '../../../../packages/cards/src/encounter-draws/source-es.json'
import damageEn from '../../../../packages/cards/src/damage-reactions/source-en.json'
import damageEs from '../../../../packages/cards/src/damage-reactions/source-es.json'
import mythos from '../../../../packages/cards/src/data/mythos-guard.json'
import mythosEn from '../../../../packages/cards/src/mythos-guard/source-en.json'
import mythosEs from '../../../../packages/cards/src/mythos-guard/source-es.json'
import escape from '../../../../packages/cards/src/data/narrow-escape.json'
import escapeEn from '../../../../packages/cards/src/narrow-escape/source-en.json'
import escapeEs from '../../../../packages/cards/src/narrow-escape/source-es.json'

it.each([...encounter, ...damage, ...mythos, ...escape])(
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
    const xp = card.xp
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
      const source = (
        lang === 'en'
          ? [...encounterEn, ...damageEn, ...mythosEn, ...escapeEn]
          : [...encounterEs, ...damageEs, ...mythosEs, ...escapeEs]
      ).find((c) => c.code === card.code)!
      const shown = fallbackCards(lang).filter((c) => c.code === card.code)
      const text =
        lang === 'es' && card.code === '02302'
          ? source.text.replace(
              'robes una carta de Encuentro,',
              'robes una carta del mazo de Encuentros,',
            )
          : lang === 'es' && card.code === '01082'
            ? source.text.replace('Cuando un Enemigo ataque,', 'Cuando un Enemigo te ataque,')
            : source.text
      expect(shown).toHaveLength(1)
      expect(shown[0]).toMatchObject({
        name: source.name,
        text,
        traits: source.traits,
      })

      expect(cardImages(card.code, false, lang)[0]).toBe(
        `/local-assets/cards/${lang}/${card.code}.avif`,
      )
    }
  },
)
