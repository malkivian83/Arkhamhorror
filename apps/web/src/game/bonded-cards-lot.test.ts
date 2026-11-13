// Lot 144 (RR Bonded): summoners are bought and bring their bonded cards set aside; bonded
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
import bonded from '../../../../packages/cards/src/data/bonded-cards.json'
import bondedEn from '../../../../packages/cards/src/bonded-cards/source-en.json'
import bondedEs from '../../../../packages/cards/src/bonded-cards/source-es.json'

// FAQ v2.0 erratum: the summoner sets its bonded copies aside instead of removing them.
const errata = (code: string, text: string) =>
  ['05313', '05316'].includes(code)
    ? text.replace(
        '(incluso si están fuera del juego) y retíralas de la partida.',
        '(incluso si están fuera del juego) y ponlas aparte, fuera del juego.',
      )
    : text

const campaignFor = (code: string) => {
  const buyer = investigatorCards().find((i) => cardPool(i.code).some((c) => c.code === code))!
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
      text: lang === 'es' ? errata(card.code, source.text) : source.text,
      traits: source.traits,
    })
    expect(cardImages(card.code, false, lang)[0]).toBe(
      `/local-assets/cards/${lang}/${card.code}.avif`,
    )
  }
})

it.each(
  bonded.filter((c) => !('bondedCard' in c) && !['06236', '06237', '06238'].includes(c.code)),
)('$code is bought once and its bonded cards start the scenario set aside', (card) => {
  let campaign = campaignFor(card.code)
  const id = campaign.investigators[0]!.id
  const offers = purchaseOptions(campaign, id).filter((o) => o.code === card.code && !o.replaces)
  expect(offers).toHaveLength(1)
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
})

it('bonded cards are never offered and the Researched diaries need the interpreted dreams', () => {
  let campaign = campaignFor('06112')
  const id = campaign.investigators[0]!.id
  const shop = () => purchaseOptions(campaign, id).map((o) => o.code)
  for (const c of bonded.filter((c) => 'bondedCard' in c)) expect(shop()).not.toContain(c.code)
  campaign = purchase(campaign, id, '06112', {
    remove: campaign.investigators[0]!.deck.find(isStandard)!,
  })
  expect(shop()).not.toContain('06236')
  campaign.log.notes.push('interpretedTheDreams')
  const upgrades = purchaseOptions(campaign, id).filter((o) => o.replaces === '06112')
  expect(upgrades.map((o) => o.code)).toEqual(expect.arrayContaining(['06236', '06237', '06238']))
})
