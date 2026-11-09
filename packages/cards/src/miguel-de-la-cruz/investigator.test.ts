// RR: Additional Actions, Elder Sign, Play Action.
import { availableActions, dispatch, playerCardDef, type Message } from '@lcg/engine'
import { choose, during, labels } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import {
  DECOY_TRAP,
  HIDDEN_SHELTER,
  MIGUEL,
  STALK_PREY,
  makeGame,
  miguel,
  name,
  withMiguel,
} from './testing'

const effectTest = (difficulty: number): Message => ({
  type: 'BeginSkillTest',
  investigator: MIGUEL,
  skill: 'agility',
  difficulty,
  kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
})

it('starts with his printed statistics and signatures', () => {
  const i = miguel(makeGame())
  expect(i.skills).toEqual({ willpower: 3, intellect: 2, combat: 3, agility: 4 })
  expect([i.health, i.sanity]).toEqual([8, 8])
  expect(playerCardDef(MIGUEL)!.signatures).toEqual(['60552', '60553'])
})

it('spends his additional action on the first event he plays', () => {
  let s = withMiguel(makeGame(), { hand: [HIDDEN_SHELTER, STALK_PREY], resources: 10 })
  s = { ...s, pending: null }
  s = dispatch(s, { type: 'PlayerWindow', investigator: MIGUEL })
  expect(miguel(s).actionsRemaining).toBe(3)
  s = choose(s, 'action.play', { card: name(HIDDEN_SHELTER) })
  expect(miguel(s).actionsRemaining).toBe(3)
  expect(miguel(s).traitActionUsed).toBe(true)
  // A second event uses an ordinary action.
  expect(availableActions(s, MIGUEL)).toContainEqual({ kind: 'play', card: STALK_PREY })
})

it('with no ordinary actions left he may still play an event, and nothing else', () => {
  let s = withMiguel(makeGame(), {
    hand: [HIDDEN_SHELTER, '60559'],
    resources: 10,
    actionsRemaining: 0,
  })
  s = dispatch({ ...s, pending: null }, { type: 'PlayerWindow', investigator: MIGUEL })
  expect(availableActions(s, MIGUEL)).toEqual([{ kind: 'play', card: HIDDEN_SHELTER }])
  s = choose(s, 'action.play', { card: name(HIDDEN_SHELTER) })
  expect(availableActions(s, MIGUEL)).toEqual([])
})

it('elder sign: +1 and he may return a Trick or Trap card from his discard pile', () => {
  let s = withMiguel(makeGame(false, ['elderSign']), {
    hand: [],
    discard: [DECOY_TRAP, STALK_PREY, '60557'],
  })
  s = during(s, (x) => x, effectTest(5))
  const offered = s.pending!.question.choices.map((c) => c.params?.card)
  expect(offered).toContain(name(DECOY_TRAP))
  expect(offered).not.toContain(name(STALK_PREY))
  expect(labels(s)).toContain('choice.skip')
  s = choose(s, 'choice.takeCard', { card: name(DECOY_TRAP) })
  expect(miguel(s).hand).toContain(DECOY_TRAP)
  expect(s.log.some((e) => e.key === 'log.testSuccess')).toBe(true)
})
