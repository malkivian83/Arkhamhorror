import { playerCardDef } from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, withAsset } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('prevents friendly damage when the attack fails', () => {
  let s = during(
    game(['a', 'b']),
    (s) =>
      withAsset(
        patch({ skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } })(s),
        '02016',
      ),
    spawnAt('A', { ...ghoul, health: 8 }, 'b'),
  )
  s = choose(s, 'ability.fightWith', { card: playerCardDef('02016')!.name })
  expect(s.investigators[1]!.damage).toBe(0)
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(0)
  expect(me(s).actionsRemaining).toBe(2)
})
