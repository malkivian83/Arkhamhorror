import { playerCardBehavior, playableCards, type SkillTest } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, hand, withAsset } from '../dunwich-pilot/testing'
// RR: Constant Abilities; Reactions; Unique.
it('adds willpower and agility and heals horror at the controller’s turn end', () => {
  let s = withAsset(game(), '02035', { horror: 2 })
  const a = s.assets['02035']!,
    modifier = playerCardBehavior('02035')!.skillModifier!
  for (const skill of ['willpower', 'agility'] as const)
    expect(modifier(s, a, { skill } as SkillTest)).toBe(1)
  expect(modifier(s, a, { skill: 'intellect' } as SkillTest)).toBe(0)
  s = during(s, (s) => s, { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } })
  s = choose(s, 'ability.healAsset')
  expect(s.assets['02035']!.horror).toBe(1)
})
it('shares its unique title across the level-zero edition', () => {
  const s = hand(
    during(game(['a', 'b']), (s) => withAsset(s, '02033', { owner: 'b' })),
    '02035',
  )
  expect(playableCards(s, 'a', false)).not.toContain('02035')
})
