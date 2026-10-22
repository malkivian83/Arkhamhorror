import { isPermanent, playerCardDef, type GameState } from '@lcg/engine'
import { choose, during, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { COLLECTOR } from './brethren-of-ash/queen-of-ash'
import { finishScenario, newCampaign, purchase, startScenario } from './campaign'
import { code, STARTER_DECKS } from './core-2026/player-cards'
import { cardPool, isStandard, starterDeckList, validateDeck } from './decks'

const baseDeck = () => starterDeckList('daniela', 'validation', 'Daniela')
const replace = (cards: string[], card: string) => {
  const next = [...cards]
  next.splice(next.findIndex(isStandard), 1, card)
  return next
}

// RR: "Deck Customization"; campaign guide: "Earning and Spending Experience".
describe('campaign deck validation', () => {
  it.each([
    ['empty deck', () => [], 'deck.problem.size'],
    ['wrong size', () => baseDeck().cards.filter((c) => c !== code(20)), 'deck.problem.size'],
    [
      'missing signature',
      () => baseDeck().cards.filter((c) => c !== code(2)),
      'deck.problem.missingSignature',
    ],
    ['foreign signature', () => [...baseDeck().cards, code(5)], 'deck.problem.otherSignature'],
    ['wrong class', () => replace(baseDeck().cards, code(39)), 'deck.problem.notAllowed'],
    [
      'too many copies',
      () => [...baseDeck().cards, code(20), code(20)],
      'deck.problem.tooManyCopies',
    ],
    [
      'experience at creation',
      () => replace(baseDeck().cards, code(27)),
      'deck.problem.levelAtStart',
    ],
  ])('rejects %s without relying on the setup screen', (_name, cards, problem) => {
    const deck = { ...baseDeck(), cards: cards() }
    expect(validateDeck(deck).problems.map((p) => p.key)).toContain(problem)
    expect(() => newCampaign('brethren-of-ash', [deck], 'standard')).toThrow()
  })

  it.each(Object.keys(STARTER_DECKS))('accepts the starter and custom %s deck', (key) => {
    const deck = starterDeckList(key, key, key)
    for (const member of [key, deck]) {
      expect(() =>
        startScenario(newCampaign('brethren-of-ash', [member], 'standard'), 1),
      ).not.toThrow()
    }
  })

  it('rejects a damaged saved deck when starting the next scenario', () => {
    const campaign = newCampaign('brethren-of-ash', ['daniela'], 'standard')
    campaign.investigators[0]!.deck = []
    expect(() => startScenario(campaign, 1)).toThrow()
  })

  it('accepts upgrades paid for before the first scenario', () => {
    const campaign = newCampaign('brethren-of-ash', ['daniela'], 'standard', 1, ['ancients'])
    const upgraded = purchase(campaign, code(1), code(27), { upgrade: true })
    expect(() => startScenario(upgraded, 1)).not.toThrow()
  })

  it('preserves Morrigan and the random basic weakness for a valid custom deck', () => {
    const deck = baseDeck()
    deck.cards = deck.cards.filter((c) => playerCardDef(c)?.weakness !== 'basicweakness')
    const normal = newCampaign('brethren-of-ash', [deck], 'standard', 7)
    expect(
      normal.investigators[0]!.deck.filter((c) => playerCardDef(c)?.weakness === 'basicweakness'),
    ).toHaveLength(1)
    const boon = newCampaign('brethren-of-ash', [deck], 'standard', 7, ['morrigan'])
    expect(boon.weaknessChoices?.[deck.investigator]).toHaveLength(3)
    expect(() => startScenario(boon, 1)).not.toThrow()
  })

  it('requires earned rewards and preserves them for later scenario setup', () => {
    const deck = baseDeck()
    const extra = cardPool(deck.investigator)
      .filter((c) => !c.xp && !isPermanent(c.code) && !deck.cards.includes(c.code))
      .slice(0, 5)
    deck.cards.push(COLLECTOR, ...extra.map((c) => c.code))
    expect(validateDeck(deck, true, [COLLECTOR]).problems).toEqual([])
    expect(() => newCampaign('brethren-of-ash', [deck], 'standard')).toThrow()
    const campaign = newCampaign('brethren-of-ash', [deck], 'standard', 1, [], [COLLECTOR])
    expect(campaign.log.rewards).toContain(COLLECTOR)
    expect(() => startScenario(campaign, 1)).not.toThrow()
    // Older saves did not copy rewards from previous campaigns into this log.
    delete campaign.log.rewards
    expect(() => startScenario(campaign, 1)).not.toThrow()
  })
})

const completed = (members: string[] = ['daniela']) => {
  const campaign = newCampaign('brethren-of-ash', members, 'standard')
  let initial = throughSetup(startScenario(campaign, 1))
  if (initial.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    initial = choose(initial, 'choice.investigator')
  const game = choose(
    during(initial, (s) => s, {
      type: 'EndScenario',
      outcome: { type: 'noResolution' },
    }),
    'choice.continue',
  )
  return { campaign, game }
}

// Campaign guide: scenario resolutions and persistence of investigator records.
describe('campaign result ownership', () => {
  it('rejects the result of a different team in the same scenario and difficulty', () => {
    const campaign = newCampaign('brethren-of-ash', ['daniela'], 'standard')
    expect(() => finishScenario(campaign, completed(['joe']).game)).toThrow()
  })

  it.each([
    ['missing member', (g: GameState) => ({ ...g, investigators: g.investigators.slice(1) })],
    [
      'duplicate member',
      (g: GameState) => ({ ...g, investigators: [g.investigators[0]!, g.investigators[0]!] }),
    ],
    [
      'missing record',
      (g: GameState) => ({ ...g, campaignLog: { ...g.campaignLog!, investigators: {} } }),
    ],
  ])('rejects a result with a %s', (_name, change) => {
    const { campaign, game } = completed(['daniela', 'joe'])
    expect(() => finishScenario(campaign, change(game))).toThrow()
  })

  it('accepts a changed player order and investigators eliminated during the scenario', () => {
    const { campaign, game } = completed(['daniela', 'joe'])
    const ended = {
      ...game,
      investigators: game.investigators.toReversed().map((i) => ({ ...i, defeated: true })),
    }
    ended.campaignLog!.investigators[code(1)]!.killed = true
    expect(finishScenario(campaign, ended).scenarioIndex).toBe(1)
  })

  it('keeps records of investigators who were already dead before the scenario', () => {
    const campaign = newCampaign('brethren-of-ash', ['daniela', 'joe'], 'standard')
    campaign.log.investigators[code(1)]!.killed = true
    const game = choose(
      during(throughSetup(startScenario(campaign, 1)), (s) => s, {
        type: 'EndScenario',
        outcome: { type: 'noResolution' },
      }),
      'choice.continue',
    )
    expect(game.investigators.map((i) => i.id)).toEqual([code(4)])
    expect(finishScenario(campaign, game).log.investigators[code(1)]!.killed).toBe(true)
  })
})
