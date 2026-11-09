// RR: Triggered Abilities. Rabbit's Foot (60560) is the same card as 01075 (same English and
// Spanish text); the reprint keeps its own code and reuses the reviewed behavior.
import { playerCardBehavior } from '@lcg/engine'
import { choose, during, labels, withBag } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
import approvals from './approvals.json'
import en from './source-en.json'
import source from './rabbits-foot-source.json'
import { RABBITS_FOOT } from './testing'

it('is registered as a reviewed reprint of 01075 with an exact equivalence fingerprint', () => {
  const approval = approvals.cards.find((c) => c.code === RABBITS_FOOT)!
  expect(approval).toMatchObject({ behaviorSource: '01075' })
  const target = en.find((c) => c.code === RABBITS_FOOT)!
  expect(source.code).toBe('01075')
  for (const field of ['name', 'cost', 'xp', 'traits', 'text', 'slot', 'skill_wild'] as const)
    expect(target[field as keyof typeof target], field).toEqual(
      source[field as keyof typeof source],
    )
  expect(approval.equivalenceSha256).toMatch(/^[a-f0-9]{64}$/)
  expect(playerCardBehavior(RABBITS_FOOT)).toBeDefined()
})

it('draws 1 card after its owner fails a skill test, exhausting itself', () => {
  let s = during(
    game(),
    (s) => withAsset(withBag('autoFail')(patch({ hand: [] })(s)), RABBITS_FOOT),
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'agility',
      difficulty: 1,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  expect(labels(s)).toContain('ability.drawCards')
  s = choose(s, 'ability.drawCards')
  expect(me(s).hand).toHaveLength(1)
  expect(s.assets[RABBITS_FOOT]!.exhausted).toBe(true)
})
