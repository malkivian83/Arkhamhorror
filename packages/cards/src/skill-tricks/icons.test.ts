import { describe, expect, it } from 'vitest'
import { commit, commitLabels, icons, open, resolve } from './testing'

// RR: Skill Tests, Committing Cards, Skill Icons, Max X committed per skill test.
describe.each([
  ['08024', 'combat', 'agility'],
  ['08037', 'intellect', 'agility'],
  ['08065', 'willpower', 'intellect'],
  ['08078', 'willpower', 'combat'],
] as const)('%s swaps skill values into icons', (code, a, b) => {
  it('gains icons of each skill equal to your value in the other one', () => {
    const changes = { skills: { willpower: 1, intellect: 1, combat: 1, agility: 1, [b]: 4 } }
    expect(icons(commit(open(a, [code], changes), code))).toBe(4)
    const other = { skills: { willpower: 1, intellect: 1, combat: 1, agility: 1, [a]: 2 } }
    expect(icons(commit(open(b, [code], other), code))).toBe(2)
    expect(commitLabels(open(a, [code], { skills: { ...changes.skills, [b]: 0 } }))).toEqual([])
  })
})

it('Savant gains [wild] equal to your lowest skill other than the tested one', () => {
  const skills = { willpower: 1, intellect: 5, combat: 3, agility: 4 }
  expect(icons(commit(open('intellect', ['08052'], { skills }), '08052'))).toBe(1 + 1)
  expect(icons(commit(open('willpower', ['08052'], { skills }), '08052'))).toBe(1 + 3)
})

it('Indomitable gains 3 [wild] only if an enemy attacked an investigator here this round', () => {
  let s = open('combat', ['60180'])
  expect(icons(commit(s, '60180'))).toBe(2)
  s = { ...s, enemyAttacks: [{ enemy: 'e', investigator: 'a', round: s.round }] }
  expect(icons(commit(s, '60180'))).toBe(5)
  s = { ...s, enemyAttacks: [{ enemy: 'e', investigator: 'a', round: s.round - 1 }] }
  expect(icons(commit(s, '60180'))).toBe(2)
})

describe('Calculated Risk', () => {
  it('gains [wild] per action this turn and ends your turn after the test', () => {
    let s = open('combat', ['09070'], { actionsTaken: 2 })
    s = commit(s, '09070')
    expect(icons(s)).toBe(2)
    const round = s.round
    s = resolve(s)
    // Ending the only investigator's turn closes the round.
    expect(s.round).toBe(round + 1)
  })
  it('is only committed to your own test during your turn', () => {
    const other = open(
      'combat',
      ['09070'],
      { actionsTaken: 1 },
      { players: ['a', 'b'], tester: 'b' },
    )
    expect(commitLabels(other)).not.toContain('Calculated Risk')
    const notTurn = open('combat', ['09070'], { actionsTaken: 1 }, { activeTurn: null })
    expect(commitLabels(notTurn)).not.toContain('Calculated Risk')
  })
})
