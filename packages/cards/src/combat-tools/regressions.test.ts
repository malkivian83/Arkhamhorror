// RR: Uses, Fight, Retaliate: limits and keywords apply to the relevant attack.
import { expect, it } from 'vitest'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
it('ignores retaliate for the upgraded pistol without removing it from the enemy', () => {
  let s = during(
    game(),
    (s) =>
      withAsset(
        patch({ hand: [], skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } })(s),
        '03190',
      ),
    spawnAt('A', { ...ghoul, fight: 6, health: 10, keywords: ['retaliate'] }, 'a'),
  )
  s = choose(s, 'ability.fightWith')
  expect(me(s).damage + me(s).horror).toBe(0)
  expect(Object.values(s.enemies)[0]!.keywords).toContain('retaliate')
})
it('applies the one-ammo limit even when another effect adds ammunition', () => {
  const s = during(game(), (s) => withAsset(s, '04204'), {
    type: 'AddUses',
    asset: '04204',
    amount: 3,
  })
  expect(s.assets['04204']!.uses).toBe(1)
})
it('restores the ammunition spent by a failed .18 Derringer attack', () => {
  let s = during(
    game(),
    (s) =>
      withAsset(
        patch({ hand: [], skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } })(s),
        '60505',
      ),
    spawnAt('A', { ...ghoul, fight: 6, health: 10 }, 'a'),
  )
  s = choose(s, 'ability.fightWith')
  expect(s.assets['60505']!.uses).toBe(2)
})
