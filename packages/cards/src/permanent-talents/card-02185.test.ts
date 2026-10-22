import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { setup } from '../basic-abilities/testing'
import { value } from '../phase-bonuses/testing'
it('Keen Eye 3 retains the phase bonus and repeated resource cost', () => {
  let s = setup('02185', { enemy: null, resources: 4 })
  s = choose(s, 'ability.phaseKeenEye', { skill: 'combat' })
  s = choose(s, 'ability.phaseKeenEye', { skill: 'combat' })
  expect(value(s, 'combat')).toBe(5)
  expect(s.investigators[0]!.resources).toBe(0)
  expect(value({ ...s, phase: 'enemy' }, 'combat')).toBe(3)
})
