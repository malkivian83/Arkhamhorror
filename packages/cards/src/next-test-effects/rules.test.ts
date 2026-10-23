import {
  allPlayerCardDefs,
  dispatch,
  playerCardDef,
  registerPlayerCard,
  registerPlayerCards,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, chooseWithConsent, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { resolve } from '../basic-abilities/testing'
import { me, patch } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import './index'
const code = '06115'
const begin = (by = 'a', difficulty = 5): Extract<Message, { type: 'BeginSkillTest' }> => ({
  type: 'BeginSkillTest',
  investigator: by,
  skill: 'intellect',
  difficulty,
  kind: { type: 'effect', source: 'momentum-test', onSuccess: [], onFail: [], onFailEach: [] },
})
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
function open(difficulty = 0, by = 'a'): GameState {
  let s = holding(code, { players: ['a', 'b'], enemy: null })
  s = {
    ...s,
    investigators: s.investigators.map((i) => ({ ...i, hand: i.id === by ? [code] : [] })),
  }
  return during(s, (x) => x, begin('a', difficulty))
}
const commit = (s: GameState, by = 'a') =>
  chooseWithConsent(s, by === 'a' ? 'choice.commit' : 'choice.commitFrom', { card: 'Momentum' })
const next = (s: GameState, by = 'a', difficulty = 5) => dispatch(clear(s), begin(by, difficulty))
// RR: Skill Test Results, Duration. Margin is capped per copy, applied after
// the test ends, to the committer's next test, in this phase only.
it.each([
  [0, 3],
  [2, 2],
  [3, 1],
  [4, 0],
  [5, 0],
])('succeeding against %s reserves the correct reduction (%s)', (difficulty, amount) => {
  let s = commit(open(difficulty))
  expect(me(s).nextTestDifficulty).toBeUndefined()
  expect(s.skillTest!.difficulty).toBe(difficulty)
  s = resolve(s)
  expect(me(s).nextTestDifficulty?.amount ?? 0).toBe(amount)
  s = next(s)
  expect(s.skillTest!.difficulty).toBe(5 - amount)
  expect(me(s).nextTestDifficulty).toBeUndefined()
})
it('auto-failure grants no reduction', () => {
  const s = resolve(commit(open()), 'autoFail')
  expect(me(s).nextTestDifficulty).toBeUndefined()
})
it('consumes the reduction once, whether the next test succeeds or fails', () => {
  let s = next(resolve(commit(open())))
  expect(s.skillTest!.difficulty).toBe(2)
  s = resolve(s, 'autoFail')
  s = next(s)
  expect(s.skillTest!.difficulty).toBe(5)
})
it('a helper reserves the reduction for their own next test rather than the performer', () => {
  let s = resolve(commit(open(0, 'b'), 'b'))
  expect(me(s).nextTestDifficulty).toBeUndefined()
  expect(s.investigators[1]!.nextTestDifficulty!.amount).toBe(3)
  s = next(s)
  expect(s.skillTest!.difficulty).toBe(5)
  s = resolve(s)
  s = next(s, 'b')
  expect(s.skillTest!.difficulty).toBe(2)
})
it.each(['phase', 'round'] as const)('does not carry into the next %s', (boundary) => {
  const s = resolve(commit(open()))
  const changed =
    boundary === 'phase' ? { ...s, phase: 'enemy' as const } : { ...s, round: s.round + 1 }
  expect(next(changed).skillTest!.difficulty).toBe(5)
})
it('stacks two committed copies on the same next test', () => {
  let s = patch({ hand: [code, code] })(open())
  s = commit(commit(s))
  s = resolve(s)
  expect(me(s).nextTestDifficulty!.amount).toBe(6)
  expect(next(s, 'a', 8).skillTest!.difficulty).toBe(2)
})
it('survives JSON and does not consume the reduction during skill replacement selection', () => {
  let s = resolve(commit(open()))
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = dispatch(
    clear(s),
    {
      type: 'RoundSkillReplacement',
      investigator: 'a',
      from: 'combat',
      to: 'intellect',
      code: '01036',
    },
    { ...begin(), skill: 'combat' },
  )
  expect(s.pending!.question.prompt).toBe('prompt.chooseSkill')
  expect(me(s).nextTestDifficulty!.amount).toBe(3)
  expect(s.pending!.question.choices.every((c) => c.params?.difficulty === 2)).toBe(true)
  s = choose(s, 'choice.test.intellect')
  expect(s.skillTest!.difficulty).toBe(2)
  expect(me(s).nextTestDifficulty).toBeUndefined()
})
// RR: Modifiers. Add/subtract before doubling; floor at zero after all changes.
it('combines reduction and increases before multiplication without premature flooring', () => {
  registerPlayerCards([
    {
      code: 'momentum-increase',
      name: 'Increase',
      type: 'skill',
      class: 'neutral',
      traits: [],
      icons: { wild: 1 },
    },
  ])
  registerPlayerCard({ code: 'momentum-increase', committedDifficulty: 2 })
  let s = next(resolve(commit(open())), 'a', 2)
  expect(s.skillTest!.difficulty).toBe(0)
  s = dispatch(
    clear(patch({ hand: ['momentum-increase'] })(s)),
    {
      type: 'CommitCard',
      investigator: 'a',
      code: 'momentum-increase',
    },
    { type: 'ModifySkillTest', difficultyFactor: 2 },
  )
  expect(s.skillTest!.difficulty).toBe(2)
})
it('does not create a late reduction after its original phase has ended', () => {
  let s = resolve(commit(open(5)))
  s = dispatch(clear(s), {
    type: 'ReduceNextTestDifficulty',
    investigator: 'a',
    amount: 3,
    phase: 'enemy',
    round: s.round,
  })
  expect(me(s).nextTestDifficulty).toBeUndefined()
})
// RR: Deck Customization. Actual shop and scenario integration.
it('has one catalog/shop entry and enters a scenario', () => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', ['jenny'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  expect(purchaseOptions(c, id).filter((o) => o.code === code)).toHaveLength(1)
  c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
  expect(playerCardDef(code)!.xp).toBe(1)
})
