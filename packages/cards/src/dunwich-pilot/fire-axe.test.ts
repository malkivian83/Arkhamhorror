import { playerCardDef } from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, withAsset } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('spends the last resource during its attack to increase skill and damage', () => {
  let s = during(
    game(),
    (s) => withAsset(patch({ resources: 1 })(s), '02032'),
    spawnAt('A', { ...ghoul, health: 8 }, 'a'),
  )
  s = choose(s, 'ability.fightWith', { card: playerCardDef('02032')!.name })
  s = choose(s, 'ability.pilotAxe')
  expect(me(s).resources).toBe(0)
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
})

// RR: Limits. The three spends belong to this attack, not the round.
it('caps the bonus at three spends and retains normal damage with resources remaining', () => {
  let s = during(
    game(),
    (s) => withAsset(patch({ resources: 4 })(s), '02032'),
    spawnAt('A', { ...ghoul, health: 8 }, 'a'),
  )
  s = choose(s, 'ability.fightWith', { card: playerCardDef('02032')!.name })
  for (let n = 0; n < 3; n++) s = choose(s, 'ability.pilotAxe')
  expect(s.pending!.question.choices.some((c) => c.label === 'ability.pilotAxe')).toBe(false)
  expect(me(s).resources).toBe(1)
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(1)
})
