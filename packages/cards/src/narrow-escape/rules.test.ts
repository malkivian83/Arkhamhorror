// RR: Attacks of Opportunity, Cancel, Lasting Effects, Skill Tests ST.1.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  type GameState,
  type Message,
  type Trigger,
} from '@lcg/engine'
import { choose, ghoul, spawnAt } from '@lcg/engine/testing'
import { game, patch, me } from '../dunwich-pilot/testing'
import './index'
const code = '03267'
const clean = (s: GameState): GameState => ({ ...s, pending: null, queue: [], skillTest: null })
const test: Message = {
  type: 'BeginSkillTest',
  investigator: 'a',
  skill: 'intellect',
  difficulty: 2,
  kind: { type: 'effect', source: 'escape-test', onSuccess: [], onFail: [], onFailEach: [] },
}
const start = () =>
  patch({ hand: [code], resources: 5 })({ ...clean(game(['a', 'b'])), interactive: true })
function attack(opportunity = true, target = 'a') {
  let s = start()
  s = dispatch(s, spawnAt('A', { ...ghoul, code: 'escape-enemy' }, 'a'))
  return dispatch(s, {
    type: 'EnemyAttack',
    enemy: Object.keys(s.enemies)[0]!,
    investigator: target,
    exhaustAfter: false,
    opportunity,
  })
}
const play = (s: GameState) => choose(s, 'ability.playCard', { card: 'Narrow Escape' })
const bonus = (s: GameState) => dispatch(clean(s), test).skillTest!.baseModifier

it('cancels an opportunity attack against its controller and boosts only the next test', () => {
  const s = play(attack())
  expect(me(s)).toMatchObject({ damage: 0, horror: 0, resources: 5, discard: [code] })
  expect(Object.values(s.enemies)[0]!.exhausted).toBe(false)
  expect(bonus(s)).toBe(2)
  const tested = dispatch(clean(s), test)
  expect(me(tested).nextTurnTestBonus).toBeUndefined()
  expect(bonus(tested)).toBe(0)
})

it('does not cancel an ordinary attack or one against another investigator', () => {
  for (const [opportunity, target] of [
    [false, 'a'],
    [true, 'b'],
  ] as const) {
    const s = attack(opportunity, target)
    expect(s.investigators.find((i) => i.id === target)!.damage).toBe(1)
    expect(me(s).hand).toContain(code)
  }
})

it('can be declined without granting the bonus', () => {
  const s = choose(attack(), 'choice.skip')
  expect(me(s).damage).toBe(1)
  expect(bonus(s)).toBe(0)
})

it('cancels the attack caused by investigating before adding the bonus to that investigation', () => {
  let s = start()
  s = dispatch(s, spawnAt('A', { ...ghoul, code: 'escape-investigate' }, 'a'), {
    type: 'PlayerWindow',
    investigator: 'a',
  })
  s = choose(s, 'action.investigate')
  s = play(s)
  expect(s.skillTest).toMatchObject({
    investigator: 'a',
    baseModifier: 2,
    kind: { type: 'investigate' },
  })
  expect(me(s).damage).toBe(0)
  expect(me(s).actionsRemaining).toBe(2)
})

it.each(['a', 'b'])(
  'expires at the next actual turn even if %s takes another turn in the same round',
  (who) => {
    const s = play(attack())
    const next = dispatch(clean(s), { type: 'BeginTurn', investigator: who })
    expect(bonus(next)).toBe(0)
  },
)

it('expires outside the investigation phase or after the active turn ends', () => {
  const s = play(attack())
  expect(bonus({ ...s, activeTurn: null })).toBe(0)
  expect(bonus({ ...s, phase: 'enemy' })).toBe(0)
})

it('stacks multiple bonuses in the same actual turn and survives serialization', () => {
  let s = dispatch(clean(play(attack())), {
    type: 'NextTestBonus',
    investigator: 'a',
    amount: 2,
    thisTurn: true,
  })
  s = JSON.parse(JSON.stringify(s)) as GameState
  expect(bonus(s)).toBe(4)
})

it('does not consume the bonus when a different investigator tests', () => {
  const s = dispatch(clean(play(attack())), { ...test, investigator: 'b' })
  expect(s.skillTest!.baseModifier).toBe(0)
  expect(bonus(s)).toBe(2)
})

it('cannot be played outside its window or after the attack is already cancelled', () => {
  const s = start()
  const t: Trigger = { type: 'whenEnemyAttacks', investigator: 'a', enemy: 'e', opportunity: true }
  expect(playerCardBehavior(code)!.handReactions!({ ...s, canceledAttack: 'e' }, t, 'a')).toEqual(
    [],
  )
  expect(playerCardBehavior(code)!.canPlay!(s, 'a')).toBe(false)
})
