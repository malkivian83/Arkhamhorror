import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, withAsset } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('discards on success, draws two and records identification', () => {
  let s = during(game(), (s) =>
    withAsset(
      patch({ skills: { willpower: 3, intellect: 5, combat: 3, agility: 3 }, hand: [] })(s),
      '02021',
    ),
  )
  s = choose(s, 'ability.pilotIdentify')
  expect(s.assets['02021']).toBeUndefined()
  expect(me(s).discard).toContain('02021')
  expect(me(s).hand).toHaveLength(2)
  expect(JSON.stringify(s.campaignLog)).toContain('identifiedSolution')
})
it('retains the solution on failure', () => {
  let s = during(game(), (s) => withAsset(s, '02021'))
  s = choose(s, 'ability.pilotIdentify')
  expect(s.assets['02021']).toBeDefined()
  expect(JSON.stringify(s.campaignLog)).not.toContain('identifiedSolution')
})
