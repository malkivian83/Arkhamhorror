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
import actionSupport from '../../../../packages/cards/src/data/action-support.json'
import actionSupportEn from '../../../../packages/cards/src/action-support/source-en.json'
import actionSupportEs from '../../../../packages/cards/src/action-support/source-es.json'
import advanced from '../../../../packages/cards/src/data/advanced-tests.json'
import advancedEn from '../../../../packages/cards/src/advanced-tests/source-en.json'
import advancedEs from '../../../../packages/cards/src/advanced-tests/source-es.json'
import movement from '../../../../packages/cards/src/data/movement-support.json'
import movementEn from '../../../../packages/cards/src/movement-support/source-en.json'
import movementEs from '../../../../packages/cards/src/movement-support/source-es.json'
import { messages } from '@lcg/i18n'

it.each([
  ...encounter,
  ...damage,
  ...mythos,
  ...escape,
  ...advanced,
  ...actionSupport,
  ...movement,
])(
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
    expect(
      purchaseOptions(campaign, id).filter((o) => o.code === offered && !o.replaces),
    ).toHaveLength(1)
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
      const source = (
        lang === 'en'
          ? [
              ...encounterEn,
              ...damageEn,
              ...mythosEn,
              ...escapeEn,
              ...advancedEn,
              ...actionSupportEn,
              ...movementEn,
            ]
          : [
              ...encounterEs,
              ...damageEs,
              ...mythosEs,
              ...escapeEs,
              ...advancedEs,
              ...actionSupportEs,
              ...movementEs,
            ]
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

it('the three Empower Self subtitles share Myriad experience without sharing their one-copy limits', () => {
  const codes = ['06241', '06242', '06243']
  const buyer = investigatorCards().find((i) =>
    codes.every((code) => cardPool(i.code).some((c) => c.code === code)),
  )!
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
  campaign.log.investigators[id]!.xp = 6
  for (const [n, code] of codes.entries()) {
    const offer = purchaseOptions(campaign, id).find((o) => o.code === code && !o.replaces)!
    expect(offer.cost).toBe(n === 0 ? 2 : 0)
    campaign = purchase(campaign, id, code, {
      remove: campaign.investigators[0]!.deck.find(isStandard)!,
    })
    expect(purchaseOptions(campaign, id).some((o) => o.code === code && !o.replaces)).toBe(false)
  }
  expect(campaign.investigators[0]!.deck).toEqual(expect.arrayContaining(codes))
  expect(campaign.log.investigators[id]!.xp).toBe(4)
})

it('Forbidden Sutra cannot enter a deck without a printed permitted investigator trait', () => {
  for (const investigator of investigatorCards()) {
    if (investigator.traits.some((trait) => ['Blessed', 'Cursed', 'Sorcerer'].includes(trait)))
      continue
    expect(cardPool(investigator.code).some((c) => c.code === '11103')).toBe(false)
  }
})

it.each(['en', 'es'] as const)('new choice labels have %s translations', (lang) => {
  const m = messages[lang]
  for (const key of [
    'advancedTest',
    'testRetry',
    'advancedHorror',
    'advancedUseCombat',
    'advancedUseAgility',
    'advancedUseIntellect',
  ])
    expect((m.ability as Record<string, unknown>)[key]).toBeTypeOf('string')
  for (const key of ['advancedExtraAmmo', 'advancedReplaceReveal', 'gainAction'])
    expect((m.choice as Record<string, unknown>)[key]).toBeTypeOf('string')
})
