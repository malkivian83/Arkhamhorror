import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, withAsset } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('uses the selected investigator’s willpower and heals twice on success', () => {
  let s = during(game(['a', 'b']), (s) => withAsset(patch({ horror: 3 }, 'b')(s), '02024'))
  s = choose(s, 'ability.pilotCourage', { name: 'B' })
  expect(s.investigators[1]!.horror).toBe(1)
  expect(s.assets['02024']!.uses).toBe(3)
  expect(me(s).actionsRemaining).toBe(2)
})

// RR: Skill Tests; Random. Failure keeps the initial healing and discards from the patient.
it('discards from the patient on failure after healing once', () => {
  let s = during(game(['a', 'b']), (s) =>
    withAsset(
      {
        ...patch(
          {
            horror: 3,
            hand: ['one', 'two'],
            skills: { willpower: 0, intellect: 3, combat: 3, agility: 3 },
          },
          'b',
        )(s),
      },
      '02024',
    ),
  )
  s = choose(s, 'ability.pilotCourage', { name: 'B' })
  expect(s.investigators[1]!.horror).toBe(2)
  expect(s.investigators[1]!.hand).toHaveLength(1)
  expect(s.investigators[1]!.discard).toHaveLength(1)
})
