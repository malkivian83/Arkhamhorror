import { skillTestValue, type GameState, type Message, type SkillType } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { me, patch, withAsset } from '../dunwich-pilot/testing'
import { resolve, setup } from '../basic-abilities/testing'
import './index'

const test = (skill: SkillType, kind: 'effect' | 'investigate' = 'effect', by = 'a'): Message =>
  kind === 'investigate'
    ? {
        type: 'BeginSkillTest',
        investigator: by,
        skill,
        difficulty: 2,
        kind: { type: 'investigate', location: 'A' },
      }
    : {
        type: 'BeginSkillTest',
        investigator: by,
        skill,
        difficulty: 2,
        kind: { type: 'effect', source: 'boost-test', onSuccess: [], onFail: [], onFailEach: [] },
      }
const testing = (code: string, skill: SkillType, extra: (s: GameState) => GameState = (s) => s) =>
  during(setup(code, { enemy: null, resources: 10 }), extra, test(skill))
const labels = (s: GameState) => s.pending!.question.choices.map((c) => c.label)

// RR: Skill Tests (ST.2 fast abilities), Exhaust, Limits.
describe('Streetwise and Scrapper', () => {
  it.each([
    ['60311', 'intellect', 2, 2],
    ['60311', 'agility', 2, 2],
    ['60511', 'combat', 1, 1],
    ['60511', 'agility', 1, 1],
  ] as const)(
    '%s: +%s only for that skill, repeatable while resources last',
    (code, skill, cost, amount) => {
      let s = testing(code, skill)
      s = choose(s, 'ability.spendForSkill', { skill, n: cost })
      s = choose(s, 'ability.spendForSkill', { skill, n: cost })
      expect(skillTestValue(s).total).toBe(3 + 2 * amount)
      expect(me(s).resources).toBe(10 - 2 * cost)
    },
  )
  it('offers nothing for other skills', () => {
    expect(labels(testing('60311', 'combat'))).not.toContain('ability.spendForSkill')
    expect(labels(testing('60511', 'willpower'))).not.toContain('ability.spendForSkill')
  })
})

describe('High Roller', () => {
  it('spends 3 and exhausts for +2, and gains 3 only if the test succeeds', () => {
    let s = choose(testing('04156', 'willpower'), 'ability.highRoller')
    expect(skillTestValue(s).total).toBe(5)
    expect(s.assets['04156']!.exhausted).toBe(true)
    expect(labels(s)).not.toContain('ability.highRoller')
    expect(me(resolve(s)).resources).toBe(10)
    s = choose(testing('04156', 'willpower'), 'ability.highRoller')
    expect(me(resolve(s, 'autoFail')).resources).toBe(7)
  })
})

it('Cornered discards a card from hand for +2, once per test', () => {
  let s = testing('04160', 'combat', patch({ hand: ['x-card', 'y-card'] }))
  s = choose(s, 'ability.cornered')
  s = choose(s, 'choice.discard', { card: 'x-card' })
  expect(skillTestValue(s).total).toBe(5)
  expect(me(s).discard).toHaveLength(1)
  expect(labels(s)).not.toContain('ability.cornered')
})

it('Well Connected gives +1 per 5 resources and is limited to one per investigator', () => {
  let s = choose(testing('05028', 'agility'), 'ability.exhaustForBonus')
  expect(skillTestValue(s).total).toBe(5)
  s = testing('05028', 'agility', patch({ resources: 4 }))
  expect(labels(s)).not.toContain('ability.exhaustForBonus')
})

it('Quick Study places one of your clues on your location for +3', () => {
  let s = testing('04154', 'intellect', patch({ clues: 1 }))
  const clues = s.locations.A!.clues
  s = choose(s, 'ability.quickStudy')
  expect(skillTestValue(s).total).toBe(6)
  expect(me(s).clues).toBe(0)
  expect(s.locations.A!.clues).toBe(clues + 1)
  expect(labels(testing('04154', 'intellect'))).not.toContain('ability.quickStudy')
})

it('Well Prepared adds the matching icons of a chosen asset you control', () => {
  // Machete: 1 combat icon; .45 Automatic: 1 agility icon.
  let s = testing('04151', 'combat', (x) => withAsset(withAsset(x, '12020'), '01016'))
  const offered = s.pending!.question.choices.filter((c) => c.label === 'ability.wellPrepared')
  expect(offered.map((c) => c.params?.asset)).toEqual(['Machete'])
  s = choose(s, 'ability.wellPrepared', { asset: 'Machete' })
  expect(skillTestValue(s).total).toBe(4)
})

describe('Police Dog', () => {
  it.each([
    ['60156', 1],
    ['60170', 2],
  ] as const)('%s helps an investigation or attack at your location', (code, amount) => {
    const two = during(
      setup(code, { enemy: null, players: ['a', 'b'] }),
      (x) => x,
      test('intellect', 'investigate', 'b'),
    )
    const s = choose(two, 'ability.exhaustForBonus')
    expect(skillTestValue(s).total).toBe(3 + amount)
    expect(labels(testing(code, 'willpower'))).not.toContain('ability.exhaustForBonus')
  })
})
