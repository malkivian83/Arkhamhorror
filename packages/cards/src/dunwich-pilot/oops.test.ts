import { playerCardDef } from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, patch, hand } from './testing'
// RR: Skill Tests; Costs; Resolving Abilities; card-specific effect.
it('redirects failed attack damage to a different enemy', () => {
  let s = during(
    hand(game(), '02113'),
    patch({ skills: { willpower: 3, intellect: 3, combat: 1, agility: 3 } }),
    spawnAt('A', { ...ghoul, name: 'Original', health: 8 }, 'a'),
    spawnAt('A', { ...ghoul, name: 'Other', health: 8 }, 'a'),
  )
  s = choose(s, 'action.fight', { enemy: 'Original' })
  s = choose(s, 'choice.revealToken')
  s = choose(s, 'ability.playCard', { card: playerCardDef('02113')!.name })
  expect(Object.values(s.enemies).find((e) => e.name === 'Other')!.damageTaken).toBe(1)
  expect(Object.values(s.enemies).find((e) => e.name === 'Original')!.damageTaken).toBe(0)
})
