// RR: Skill Tests, Committing Cards, Massive, Damage (Direct), Resources.
import {
  allPlayerCardDefs,
  dispatch,
  investigatorBehavior,
  playerCardDef,
  skillTestValue,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const begin = (skill: SkillType = 'combat', source = 'origin', difficulty = 1): Message => ({
  type: 'BeginSkillTest',
  investigator: 'a',
  skill,
  source,
  difficulty,
  kind: { type: 'effect', source: 'context-test', onSuccess: [], onFail: [], onFailEach: [] },
})
const count = (s: GameState, code: string) =>
  skillTestValue(
    dispatch({ ...s, pending: null, queue: [] }, { type: 'CommitCard', investigator: 'a', code }),
  ).icons
const offered = (s: GameState, code: string) =>
  s.pending?.question.choices.some((c) => c.params?.card === playerCardDef(code)!.name) ?? false

it('does not offer Isabelle a discard skill outside its commitment restrictions', () => {
  const s = during(game(), patch({ hand: ['60369'], discard: ['03272'] }), begin())
  const options = investigatorBehavior('12013')!.testOptions!(s, s.skillTest!, me(s))
  expect(options).toEqual([])
})

it('caps Easy Street at three extra wild icons and rejects a second copy', () => {
  for (const [resources, extra] of [
    [2, 0],
    [3, 1],
    [8, 2],
    [9, 3],
    [99, 3],
  ] as const) {
    const s = during(game(), patch({ hand: ['60369', '60369'], resources }), begin('willpower'))
    expect(count(s, '60369')).toBe(1 + extra!)
    const one = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'CommitCard', investigator: 'a', code: '60369' },
    )
    const two = dispatch(one, { type: 'CommitCard', investigator: 'a', code: '60369' })
    expect(two.skillTest!.committed).toHaveLength(1)
    expect(me(two).hand).toContain('60369')
  }
})

it('counts all engaged enemies including a ready Massive enemy', () => {
  const s = during(
    game(),
    patch({ hand: ['03272'] }),
    spawnAt('A', ghoul, 'a'),
    spawnAt('A', { ...ghoul, keywords: ['massive'] }, 'b'),
    begin(),
  )
  expect(count(s, '03272')).toBe(3)
  const empty = during(game(), patch({ hand: ['03272'] }), begin())
  expect(offered(empty, '03272')).toBe(false)
})

it('grants Armed to the Teeth icons only for an Item controlled by the committer', () => {
  for (const [source, owner, expected] of [
    ['origin', 'a', 3],
    ['origin', 'b', 1],
    ['60171', 'a', 1],
    ['event-code', 'a', 1],
  ] as const) {
    const s = during(
      game(),
      (s) => withAsset(patch({ hand: ['60168'] })(s), '60171', { id: 'origin', owner }),
      begin('combat', source),
    )
    expect(count(s, '60168')).toBe(expected)
  }
})

it('requires a controlled Firearm or Ranged source for Crack Shot', () => {
  for (const [asset, owner, source, expected] of [
    ['60171', 'a', 'origin', true],
    ['04204', 'a', 'origin', true],
    ['60171', 'b', 'origin', false],
    ['01072', 'a', 'origin', false],
    ['60171', 'a', 'event-code', false],
  ] as const) {
    const s = during(
      game(),
      (s) => withAsset(patch({ hand: ['11057'] })(s), asset, { id: 'origin', owner }),
      begin('combat', source),
    )
    expect(offered(s, '11057')).toBe(expected)
    const next = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'CommitCard', investigator: 'a', code: '11057' },
    )
    expect(next.skillTest?.committed.some((c) => c.code === '11057') ?? false).toBe(expected)
  }
})

it('applies Blood Curse directly even with an available damage-soaking asset', () => {
  const ally = allPlayerCardDefs().find((d) => d.type === 'asset' && (d.health ?? 0) > 1)!
  let s = during(
    game(),
    (s) => withAsset(patch({ hand: ['60467'] })(s), ally.code),
    begin('willpower'),
  )
  s = choose(s, 'choice.commit')
  expect(me(s).damage).toBe(1)
  expect(s.assets[ally.code]!.damage).toBe(0)
})

for (const [code, amount] of [
  ['60370', 2],
  ['60373', 4],
] as const)
  it(
    code + ' grants resources immediately and loses only resources still available on failure',
    () => {
      const s = during(
        game(),
        patch({ hand: [code], resources: 0 }),
        begin('agility', 'origin', 99),
      )
      let next = dispatch(
        { ...s, pending: null, queue: [] },
        { type: 'CommitCard', investigator: 'a', code },
      )
      expect(me(next).resources).toBe(amount)
      next = dispatch(
        next,
        { type: 'SpendResources', investigator: 'a', amount: amount - 1 },
        { type: 'RevealChaosToken', token: 0 },
        { type: 'ResolveSkillTest' },
        { type: 'EndSkillTest' },
      )
      expect(me(next).resources).toBe(0)
    },
  )

it('recovers only Survivor assets or events and re-reads the discard for each copy', () => {
  let s = during(
    game(),
    patch({ hand: ['60568', '60568'], discard: ['01072', '01075', '03039', '60171'] }),
    begin('willpower'),
  )
  s = choose(s, 'choice.commit')
  s = choose(s, 'choice.commit')
  const names = s.pending!.question.choices.map((c) => c.params?.card)
  expect(names).not.toContain(playerCardDef('03039')!.name)
  expect(names).not.toContain(playerCardDef('60171')!.name)
  s = choose(s, 'choice.reactiveRecover', { card: playerCardDef('01072')!.name })
  expect(me(s).hand).toEqual(expect.arrayContaining(['01072', '01075']))
  expect(me(s).discard).toEqual(expect.arrayContaining(['03039', '60171', '60568', '60568']))
})

for (const [code, amount] of [
  ['60370', 2],
  ['60373', 4],
] as const)
  it(code + ' also grants its resources when committed from the discard pile', () => {
    const open = during(
      game(),
      patch({ hand: [code], discard: [code], resources: 0 }),
      begin('agility'),
    )
    const next = dispatch(
      { ...open, pending: null, queue: [] },
      { type: 'CommitFromDiscard', investigator: 'a', code },
    )
    expect(me(next).resources).toBe(amount)
    expect(me(next).discard).not.toContain(code)
    expect(next.skillTest!.committed).toContainEqual({ code, by: 'a', fromDiscard: true })
    const ended = dispatch(
      next,
      { type: 'RevealChaosToken', token: 0 },
      { type: 'ResolveSkillTest' },
      { type: 'EndSkillTest' },
    )
    expect(me(ended).deck).toContain(code)
    expect(me(ended).discard).not.toContain(code)
  })
