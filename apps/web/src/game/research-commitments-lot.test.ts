// Lot 151 (RR Actions, Activate, Costs): the cards can be bought and registered; reviewed
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
import bonded from '../../../../packages/cards/src/data/research-commitments.json'
import bondedEn from '../../../../packages/cards/src/research-commitments/source-en.json'
import bondedEs from '../../../../packages/cards/src/research-commitments/source-es.json'

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

it('preserves pending Research choices and the new commitment permissions in real saved sessions', () => {
  let s = throughSetup(
    startScenario(newCampaign('night-of-the-zealot', ['tommy', 'harvey'], 'standard'), 3, true),
  )
  const by = s.investigators[0]!.id,
    owner = s.investigators[1]!.id
  s = {
    ...s,
    pending: null,
    queue: [],
    interactive: true,
    investigators: s.investigators.map((i) => ({ ...i, hand: [], deck: ['06023', '01090'] })),
  }
  const saved = (state: GameState) =>
    decodeSession(
      JSON.stringify(session(state, { base: state, inputs: [], marks: [markOf(state)] }, null)),
    ).state!
  const searched = dispatch(s, {
    type: 'SearchDeck',
    investigator: by,
    top: 2,
    traits: [],
    anyCard: true,
    to: 'hand',
  })
  expect(saved(searched)).toEqual(searched)
  s = dispatch(
    { ...s, phase: 'investigation' },
    {
      type: 'BeginSkillTest',
      investigator: by,
      skill: 'intellect',
      difficulty: 2,
      kind: { type: 'effect', source: 'Research test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  s = {
    ...s,
    pending: null,
    queue: [],
    investigators: s.investigators.map((i) => (i.id === owner ? { ...i, discard: ['01090'] } : i)),
  }
  s = dispatch(
    s,
    {
      type: 'CommitCard',
      investigator: by,
      code: '01090',
      from: 'discard',
      fromInvestigator: owner,
      byEffect: true,
      toDeckBottom: true,
      wildIcons: true,
    },
    { type: 'CommitWindow' },
  )
  expect(saved(s)).toEqual(s)
  expect(saved(s).skillTest!.committed).toContainEqual({
    code: '01090',
    by,
    owner,
    toDeckBottom: true,
    wildIcons: true,
  })
})
