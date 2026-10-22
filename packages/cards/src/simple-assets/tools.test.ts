import { skillTestValue } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { clues, investigate, labels, me, resolve, set, setup, withAsset } from './testing'

// RR: Investigate, Uses, Fast, Heal.
it('Fingerprint Kit exhausts and spends a supply to investigate at +2 for 2 more clues', () => {
  const s = investigate(clues(setup('09057', { enemy: null }), 'A', 4), '09057')
  expect(s.assets['09057']).toMatchObject({ exhausted: true, uses: 2 })
  expect(skillTestValue(s).total).toBe(5)
  expect(me(resolve(s)).clues).toBe(3)
})

describe("Thieves' Kit", () => {
  it('investigates with agility at +1 and gains 2 resources when it succeeds by 2', () => {
    let s = investigate(setup('09075', { enemy: null }), '09075', 'agility')
    expect(skillTestValue(s).total).toBe(4)
    s = resolve(s)
    expect(me(s)).toMatchObject({ clues: 1, resources: 5 + 2 })
    s = resolve(investigate(setup('09075', { enemy: null }), '09075'), -1)
    expect(me(s)).toMatchObject({ clues: 1, resources: 5 + 1 })
  })
})

describe.each(['01040', '01540', '60270'])('%s Magnifying Glass', (code) => {
  it('gives +1 intellect only while investigating', () => {
    const s = choose(setup(code, { enemy: null }), 'action.investigate', { location: 'Room A' })
    expect(skillTestValue(s).total).toBe(4)
  })
  it('returns to hand as a fast ability only without clues at the location', () => {
    expect(labels(setup(code, { enemy: null }))).not.toContain('ability.simpleReturnToHand')
    const s = choose(clues(setup(code, { enemy: null }), 'A', 0), 'ability.simpleReturnToHand', {
      card: 'Magnifying Glass',
    })
    expect(me(s).hand).toContain(code)
    expect(me(s).actionsRemaining).toBe(3)
  })
})

describe.each(['03230', '01683'])('%s First Aid', (code) => {
  it('heals 1 damage and 1 horror from an investigator or Ally and is discarded when empty', () => {
    let s = set(setup(code, { enemy: null, asset: { uses: 1 } }), { damage: 2, horror: 1 })
    s = during(s, (x) => withAsset(x, '12016', { damage: 1, horror: 1 }))
    expect(labels(s).filter((l) => l === 'ability.simpleFirstAid')).toHaveLength(2)
    s = choose(s, 'ability.simpleFirstAid', { card: 'First Aid', name: 'A' })
    expect(me(s)).toMatchObject({ damage: 1, horror: 0 })
    expect(s.assets[code]).toBeUndefined()
    expect(me(s).discard).toContain(code)
  })
})

it('Hemispheric Map gives +1 willpower and intellect with 2 connections, +2 with 4', () => {
  // Room B connects to A and C; Room A only to B.
  let s = setup('04275', { enemy: null })
  const value = (x: typeof s) =>
    skillTestValue(
      choose(x, 'action.investigate', { location: x.locations[me(x).location!]!.name }),
    ).total
  expect(value(s)).toBe(3)
  s = set(s, { location: 'B' })
  expect(value(s)).toBe(4)
  s = {
    ...s,
    locations: { ...s.locations, B: { ...s.locations.B!, connections: ['A', 'C', 'D', 'E'] } },
  }
  expect(value(s)).toBe(5)
})
