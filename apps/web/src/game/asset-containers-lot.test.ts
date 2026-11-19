// Lot 152 (RR Actions, Activate, Costs): the cards can be bought and registered; reviewed
// rules are enabled; every card keeps its official EN/ES presentation and scans.
import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardBehavior, dispatch, type GameState } from '@lcg/engine'
import { throughSetup } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'
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
import bonded from '../../../../packages/cards/src/data/asset-containers.json'
import bondedEn from '../../../../packages/cards/src/asset-containers/source-en.json'
import bondedEs from '../../../../packages/cards/src/asset-containers/source-es.json'

const campaignFor = (code: string) => {
  const buyer = investigatorCards().find((i) => cardPool(i.code).some((c) => c.code === code))!
  const cards = [
    ...(buyer.signatures ?? []),
    ...cardPool(buyer.code)
      .filter(
        (c) =>
          c.xp === 0 &&
          c.name !== bonded.find((c) => c.code === code)?.name &&
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
  '$code can be bought and starts with its reviewed definition',
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
    expect(i.outOfPlay ?? []).toEqual([])
  },
)

it('round-trips stored physical cards and face-up parents, rejecting ownership errors and cycles', () => {
  const campaign = newCampaign('night-of-the-zealot', ['tommy', 'harvey'], 'standard')
  let s = throughSetup(startScenario(campaign, 3, true))
  const by = s.investigators[0]!.id
  const tool = allPlayerCardDefs().find((c) => c.type === 'asset' && c.traits.includes('Tool'))!
  const asset = (id: string, code: string) => ({
    id,
    code,
    owner: by,
    uses: 0,
    damage: 0,
    horror: 0,
    exhausted: false,
  })
  s = {
    ...s,
    assets: {
      ...s.assets,
      atlas: { ...asset('atlas', '08067'), storedCards: [{ code: '01090', owner: by }] },
      belt: asset('belt', '09120'),
      child: { ...asset('child', tool.code), attachedTo: 'belt', uses: tool.uses?.count ?? 0 },
    },
  }
  const encoded = (state: GameState) =>
    JSON.stringify(session(state, { base: state, inputs: [], marks: [markOf(state)] }, null))
  const restored = decodeSession(encoded(s)).state!
  expect(restored).toEqual(s)
  const retrieved = dispatch(
    { ...restored, pending: null, queue: [] },
    { type: 'TakeStoredCard', asset: 'atlas', index: 0, investigator: by },
  )
  expect(retrieved.investigators[0]!.hand).toContain('01090')
  expect(retrieved.assets.atlas!.storedCards).toEqual([])
  expect(() =>
    decodeSession(
      encoded({ ...s, assets: { ...s.assets, belt: { ...s.assets.belt!, attachedTo: 'child' } } }),
    ),
  ).toThrow()
  expect(() =>
    decodeSession(
      encoded({
        ...s,
        assets: {
          ...s.assets,
          atlas: { ...s.assets.atlas!, storedCards: [{ code: '01090', owner: 'missing' }] },
        },
      }),
    ),
  ).toThrow()
})
