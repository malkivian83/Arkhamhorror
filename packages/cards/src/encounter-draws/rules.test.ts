// RR: Drawing Encounter Cards (1.4), Revelation, Cancel, Peril, Fast.
import { expect, it } from 'vitest'
import {
  applyInput,
  createGame,
  dispatch,
  getInvestigator,
  registerTreachery,
  skillTestValue,
  type EncounterCard,
  type GameState,
} from '@lcg/engine'
import { choose, ghoul, testInvestigator, testScenario, throughSetup } from '@lcg/engine/testing'
import { withAsset } from '../dunwich-pilot/testing'
import './index'

const enemy = { ...ghoul, code: 'draw-window-enemy', name: 'Draw window enemy' }
const peril: EncounterCard = {
  code: 'draw-window-peril',
  name: 'Peril test card',
  kind: 'treachery',
  keywords: ['peril'],
}
const trial: EncounterCard = { ...peril, code: 'draw-window-trial', keywords: [] }
registerTreachery({
  code: trial.code,
  revelation: (_s, investigator) => [
    {
      type: 'BeginSkillTest',
      investigator,
      skill: 'willpower',
      difficulty: 3,
      kind: { type: 'effect', source: trial.code, onSuccess: [], onFail: [], onFailEach: [] },
    },
  ],
})

function game(hand: string[], deck: EncounterCard[], otherHand: string[] = []): GameState {
  const game = throughSetup(
    createGame({
      seed: 6,
      scenario: testScenario(),
      investigators: [testInvestigator('a'), testInvestigator('b')],
      interactive: true,
    }),
  )
  return {
    ...game,
    pending: null,
    queue: [],
    encounterDeck: deck,
    encounterDiscard: [],
    investigators: game.investigators.map((i) => ({
      ...i,
      resources: 5,
      clues: 1,
      hand: i.id === 'a' ? hand : otherHand,
    })),
  }
}
const draw = (s: GameState) => dispatch(s, { type: 'DrawEncounterCard', investigator: 'a' })
const play = (s: GameState, code: string) => {
  const choice = s.pending?.question.choices.find(
    (c) => c.target?.type === 'hand' && c.target.code === code,
  )
  expect(choice).toBeDefined()
  return choose(s, choice!.label, choice!.params)
}

it('Ward of Protection (5) discards an enemy without spawning it or resolving surge', () => {
  const card = { ...enemy, keywords: ['surge' as const] }
  const initial = game(['02307'], [card, peril])
  const prompted = draw(initial)
  expect(prompted.log.at(-1)).toMatchObject({ key: 'log.encounter', params: { code: card.code } })
  const s = play(prompted, '02307')
  expect(Object.keys(s.enemies)).toHaveLength(0)
  expect(s.encounterDiscard).toEqual([card])
  expect(s.encounterDeck).toEqual([peril])
  expect(getInvestigator(s, 'a')).toMatchObject({
    horror: 1,
    discard: ['02307'],
    drewEnemyRound: s.round,
  })
})

// FAQ v2.5: an encounter card on the back of an agenda is resolved without a draw.
it('Ward of Protection (5) cannot cancel an enemy on the back of an agenda', () => {
  const initial = game(['02307'], [])
  const s = dispatch(initial, {
    type: 'ResolveEncounterCard',
    investigator: 'a',
    card: enemy,
    withoutDraw: true,
  })
  expect(s.pending).toBeNull()
  expect(getInvestigator(s, 'a').hand).toEqual(['02307'])
  expect(Object.values(s.enemies)).toMatchObject([{ code: enemy.code }])
})

it('Let me handle this gives the new drawer +2 during the revelation test only', () => {
  const initial = game([], [trial], ['03022'])
  let s = draw(initial)
  expect(s.pending?.investigator).toBe('b')
  s = play(s, '03022')
  expect(s.skillTest?.investigator).toBe('b')
  expect(skillTestValue(s).total).toBe(getInvestigator(initial, 'b').skills.willpower + 2)
  expect(s.playSkillBonuses).toHaveLength(1)
  expect(getInvestigator(s, 'a').hand).toEqual([])
  while (s.pending) s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  expect(s.playSkillBonuses).toEqual([])
})

it('You handle this one makes another investigator draw the enemy and grants a resource', () => {
  let s = play(draw(game(['04028'], [enemy])), '04028')
  s = choose(s, 'choice.investigator', { name: getInvestigator(s, 'b').name })
  expect(Object.values(s.enemies)).toMatchObject([{ code: enemy.code, engagedWith: 'b' }])
  expect(getInvestigator(s, 'a')).toMatchObject({ resources: 6, discard: ['04028'] })
})

it('the two transfer events do not interfere with Peril', () => {
  const s = draw(game(['04028'], [peril], ['03022']))
  expect(s.pending).toBeNull()
  expect(s.encounterDiscard).toEqual([peril])
  expect(getInvestigator(s, 'a').hand).toEqual(['04028'])
  expect(getInvestigator(s, 'b').hand).toEqual(['03022'])
})

it('Maleson pays his two costs and redraws after shuffling, even if the same card returns', () => {
  const initial = withAsset(game([], [enemy]), '02302')
  let s = draw(initial)
  expect(s.enemies).toEqual({})
  s = choose(s, 'ability.malesonRedraw')
  expect(Object.values(s.enemies)).toMatchObject([{ code: enemy.code, engagedWith: 'a' }])
  expect(s.assets['02302']?.exhausted).toBe(true)
  expect(getInvestigator(s, 'a').clues).toBe(0)
  expect(s.locations.A?.clues).toBe(initial.locations.A!.clues + 1)
  expect(s.encounterDiscard).toEqual([])
})

it('Maleson cannot replace a card drawn from the encounter discard pile', () => {
  const initial = withAsset(game([], []), '02302')
  const s = dispatch(
    { ...initial, encounterDiscard: [enemy] },
    { type: 'DrawFromEncounterDiscard', investigator: 'a', code: enemy.code },
  )
  expect(s.pending).toBeNull()
  expect(s.assets['02302']?.exhausted).toBe(false)
  expect(Object.values(s.enemies)).toMatchObject([{ code: enemy.code }])
})

it('Nine of Rods enters from the opening hand and redraws without paying a clue', () => {
  let s = dispatch(game(['54009'], [enemy]), { type: 'GameBegins' })
  s = choose(s, 'choice.windowPut')
  const asset = Object.values(s.assets)[0]!
  expect(asset.code).toBe('54009')
  expect(getInvestigator(s, 'a').resources).toBe(5)
  s = choose(draw(s), 'ability.nineOfRodsRedraw')
  expect(s.assets[asset.id]?.exhausted).toBe(true)
  expect(getInvestigator(s, 'a').clues).toBe(1)
  expect(Object.values(s.enemies)).toMatchObject([{ code: enemy.code }])
})
