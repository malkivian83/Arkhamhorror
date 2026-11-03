// RR: Skill Test Timing ST.7/ST.8, Lasting Effects, Revelation, Dilemma.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  skillValueFor,
  type GameState,
  type SkillType,
} from '@lcg/engine'
import { chooseWithConsent as choose } from '@lcg/engine/testing'
import { game, me, patch } from '../dunwich-pilot/testing'
import { open, commit, resolve } from '../skill-tricks/testing'
import './index'
const value = (s: GameState, skill: SkillType, by = 'a') =>
  skillValueFor(s, by, skill, {
    type: 'effect',
    source: 'temporary-test',
    onSuccess: [],
    onFail: [],
    onFailEach: [],
  })
const finish = (s: GameState) => {
  s = resolve(s)
  while (s.pending?.question.choices.some((c) => c.label === 'choice.card'))
    s = choose(s, 'choice.card', { card: 'Intrepid' })
  return s
}
it('Intrepid becomes an asset on success, buffs its committer, and is discarded at round end', () => {
  let s = commit(open('willpower', ['04192']), '04192')
  s = finish(s)
  const asset = Object.values(s.assets).find((a) => a.code === '04192')!
  expect(asset).toBeDefined()
  expect(me(s).discard).not.toContain('04192')
  for (const skill of ['intellect', 'combat', 'agility'] as const)
    expect(value(s, skill)).toBe(me(s).skills[skill] + 1)
  expect(value(s, 'willpower')).toBe(me(s).skills.willpower)
  s = dispatch({ ...s, pending: null, queue: [] }, { type: 'EndOfRound' })
  expect(s.assets[asset.id]).toBeUndefined()
  expect(me(s).discard.filter((c) => c === '04192')).toHaveLength(1)
})
it('Intrepid is discarded normally on failure and does not create an asset', () => {
  const s = resolve(commit(open('willpower', ['04192'], {}, { difficulty: 99 }), '04192'))
  expect(Object.values(s.assets).some((a) => a.code === '04192')).toBe(false)
  expect(me(s).discard).toContain('04192')
})
it('helping another investigator puts Intrepid under its committer’s control', () => {
  const s = finish(
    choose(
      open('willpower', ['04192'], {}, { players: ['a', 'b'], tester: 'b' }),
      'choice.commitFrom',
      { card: 'Intrepid', name: 'A' },
    ),
  )
  expect(Object.values(s.assets).find((a) => a.code === '04192')?.owner).toBe('a')
  expect(value(s, 'combat', 'b')).toBe(s.investigators[1]!.skills.combat)
})
it('conversion is once per physical copy and overrides normal end-of-test deck-bottom disposal', () => {
  let s = commit(open('willpower', ['04192']), '04192')
  const test = s.skillTest!
  s = {
    ...s,
    pending: null,
    queue: [],
    skillTest: {
      ...test,
      succeeded: true,
      committed: test.committed.map((c) => ({ ...c, toDeckBottom: true })),
    },
  }
  const effects = playerCardBehavior('04192')!.afterCommittedTest!(
    s,
    s.skillTest!,
    true,
    'a',
    s.skillTest!.committed[0],
  )
  s = dispatch(s, ...effects, ...effects)
  expect(Object.values(s.assets).filter((a) => a.code === '04192')).toHaveLength(1)
  s = dispatch(s, { type: 'EndSkillTest' })
  expect(me(s).discard).not.toContain('04192')
  expect(me(s).deck).not.toContain('04192')
})

const drawn = (phase: GameState['phase'] = 'investigation') => {
  const s = patch({ hand: [], deck: ['09106'], discard: [] })({
    ...game(['a', 'b']),
    pending: null,
    queue: [],
    phase,
  })
  return dispatch(s, { type: 'DrawCards', investigator: 'a', amount: 1 })
}
it('two successful Intrepid copies create two distinct assets and stack their bonuses', () => {
  const s = finish(commit(commit(open('willpower', ['04192', '04192']), '04192'), '04192'))
  expect(Object.values(s.assets).filter((a) => a.code === '04192')).toHaveLength(2)
  expect(value(s, 'agility')).toBe(me(s).skills.agility + 2)
})
it('a canceled Intrepid skill has no conversion effect', () => {
  let s = commit(open('willpower', ['04192']), '04192')
  s = {
    ...s,
    pending: null,
    queue: [],
    skillTest: { ...s.skillTest!, succeeded: true, skillCardsCanceled: true },
  }
  s = dispatch(s, { type: 'ApplySkillTestResults', prepared: true })
  expect(Object.values(s.assets).some((a) => a.code === '04192')).toBe(false)
  s = dispatch({ ...s, pending: null, queue: [] }, { type: 'EndSkillTest' })
  expect(me(s).discard).toContain('04192')
})
const select = (s: GameState) =>
  choose(choose(s, 'choice.chargedSkill', { skill: 'willpower' }), 'choice.chargedSkill', {
    skill: 'combat',
  })
it('Making Preparations resolves on drawing, chooses distinct skills, and affects every investigator', () => {
  let s = drawn()
  s = choose(s, 'choice.chargedSkill', { skill: 'willpower' })
  expect(s.pending!.question.choices.some((c) => c.params?.skill === 'willpower')).toBe(false)
  s = choose(s, 'choice.chargedSkill', { skill: 'combat' })
  for (const i of s.investigators)
    for (const skill of ['willpower', 'intellect', 'combat', 'agility'] as const)
      expect(value(s, skill, i.id)).toBe(
        i.skills[skill] + (skill === 'willpower' || skill === 'combat' ? 1 : -1),
      )
  expect(me(s).discard).toContain('09106')
  expect(playerCardBehavior('09106')!.canPlay!(s, 'a')).toBe(false)
})
it.each(['mythos', 'investigation', 'upkeep'] as const)(
  'Preparations drawn in %s lasts through the next investigation and expires afterwards',
  (phase) => {
    const s = select(drawn(phase))
    const round = s.round + (phase === 'upkeep' ? 1 : 0)
    expect(value(s, 'combat')).toBe(me(s).skills.combat + 1)
    expect(value({ ...s, phase: 'investigation', round }, 'combat')).toBe(me(s).skills.combat + 1)
    expect(value({ ...s, phase: 'enemy', round }, 'combat')).toBe(me(s).skills.combat)
    expect(value({ ...s, phase: 'investigation', round: round + 1 }, 'intellect')).toBe(
      me(s).skills.intellect,
    )
  },
)
it('a third Dilemma in a round is discarded without resolving, and the first two stack', () => {
  let s = select(drawn())
  for (let n = 0; n < 2; n++) {
    s = dispatch(patch({ deck: ['09106'] })({ ...s, pending: null, queue: [] }), {
      type: 'DrawCards',
      investigator: 'a',
      amount: 1,
    })
    if (n === 0) s = select(s)
  }
  expect(s.dilemmasResolved?.count).toBe(2)
  expect(me(s).discard.filter((c) => c === '09106')).toHaveLength(3)
  expect(value(s, 'combat')).toBe(me(s).skills.combat + 2)
})
