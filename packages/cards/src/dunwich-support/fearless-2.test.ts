import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch } from '../dunwich-pilot/testing'
// RR: Skills; Skill Tests ST.7; Healing. A helper's recovery does not heal the test performer.
it.each([
  [3, 2],
  [1, 3],
  [0, 4],
])('uses willpower %s and leaves %s horror', (willpower, horror) => {
  let s = during(
    game(),
    (s) => ({
      ...patch({
        hand: ['02268'],
        horror: 4,
        skills: { willpower, intellect: 3, combat: 3, agility: 3 },
      })(s),
      chaosBag: [willpower === 0 ? -4 : 0],
    }),
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 2,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  s = choose(s, 'choice.commit')
  expect(me(s).horror).toBe(horror)
})
it('heals the helper who committed the skill', () => {
  let s = during(game(['a', 'b']), patch({ hand: ['02268'], horror: 4 }, 'b'), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'willpower',
    difficulty: 2,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  s = choose(s, 'choice.commitFrom', { name: 'B' })
  expect(s.investigators[1]!.horror).toBe(2)
  expect(me(s).horror).toBe(0)
})
