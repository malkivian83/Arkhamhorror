// Lot 152 (RR Actions, Activate, Costs): the cards can be bought and registered; reviewed
// rules are enabled; every card keeps its official EN/ES presentation and scans.
import { expect, it } from 'vitest'
import { allPlayerCardDefs, playerCardBehavior } from '@lcg/engine'
import { throughSetup } from '@lcg/engine/testing'
import { decodeSession, session } from './session'
import { markOf } from './undo'
import {
  cardPool,
  investigatorCards,
  newCampaign,
  purchaseOptions,
  startScenario,
} from '@lcg/cards'
import { fallbackCards } from './fallbackCards'
import { cardImages } from './cards'
import bonded from '../../../../packages/cards/src/data/campaign-planning.json'
import bondedEn from '../../../../packages/cards/src/campaign-planning/source-en.json'
import bondedEs from '../../../../packages/cards/src/campaign-planning/source-es.json'

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

it.each(bonded)(
  '$code is offered through deckbuilding, with creation-only purchase restrictions',
  (card) => {
    const buyer = investigatorCards().find((i) =>
      cardPool(i.code).some((c) => c.code === card.code),
    )!
    expect(buyer).toBeTruthy()
    const c = newCampaign('night-of-the-zealot', ['mateo'], 'standard')
    const options = purchaseOptions(c, c.investigators[0]!.id)
    if (playerCardBehavior(card.code)?.purchaseAtCreation)
      expect(options.some((o) => o.code === card.code)).toBe(false)
  },
)
it('persists period counters and declared flexible slots, rejecting malformed saved counters', () => {
  const c = newCampaign('night-of-the-zealot', ['mateo'], 'standard')
  c.investigators[0]!.planning = {
    arcane: 2,
    rabbit: true,
    upgrades: 1,
    swaps: 1,
    pelt: 2,
    peltUsed: true,
    customized: ['09119'],
  }
  const s = throughSetup(startScenario(c, 3))
  const by = s.investigators[0]!.id
  s.assets.reliquary = {
    id: 'reliquary',
    code: '10132',
    owner: by,
    uses: 0,
    damage: 0,
    horror: 0,
    exhausted: false,
    flexibleSlot: 'arcane',
  }
  const encoded = JSON.stringify(session(s, { base: s, inputs: [], marks: [markOf(s)] }, c))
  const restored = decodeSession(encoded)
  expect(restored.campaign!.investigators[0]!.planning).toEqual(c.investigators[0]!.planning)
  expect(restored.state!.assets.reliquary!.flexibleSlot).toBe('arcane')
  const invalid = JSON.parse(encoded)
  invalid.campaign.investigators[0].planning.swaps = -1
  expect(() => decodeSession(JSON.stringify(invalid))).toThrow()
})
