import { skillTestValue } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { me } from '../dunwich-pilot/testing'
import { enemy, evade, fight, investigate, resolve, setup, sturdy } from './testing'

// RR: Fight, Investigate, Evade, Uses; each level checks its bonus, damage and penalty.
describe.each([
  ['01060', 0, 1, 'skull', 'horror'],
  ['01560', 0, 1, 'autoFail', 'horror'],
  ['02154', 2, 1, 'tablet', 'horror'],
  ['02306', 3, 2, 'elderThing', 'horror'],
  ['60407', 0, 1, 'elderSign', 'damage'],
  ['60425', 2, 1, 1, 'damage'],
  ['60430', 3, 2, 0, 'damage'],
] as const)('%s willpower attack spell', (code, bonus, extra, bad, penalty) => {
  it('attacks with willpower, deals extra damage and spends a charge', () => {
    let s = fight(setup(code), code, 'willpower')
    expect(skillTestValue(s).total).toBe(3 + bonus)
    s = resolve(s, penalty === 'horror' ? 0 : -1)
    expect(enemy(s).damageTaken).toBe(1 + extra)
    expect(s.assets[code]!.uses).toBe(3)
    expect(me(s).horror + me(s).damage).toBe(0)
  })
  it('applies its penalty when the listed token is revealed', () => {
    const s = resolve(fight(setup(code), code, 'willpower'), bad)
    expect(penalty === 'horror' ? me(s).horror : me(s).damage).toBe(extra)
  })
})

it('Shrivelling ignores the elder sign and Azure Flame ignores symbols', () => {
  expect(me(resolve(fight(setup('01060'), '01060', 'willpower'), 'elderSign')).horror).toBe(0)
  expect(me(resolve(fight(setup('60407'), '60407', 'willpower'), 'skull')).damage).toBe(0)
})

it('Song of the Dead deals +2 damage only when a skull is revealed', () => {
  const weak = { enemy: { ...sturdy, fight: 1 } }
  let s = fight(setup('02112', weak), '02112', 'willpower')
  expect(skillTestValue(s).total).toBe(4)
  expect(enemy(resolve(s, 'skull')).damageTaken).toBe(3)
  s = fight(setup('02112', weak), '02112', 'willpower')
  expect(enemy(resolve(s, 0)).damageTaken).toBe(1)
})

describe.each([
  ['60408', 0, 1],
  ['60426', 2, 1],
  ['60431', 3, 2],
] as const)('%s Clairvoyance', (code, bonus, extra) => {
  it('investigates with willpower, discovers extra clues and costs horror on good tokens', () => {
    let s = investigate(setup(code, { enemy: null }), code, 'willpower')
    expect(skillTestValue(s).total).toBe(3 + bonus)
    s = resolve(s, 0)
    expect(me(s).clues).toBe(Math.min(2, 1 + extra))
    expect(me(s).horror).toBe(extra)
    expect(
      me(resolve(investigate(setup(code, { enemy: null }), code, 'willpower'), -1)).horror,
    ).toBe(0)
  })
})

describe.each([
  ['60409', 0, 1],
  ['60427', 2, 1],
  ['60432', 3, 2],
] as const)('%s Ineffable Truth', (code, bonus, extra) => {
  it('evades with willpower, damages the enemy and costs resources on good tokens', () => {
    let s = evade(setup(code), code, 'willpower')
    expect(skillTestValue(s).total).toBe(3 + bonus)
    s = resolve(s, 1)
    expect(enemy(s)).toMatchObject({ engagedWith: null, exhausted: true, damageTaken: extra })
    expect(me(s).resources).toBe(5 - extra)
    expect(me(resolve(evade(setup(code), code, 'willpower'), -1)).resources).toBe(5)
  })
})

describe('Suggestion (1)', () => {
  it('adds willpower and keeps its charge when succeeding by 2', () => {
    let s = evade(setup('52006'), '52006')
    expect(skillTestValue(s).total).toBe(6)
    s = resolve(s)
    expect(s.assets['52006']).toMatchObject({ exhausted: true, uses: 3 })
  })
  it('loses a charge below a margin of 2 and is discarded without charges', () => {
    const hard = { ...sturdy, evade: 6 }
    let s = resolve(evade(setup('52006', { enemy: hard }), '52006'))
    expect(s.assets['52006']!.uses).toBe(2)
    s = resolve(evade(setup('52006', { enemy: hard, asset: { uses: 1 } }), '52006'))
    expect(s.assets['52006']).toBeUndefined()
    expect(me(s).discard).toContain('52006')
    const empty = setup('52006', { asset: { uses: 0 } })
    expect(() => evade(empty, '52006')).toThrow()
  })
})
