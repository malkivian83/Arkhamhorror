// RR: Fight: a failed attack against another investigator's enemy deals its damage to that investigator.
import { expect, it } from 'vitest'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { availableAbilities, playerCardDef } from '@lcg/engine'
import { game, patch, play, withAsset } from '../dunwich-pilot/testing'
it('retains unconditional weapon damage when a failed attack hits another investigator', () => {
  let s = during(
    game(['a', 'b']),
    (s) =>
      withAsset(
        patch({ hand: [], skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } })(s),
        '01016',
      ),
    spawnAt('A', { ...ghoul, fight: 5, health: 10 }, 'b'),
  )
  s = choose(s, 'ability.fightWith')
  expect(s.investigators[1]!.damage).toBe(2)
})
it('excludes success-only bonus damage from a failed attack against another investigator', () => {
  let s = during(
    game(['a', 'b']),
    (s) =>
      withAsset(
        patch({ hand: [], skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } })(s),
        '01047',
      ),
    spawnAt('A', { ...ghoul, fight: 5, health: 10 }, 'b'),
  )
  s = choose(s, 'ability.fightWith')
  expect(s.investigators[1]!.damage).toBe(1)
})
it('retains Backstab damage on failure and pays no opportunity attack', () => {
  let s = during(
    game(['a', 'b']),
    patch({ hand: [], skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } }),
    spawnAt('A', { ...ghoul, fight: 5, health: 10 }, 'b'),
  )
  s = play(s, '01051')
  expect(s.investigators[1]!.damage).toBe(3)
  expect(s.investigators[0]!.damage).toBe(0)
})
it('allows Medical Texts to target a healthy colocated investigator', () => {
  const s = during(game(['a', 'b']), (s) => withAsset(s, '01035'))
  expect(
    availableAbilities(s, 'a').filter((a) => a.label === 'ability.equipmentMedical'),
  ).toHaveLength(2)
})
it('does not search beyond nine cards or take a non-Weapon asset', () => {
  let s = during(
    game(),
    patch({ deck: [...Array.from({ length: 8 }, (_, i) => 'unknown-' + i), '12089', '01016'] }),
  )
  s = play(s, '02184')
  expect(s.investigators[0]!.hand).not.toContain('01016')
  expect(s.investigators[0]!.deck).toHaveLength(10)
})
it('searches only six cards and does not draw a weakness merely found while searching', () => {
  let s = during(
    game(),
    patch({
      deck: ['12097', '12089', ...Array.from({ length: 4 }, (_, i) => 'unknown-' + i), '01016'],
    }),
  )
  s = play(s, '03026')
  if (s.pending?.question.prompt === 'prompt.searchToHand')
    s = choose(s, 'choice.takeCard', { card: playerCardDef('12089')!.name })
  expect(s.investigators[0]!.hand).toContain('12089')
  expect(s.investigators[0]!.hand).not.toContain('12097')
  expect(s.investigators[0]!.hand).not.toContain('01016')
})
