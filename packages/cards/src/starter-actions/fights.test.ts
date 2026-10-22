import { skillTestValue } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { endTurn, enemy, exhaust, holding, me, play, resolve, set, sturdy } from './testing'

// RR: Fight; fight events do not provoke attacks of opportunity.
describe('Caustic Reaction', () => {
  it.each([
    ['60261', 4, 1, 2],
    ['60273', 5, 2, 3],
  ] as const)(
    '%s fights with intellect; extra damage with 2 or more clues',
    (code, total, without, withClues) => {
      let s = play(holding(code), code)
      expect(s.skillTest?.skill).toBe('intellect')
      expect(skillTestValue(s).total).toBe(total)
      expect(me(s).damage).toBe(0)
      expect(enemy(resolve(s)).damageTaken).toBe(without)
      s = resolve(play(set(holding(code), { clues: 2 }), code))
      expect(enemy(s).damageTaken).toBe(withClues)
    },
  )
})

describe('A Sudden Fall', () => {
  it('level 0 fights at +2 and deals +1 damage to an exhausted enemy', () => {
    let s = play(holding('60367'), '60367')
    expect(skillTestValue(s).total).toBe(5)
    expect(enemy(resolve(s)).damageTaken).toBe(1)
    s = resolve(play(exhaust(holding('60367', { engagedWith: null })), '60367'))
    expect(enemy(s).damageTaken).toBe(2)
  })
  it('level 2 fights with agility plus combat and deals +2 damage to an exhausted enemy', () => {
    let s = play(holding('60378'), '60378')
    expect(s.skillTest?.skill).toBe('agility')
    expect(skillTestValue(s).total).toBe(6)
    expect(enemy(resolve(s)).damageTaken).toBe(1)
    s = resolve(play(exhaust(holding('60378', { engagedWith: null })), '60378'))
    expect(enemy(s).damageTaken).toBe(3)
  })
})

it('Backstab 3 fights with agility for +2 damage and returns to hand when it succeeds by 2', () => {
  let s = play(holding('60329'), '60329')
  expect(s.skillTest?.skill).toBe('agility')
  s = resolve(s)
  expect(enemy(s).damageTaken).toBe(3)
  expect(me(endTurn(s)).hand).not.toContain('60329')
  s = resolve(play(holding('60329'), '60329'), 1)
  expect(me(endTurn(s)).hand).toContain('60329')
})

it('Consume Life fights with willpower for +1 damage and heals only when it defeats', () => {
  let s = resolve(play(set(holding('60462'), { damage: 2 }), '60462'))
  expect(enemy(s).damageTaken).toBe(2)
  expect(me(s).damage).toBe(2)
  s = play(set(holding('60462', { enemy: { ...sturdy, health: 2 } }), { damage: 2 }), '60462')
  expect(s.skillTest?.skill).toBe('willpower')
  s = resolve(s)
  if (s.pending?.question.choices.some((c) => c.label === 'choice.healDamageOf'))
    s = choose(s, 'choice.healDamageOf', { name: 'A' })
  expect(Object.keys(s.enemies)).toHaveLength(0)
  expect(me(s).damage).toBe(1)
})

it('"I\'ve got a plan!" 2 fights with intellect at +2 and adds up to three clue damage', () => {
  let s = play(set(holding('60225'), { clues: 5 }), '60225')
  expect(s.skillTest?.skill).toBe('intellect')
  expect(skillTestValue(s).total).toBe(5)
  expect(enemy(resolve(s)).damageTaken).toBe(4)
  s = resolve(play(set(holding('60225'), { clues: 1 }), '60225'))
  expect(enemy(s).damageTaken).toBe(2)
})
