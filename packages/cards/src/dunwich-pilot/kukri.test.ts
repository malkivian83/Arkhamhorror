import { playerCardDef } from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, withAsset } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('pays another action after success for additional damage', () => {
  let s = during(game(), (s) => withAsset(s, '02036'), spawnAt('A', { ...ghoul, health: 8 }, 'a'))
  s = choose(s, 'ability.fightWith', { card: playerCardDef('02036')!.name })
  s = choose(s, 'choice.pilotKukri')
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
  expect(me(s).actionsRemaining).toBe(1)
})

// RR: Costs. Declining the additional action leaves ordinary damage.
it('can decline the additional action', () => {
  let s = during(game(), (s) => withAsset(s, '02036'), spawnAt('A', { ...ghoul, health: 8 }, 'a'))
  s = choose(s, 'ability.fightWith', { card: playerCardDef('02036')!.name })
  s = choose(s, 'choice.skip')
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(1)
  expect(me(s).actionsRemaining).toBe(2)
})
