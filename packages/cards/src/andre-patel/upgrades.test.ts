// RR: Exceptional, Starting, Uses, Parley, Additional Actions, Defeat, Skill Test (ST.3).
import { createGame, dispatch, effectiveVitals, type GameState } from '@lcg/engine'
import { choose, ghoul, labels, spawnAt, testScenario } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, purchaseOptions } from '../campaign'
import { investigatorSetup, starterDeck } from '../core-2026/player-cards'
import { starterDeckList, validateDeck } from '../decks'
import {
  ANDRE,
  andre,
  clear,
  CONTINGENCY,
  effectTest,
  makeGame,
  MARCUS_SENGSTACKE_2,
  RIGHT_UNDER_THEIR_NOSES_3,
  SILVER_TONGUE_3,
  THE_BLACK_FAN,
  THE_GRAPEVINE_2,
  THE_RED_CLOCK,
  WELL_CONNECTED_3,
  withAndre,
} from './testing'

const ready = (bag: GameState['chaosBag'] = [0]) =>
  withAndre(clear(makeGame(false, bag)), { hand: [], resources: 10 })
const put = (s: GameState, code: string) =>
  dispatch(s, { type: 'PutAssetIntoPlay', investigator: ANDRE, code })
const asset = (s: GameState, code: string) => Object.values(s.assets).find((a) => a.code === code)
const through = (s: GameState, label = 'choice.skip') => {
  while (s.pending && s.pending.question.prompt !== 'prompt.chooseAction')
    s = choose(s, labels(s).includes(label) ? label : labels(s).at(-1)!)
  return s
}

describe('The Grapevine (2)', () => {
  it('reaches enemies up to 3 connections away, engages and draws 1 card', () => {
    let s = put(ready(), THE_GRAPEVINE_2)
    const D = { ...s.locations.C!, id: 'D', name: 'Room D', connections: ['C'], revealed: true }
    s = {
      ...s,
      locations: {
        ...Object.fromEntries(
          Object.entries(s.locations).map(([id, l]) => [
            id,
            { ...l, revealed: true, ...(id === 'C' ? { connections: ['B', 'D'] } : {}) },
          ]),
        ),
        D,
      },
    }
    s = dispatch(s, spawnAt('D', { ...ghoul, keywords: ['aloof'] }))
    const hand = andre(s).hand.length
    s = choose(dispatch(s, { type: 'PlayerWindow', investigator: ANDRE }), 'ability.grapevineDraw')
    expect(andre(s).location).toBe('D')
    expect(Object.values(s.enemies)[0]!.engagedWith).toBe(ANDRE)
    expect(andre(s).hand.length).toBe(hand + 1)
  })
})

describe('Marcus Sengstacke (2)', () => {
  it('gives the additional upkeep resource and takes 1 horror when you fail', () => {
    let s = put(ready(), MARCUS_SENGSTACKE_2)
    s = dispatch(s, effectTest(9))
    expect(asset(s, MARCUS_SENGSTACKE_2)!.horror).toBe(1)
    const resources = andre(s).resources
    s = dispatch(s, { type: 'UpkeepPhase' })
    expect(andre(clear(s)).resources).toBe(resources + 2)
  })
})

describe('The Black Fan', () => {
  it('10+ resources: +1 health and sanity; losing them can defeat him', () => {
    let s = put(ready(), THE_BLACK_FAN)
    expect(effectiveVitals(s, andre(s))).toEqual({ health: 8, sanity: 9 })
    s = withAndre(s, { damage: 7 })
    s = dispatch(s, { type: 'SpendResources', investigator: ANDRE, amount: 1 })
    expect(andre(s).eliminated).toBe(true)
  })

  it('15+ resources: one additional action, once per turn; 20+: +1 to each skill', () => {
    let s = withAndre(put(ready(), THE_BLACK_FAN), { resources: 15 })
    s = dispatch(s, { type: 'BeginTurn', investigator: ANDRE })
    expect(andre(s).actionsRemaining).toBe(4)
    // Por debajo de 15 la pierde; al recuperarlos vuelve, pero no otra vez entera.
    s = dispatch(clear(s), { type: 'SpendResources', investigator: ANDRE, amount: 1 })
    expect(andre(s).actionsRemaining).toBe(3)
    s = dispatch(s, { type: 'GainResources', investigator: ANDRE, amount: 1 })
    expect(andre(s).actionsRemaining).toBe(4)
    s = withAndre(s, { resources: 20, hand: [] })
    // Agilidad 5 + 1 contra 6.
    s = dispatch(s, effectTest(6))
    expect(s.log.findLast((e) => e.key.startsWith('log.test'))?.key).toBe('log.testSuccess')
  })
})

describe('Silver Tongue (3)', () => {
  it('Starting: after the mulligan it may be added to the opening hand', () => {
    let s = createGame({
      seed: 4,
      scenario: testScenario(),
      investigators: [investigatorSetup(ANDRE, [...starterDeck('andre'), SILVER_TONGUE_3])],
    })
    while (s.pending && s.pending.question.prompt !== 'prompt.startingCard')
      s = choose(s, labels(s)[0]!)
    s = choose(s, 'choice.card', { card: 'Silver Tongue' })
    expect(andre(s).hand).toContain(SILVER_TONGUE_3)
    expect(andre(s).hand).toHaveLength(6)
  })

  it('+2 agility for an evasion, +1 otherwise', () => {
    let s = put(ready(), SILVER_TONGUE_3)
    s = dispatch(s, spawnAt('A', { ...ghoul, evade: 7 }, ANDRE))
    const enemy = Object.keys(s.enemies)[0]!
    s = dispatch(s, {
      type: 'BeginSkillTest',
      investigator: ANDRE,
      skill: 'agility',
      difficulty: 7,
      kind: { type: 'evade', enemy },
    })
    expect(
      s.pending!.question.choices.find((c) => c.label === 'ability.pump')!.params,
    ).toMatchObject({ amount: 2 })
    s = through(choose(s, 'ability.pump'), 'choice.revealToken')
    expect(Object.values(s.enemies)[0]!.exhausted).toBe(true)
  })
})

describe('Well Connected (3)', () => {
  it('+1 per 4 resources; spend 2 resources to ready it once per round', () => {
    let s = withAndre(put(ready(), WELL_CONNECTED_3), { resources: 9 })
    s = dispatch(s, effectTest(7))
    s = choose(s, 'ability.exhaustForBonus', { amount: 2 })
    expect(labels(s)).toContain('ability.wellConnectedReady')
    s = choose(s, 'ability.wellConnectedReady')
    expect(asset(s, WELL_CONNECTED_3)!.exhausted).toBe(false)
    expect(andre(s).resources).toBe(7)
    // Una vez por ronda.
    s = choose(s, 'ability.exhaustForBonus', { amount: 1 })
    expect(labels(s)).not.toContain('ability.wellConnectedReady')
  })
})

describe('Right Under Their Noses (3)', () => {
  it('after succeeding by 2: a clue here and, as well, one at a connecting location', () => {
    let s = dispatch(ready(), spawnAt('A', { ...ghoul, evade: 3 }, ANDRE))
    s = withAndre(s, { hand: [RIGHT_UNDER_THEIR_NOSES_3] })
    s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, revealed: true, clues: 1 } } }
    const enemy = Object.keys(s.enemies)[0]!
    s = dispatch(s, {
      type: 'BeginSkillTest',
      investigator: ANDRE,
      skill: 'agility',
      difficulty: 3,
      kind: { type: 'evade', enemy },
    })
    s = choose(s, 'choice.revealToken') // sin comprometerla (tiene un comodín)
    s = choose(s, 'choice.skip') // reacción de André
    s = choose(s, 'ability.playCard', { card: 'Right Under Their Noses' })
    s = choose(s, 'choice.discoverAt', { location: 'Room B' })
    expect(andre(s).clues).toBe(2)
  })
})

describe('Contingency', () => {
  const fight = (bag: GameState['chaosBag']) => {
    let s = withAndre(ready(bag), { hand: [CONTINGENCY], resources: 7 })
    s = dispatch(s, spawnAt('A', { ...ghoul, health: 9, fight: 3 }, ANDRE))
    const enemy = Object.keys(s.enemies)[0]!
    s = dispatch(s, {
      type: 'BeginSkillTest',
      investigator: ANDRE,
      skill: 'combat',
      difficulty: 3,
      kind: { type: 'fight', enemy },
    })
    return choose(s, 'choice.commit')
  }

  it('after revealing, 3 resources cancel the token and reveal another, any number of times', () => {
    let s = fight([-8])
    expect(labels(s)).toContain('ability.contingency')
    s = choose(s, 'ability.contingency')
    expect(andre(s).resources).toBe(4)
    expect(labels(s)).toContain('ability.contingency')
    s = choose(s, 'ability.contingency')
    expect(andre(s).resources).toBe(1)
    // Sin 3 recursos ya no se ofrece.
    expect(labels(s)).not.toContain('ability.contingency')
    expect(s.log.filter((e) => e.key === 'log.tokenCanceled')).toHaveLength(2)
  })

  it('does nothing in a test that does not target an enemy', () => {
    let s = withAndre(ready([-8]), { hand: [CONTINGENCY], resources: 7 })
    s = choose(dispatch(s, effectTest(3)), 'choice.commit')
    expect(labels(s)).not.toContain('ability.contingency')
  })
})

describe('The Red Clock', () => {
  const turn = (s: GameState) => dispatch(clear(s), { type: 'BeginTurn', investigator: ANDRE })

  it('1 charge: +4 for the next test; 2: move up to 3 times; 3: 2 additional actions', () => {
    let s = put(ready(), THE_RED_CLOCK)
    s = turn(s)
    expect(asset(s, THE_RED_CLOCK)!.uses).toBe(1)
    expect(andre(s).nextTestBonus).toBe(4)
    s = dispatch(withAndre(clear(s), { hand: [] }), effectTest(9))
    expect(s.log.findLast((e) => e.key.startsWith('log.test'))?.key).toBe('log.testSuccess')
    expect(andre(s).nextTestBonus).toBeUndefined()
    s = turn(s)
    s = choose(s, 'choice.skip') // conserva las cargas
    expect(s.pending!.question.prompt).toBe('prompt.chooseMove')
    s = choose(s, 'action.move', { location: 'Room B' })
    s = choose(s, 'action.move', { location: 'Room C' })
    expect(andre(s).location).toBe('C')
    s = turn(through(s))
    s = choose(s, 'choice.skip')
    expect(asset(s, THE_RED_CLOCK)!.uses).toBe(3)
    expect(andre(s).actionsRemaining).toBe(5)
  })

  it('taking its charges as resources starts again from 1', () => {
    let s = put(ready(), THE_RED_CLOCK)
    s = {
      ...s,
      assets: {
        ...s.assets,
        [asset(s, THE_RED_CLOCK)!.id]: { ...asset(s, THE_RED_CLOCK)!, uses: 2 },
      },
    }
    const resources = andre(s).resources
    s = choose(turn(s), 'choice.redClockTake', { n: 2 })
    expect(andre(s).resources).toBe(resources + 2)
    expect(asset(s, THE_RED_CLOCK)!.uses).toBe(1)
  })
})

describe('Exceptional', () => {
  it('The Black Fan and The Red Clock cost twice their level; one copy per deck', () => {
    const c = newCampaign('night-of-the-zealot', ['andre'], 'standard')
    c.log.investigators[ANDRE]!.xp = 10
    const cost = (code: string) => purchaseOptions(c, ANDRE).find((o) => o.code === code)?.cost
    expect([cost(THE_BLACK_FAN), cost(THE_RED_CLOCK)]).toEqual([6, 10])
    const deck = starterDeckList('andre', 'andre', 'André')
    const cards = [...deck.cards]
    cards.splice(cards.indexOf('60357'), 2, THE_BLACK_FAN, THE_BLACK_FAN)
    expect(validateDeck({ ...deck, cards }, false).problems.map((p) => p.key)).toContain(
      'deck.problem.tooManyCopies',
    )
  })
})
