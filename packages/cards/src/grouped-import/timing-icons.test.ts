// RR: Skill Icons, Committing Cards; Plan of Action official FAQ 2.4 (2025).
import {
  attackDamage,
  dispatch,
  playerCardBehavior,
  registerPlayerCard,
  registerPlayerCards,
  skillTestValue,
  type GameState,
} from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { resolve } from '../basic-abilities/testing'
import { patch, me } from '../dunwich-pilot/testing'
import { planTiming } from './card-07024'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
function begin(
  card: string,
  hand: string[] = [],
  skill: 'intellect' | 'willpower' | 'combat' | 'agility' = 'intellect',
) {
  const s = holding(card, { hand, enemy: null, players: ['a', 'b'] })
  return dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty: 1,
    kind: { type: 'effect', source: 'icons-test', onSuccess: [], onFail: [], onFailEach: [] },
  })
}
const commit = (s: GameState, card: string) => choose(s, 'choice.commit', { card })
const complete = (s: GameState, investigator = 'a') => ({
  type: 'CompleteAction' as const,
  investigator,
  phase: s.phase,
  round: s.round,
})
it.each([
  [0, 0, 'early'],
  [1, 1, 'early'],
  [1, 0, 'middle'],
  [2, 1, 'middle'],
  [2, 0, 'middle'],
  [3, 1, 'late'],
  [3, 0, 'late'],
  [4, 1, 'late'],
] as const)(
  'uses timing after %s actions started and %s still resolving',
  (started, pending, expected) => {
    let s = patch({ actionsTaken: started })(begin('07024'))
    s = { ...s, queue: pending ? [...s.queue, complete(s)] : s.queue }
    expect(planTiming(s)).toBe(expected)
    const icons = playerCardBehavior('07024')!.additionalIcons!(s, s.skillTest!, 'a')
    expect(icons).toEqual(
      expected === 'early'
        ? { willpower: 1, agility: 1 }
        : expected === 'late'
          ? { combat: 1, intellect: 1 }
          : {},
    )
  },
)
it.each([0, 1, 2])('resolves Plan of Action during real investigate action %s', (previous) => {
  let s = during(
    holding('07024', { enemy: null }),
    patch({ actionsTaken: previous, deck: ['12088'] }),
  )
  s = choose(s, 'action.investigate')
  s = commit(s, 'Plan of Action')
  expect(skillTestValue(s).icons).toBe(previous === 2 ? 2 : 1)
  s = resolve(s, 0)
  expect(me(s).hand).toEqual(previous === 1 ? ['12088'] : [])
})
it('does not gain icons or draw during mythos, following the revised FAQ', () => {
  let s = begin('07024', [], 'willpower')
  s = patch({ deck: ['12088'] })({ ...s, phase: 'mythos', activeTurn: null })
  s = commit(s, 'Plan of Action')
  expect(skillTestValue(s).icons).toBe(1)
  s = resolve(s, 0)
  expect(me(s).hand).toEqual([])
})
it('uses the actual investigator turn while somebody else acts as if it were their turn', () => {
  let s = patch({ actionsTaken: 3 })(begin('07024'))
  s = patch(
    { actionsTaken: 0 },
    'b',
  )({
    ...s,
    activeTurn: 'b',
    immediateActions: [{ investigator: 'b', activeTurn: 'a', ownTurn: false, actionsRemaining: 3 }],
  })
  expect(planTiming(s)).toBe('late')
  s = { ...s, immediateActions: [{ ...s.immediateActions![0]!, endedTurn: true }] }
  expect(planTiming(s)).toBeNull()
})
registerPlayerCards([
  {
    code: 'icons-mixed',
    name: 'Mixed icons',
    type: 'asset',
    class: 'seeker',
    traits: [],
    icons: { intellect: 1, wild: 1, combat: 99 },
  },
])
registerPlayerCard({
  code: 'icons-mixed',
  additionalIcons: (s) => ({ intellect: Math.floor(me(s).resources / 5) }),
})
it.each([true, false])(
  'doubles printed and dynamic matching icons when committed before other cards: %s',
  (first) => {
    let s = begin('09031', ['icons-mixed'])
    if (first) s = commit(s, 'Helping Hand')
    s = commit(s, 'Mixed icons')
    if (!first) s = commit(s, 'Helping Hand')
    expect(skillTestValue(s).icons).toBe(8)
    expect(skillTestValue(patch({ resources: 0 })(s)).icons).toBe(4)
  },
)
it('commits Helping Hand without icons, contributes no icons itself and blocks a second copy', () => {
  let s = begin('09031', ['09031'])
  s = commit(s, 'Helping Hand')
  expect(skillTestValue(s).icons).toBe(0)
  expect(s.pending!.question.choices.filter((c) => c.label === 'choice.commit')).toEqual([])
})
it('removing Helping Hand immediately removes its multiplier', () => {
  let s = commit(commit(begin('09031', ['icons-mixed']), 'Mixed icons'), 'Helping Hand')
  s = {
    ...s,
    skillTest: {
      ...s.skillTest!,
      committed: s.skillTest!.committed.filter((c) => c.code !== '09031'),
    },
  }
  expect(skillTestValue(s).icons).toBe(4)
})
it('doubles icons without doubling a committed skill damage effect', () => {
  let s = begin('09031', ['12025'], 'combat')
  s = commit(commit(s, 'Vicious Blow'), 'Helping Hand')
  s = {
    ...s,
    skillTest: { ...s.skillTest!, kind: { type: 'fight', enemy: 'test' }, succeeded: true },
  }
  expect(attackDamage(s, s.skillTest!)).toBe(2)
})
