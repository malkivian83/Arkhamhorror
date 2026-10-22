import { dispatch, skillTestValue } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { setup } from '../basic-abilities/testing'
import { patch } from '../dunwich-pilot/testing'
import { value } from './testing'

// RR: Free Triggered Abilities, Lasting Effects, Skill Tests.
it('stacks repeatable phase bonuses, with costs but no action', () => {
  let s = setup('07152', { enemy: null, resources: 6 })
  s = choose(s, 'ability.phaseKeenEye', { skill: 'intellect' })
  s = choose(s, 'ability.phaseKeenEye', { skill: 'intellect' })
  s = choose(s, 'ability.phaseKeenEye', { skill: 'combat' })
  expect(value(s)).toBe(5)
  expect(value(s, 'combat')).toBe(4)
  expect(value(s, 'agility')).toBe(3)
  expect(s.investigators[0]!.actionsRemaining).toBe(3)
  expect(s.investigators[0]!.resources).toBe(0)
  expect(s.pending!.question.choices.some((c) => c.label === 'ability.phaseKeenEye')).toBe(false)
  expect(value({ ...s, phase: 'upkeep' })).toBe(3)
})
it('is offered to its controller in another investigator turn and during a test', () => {
  let s = during(setup('07152', { enemy: null, players: ['a', 'b'] }), (s) => ({
    ...s,
    activeTurn: 'b',
  }))
  s = choose(s, 'ability.phaseKeenEye', { skill: 'intellect' })
  expect(s.investigators[0]!.resources).toBe(3)
  expect(s.investigators[1]!.resources).toBe(5)
  s = during(s, patch({ hand: ['01088'] }), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 5,
    kind: { type: 'investigate', location: 'A' },
  })
  s = choose(s, 'ability.phaseKeenEye', { skill: 'intellect' })
  expect(skillTestValue(s).total).toBe(5)
})
it('works in a phase player window and remains serializable', () => {
  const s = setup('07152', { enemy: null })
  let window = dispatch(
    { ...s, phase: 'enemy', pending: null, queue: [] },
    { type: 'InvestigatorFastWindow' },
  )
  window = choose(window, 'ability.phaseKeenEye', { skill: 'combat' })
  expect(value(JSON.parse(JSON.stringify(window)), 'combat')).toBe(4)
  expect(value({ ...window, round: window.round + 1 }, 'combat')).toBe(3)
})
