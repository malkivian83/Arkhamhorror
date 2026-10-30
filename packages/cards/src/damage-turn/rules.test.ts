// RR: Damage/Horror, Cancellation, Lasting Effects, Skill Tests, Actual Investigator Turns.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  skillTestValue,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const start = () => patch({ hand: ['01093'], resources: 10 })(clear(game()))
const open = (s: GameState, extra: Partial<Extract<Message, { type: 'BeginSkillTest' }>> = {}) =>
  dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty: 3,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    ...extra,
  })
it.each(['02261', '05315'])(
  '%s cancels a chosen mix from a non-enemy source and gains exactly that many resources',
  (code) => {
    let s = patch({ hand: [code], resources: 10 })(clear(game()))
    s = dispatch(s, { type: 'TakeDamage', investigator: 'a', damage: 3, horror: 2, direct: true })
    expect(
      s.pending!.question.choices.some((c) => c.params?.card === playerCardDef(code)!.name),
    ).toBe(true)
    s = choose(s, 'ability.playCard', { card: playerCardDef(code)!.name })
    const cap = code === '02261' ? 5 : 2
    for (const option of s.pending!.question.choices)
      expect(Number(option.params!.damage) + Number(option.params!.horror)).toBeLessThanOrEqual(cap)
    s = choose(s, 'choice.windowCancel', { damage: 1, horror: 1 })
    expect(me(s).damage).toBe(2)
    expect(me(s).horror).toBe(1)
    expect(me(s).resources).toBe(12)
    expect(me(s).discard).toContain(code)
  },
)
it('Idol of Xanatos discards only non-weakness cards and cancels up to their number', () => {
  let s = withAsset(patch({ hand: ['01088', '01093', '12104'] })(clear(game())), '09102')
  s = dispatch(s, { type: 'TakeDamage', investigator: 'a', damage: 2, horror: 1, direct: true })
  s = choose(s, 'choice.windowIdol', { card: playerCardDef('09102')!.name })
  expect(
    s.pending!.question.choices.every(
      (c) => Number(c.params!.damage) + Number(c.params!.horror) <= 2,
    ),
  ).toBe(true)
  s = choose(s, 'choice.windowCancel', { damage: 1, horror: 1 })
  s = choose(s, 'choice.discard', { card: '01088' })
  if (s.pending?.question.choices.some((c) => c.label === 'choice.discard'))
    s = choose(s, 'choice.discard', { card: '01093' })
  expect(me(s).discard).toEqual(expect.arrayContaining(['01088', '01093']))
  expect(me(s).damage).toBe(1)
  expect(me(s).horror).toBe(0)
  expect(me(s).hand).toContain('12104')
  expect(s.assets['09102']!.exhausted).toBe(true)
})
it.each(['01085', '05281', '54010'])(
  "%s requires the actual own turn, not a temporary action in someone else's turn",
  (code) => {
    const b = playerCardBehavior(code)!,
      s = start()
    expect(b.canPlay!(s, 'a')).toBe(true)
    expect(b.canPlay!({ ...s, activeTurn: 'b' }, 'a')).toBe(false)
    expect(
      b.canPlay!(
        {
          ...s,
          activeTurn: 'a',
          immediateActions: [{ investigator: 'a', activeTurn: 'b', actionsRemaining: 3 }],
        },
        'a',
      ),
    ).toBe(false)
  },
)
it('Will to Survive covers repeated tests, survives serialization, and expires with the actual turn', () => {
  let s = dispatch(start(), { type: 'TurnSkillEffect', investigator: 'a', noTokens: true })
  s = JSON.parse(JSON.stringify(s))
  for (let n = 0; n < 2; n++) {
    const tested = open(s)
    expect(tested.skillTest!.noTokens).toBe(true)
    expect(tested.chaosBag).toEqual(s.chaosBag)
  }
  expect(open({ ...s, activeTurn: 'b' }).skillTest!.noTokens).toBeFalsy()
  expect(
    open({ ...s, log: [...s.log, { key: 'log.step.turnBegins', round: s.round }] }).skillTest!
      .noTokens,
  ).toBeFalsy()
})
it.each(['05281', '54010'])(
  '%s changes the selected base value while preserving other bonuses and printed skills',
  (code) => {
    const b = playerCardBehavior(code)!,
      s = start(),
      printed = me(s).skills.combat
    let selected = dispatch(s, b.play!(s, 'a')[0]!)
    selected = choose(selected, 'choice.windowBase', {
      skill: 'combat',
      n: code === '54010' ? 7 : 5,
    })
    const tested = open(selected)
    expect(skillTestValue(tested).base).toBe(code === '54010' ? 7 : 5)
    expect(me(tested).skills.combat).toBe(printed)
    expect(skillTestValue(open({ ...selected, activeTurn: 'b' })).base).toBe(printed)
  },
)
it('Trial by Fire 3 can set all four bases to five', () => {
  let s = start()
  s = dispatch(s, playerCardBehavior('54010')!.play!(s, 'a')[0]!)
  s = choose(s, 'choice.windowAllBase')
  for (const skill of ['willpower', 'intellect', 'combat', 'agility'] as const)
    expect(skillTestValue(open(s, { skill })).base).toBe(5)
})
it('On the Beat stacks copies, affects investigation/parley only and expires', () => {
  let s = start()
  const b = playerCardBehavior('60173')!
  expect(b.handReactions!(s, { type: 'turnEnds', investigator: 'a' }, 'a')).toEqual([])
  expect(b.handReactions!(s, { type: 'turnBegins', investigator: 'b' }, 'a')).toEqual([])
  const effect: Message = {
    type: 'TurnSkillEffect',
    investigator: 'a',
    bonus: { amount: 3, code: '60173', kinds: ['investigate'], tags: ['parley'] },
  }
  s = dispatch(s, effect)
  s = dispatch(s, effect)
  const base = skillTestValue(open(s)).total
  expect(skillTestValue(open(s, { tags: ['parley'] })).total).toBe(base + 6)
  expect(skillTestValue(open({ ...s, activeTurn: 'b' }, { tags: ['parley'] })).total).toBe(base)
})
