// Lot 146 (RR Bonded): summoners are bought and bring their bonded cards set aside; bonded
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
import bonded from '../../../../packages/cards/src/data/chaos-allies.json'
import bondedEn from '../../../../packages/cards/src/chaos-allies/source-en.json'
import bondedEs from '../../../../packages/cards/src/chaos-allies/source-es.json'

// FAQ v2.0 erratum: the summoner sets its bonded copies aside instead of removing them.
const errata = (code: string, text: string) =>
  code === '06030'
    ? text.replace('y retíralos de la partida.', 'y ponlos aparte, fuera del juego.')
    : ['07191', '07192'].includes(code)
      ? text.replace(/^[^\n]+\n/, 'Investigado.\n')
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
  campaign.log.notes.push('translatedGrimoire')
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

it.each(bonded.filter((c) => !('bondedCard' in c)))(
  '$code can be bought once and prepares its own bonded set',
  (card) => {
    let campaign = campaignFor(card.code)
    const id = campaign.investigators[0]!.id
    const researched = ['07191', '07192'].includes(card.code)
    if (researched) {
      campaign.investigators[0]!.deck[campaign.investigators[0]!.deck.findIndex(isStandard)] =
        '07022'
      expect(purchaseOptions(campaign, id).some((o) => o.code === card.code && !o.replaces)).toBe(
        false,
      )
    }
    const offers = purchaseOptions(campaign, id).filter(
      (o) => o.code === card.code && (researched ? o.replaces === '07022' : !o.replaces),
    )
    expect(offers).toHaveLength(1)
    campaign = purchase(campaign, id, card.code, {
      ...(researched
        ? { upgrade: true, replaces: '07022' }
        : { remove: campaign.investigators[0]!.deck.find(isStandard)! }),
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

it('bonded cards cannot be bought, researched Grimoires need the note, and Mind’s Eye retains Myriad', () => {
  const campaign = campaignFor('07191'),
    id = campaign.investigators[0]!.id
  for (const card of bonded.filter((c) => 'bondedCard' in c))
    expect(purchaseOptions(campaign, id).some((o) => o.code === card.code)).toBe(false)
  campaign.log.notes = []
  expect(purchaseOptions(campaign, id).some((o) => ['07191', '07192'].includes(o.code))).toBe(false)
  const eye = allPlayerCardDefs().find((c) => c.code === '06328')!
  expect(eye).toMatchObject({ myriad: true, deckLimit: 3, xp: 2 })
})
