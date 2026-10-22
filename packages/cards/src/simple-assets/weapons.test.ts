import { skillTestValue } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { enemy, fight, labels, me, name, resolve, set, setup, sturdy } from './testing'

// RR: Fight, Uses, Activate; fight abilities do not provoke attacks of opportunity.
describe('.32 Colt', () => {
  it('spends 1 ammo to fight for +1 damage', () => {
    const s = fight(setup('52001'), '52001')
    expect(s.assets['52001']!.uses).toBe(5)
    expect(enemy(resolve(s)).damageTaken).toBe(2)
  })
  it('spends 1 resource to return to hand as a fast ability', () => {
    let s = setup('52001', { resources: 1 })
    s = choose(s, 'ability.simpleColtReturn', { card: '.32 Colt' })
    expect(s.assets['52001']).toBeUndefined()
    expect(me(s)).toMatchObject({ resources: 0, actionsRemaining: 3 })
    expect(me(s).hand).toContain('52001')
    expect(labels(setup('52001', { resources: 0 }))).not.toContain('ability.simpleColtReturn')
  })
})

describe('Chainsaw', () => {
  it('fights at +2 for +2 damage', () => {
    const s = fight(setup('60529'), '60529')
    expect(skillTestValue(s).total).toBe(5)
    expect(enemy(resolve(s)).damageTaken).toBe(3)
  })
  it('on a failed attack places 1 supply back or deals 1 damage', () => {
    let s = resolve(fight(setup('60529'), '60529'), 'autoFail')
    s = choose(s, 'choice.simpleChainsawSupply', { card: 'Chainsaw' })
    expect(s.assets['60529']!.uses).toBe(3)
    s = resolve(fight(setup('60529'), '60529'), 'autoFail')
    s = choose(s, 'choice.simpleChainsawDamage', { enemy: 'Ghoul' })
    expect(enemy(s).damageTaken).toBe(1)
    expect(s.assets['60529']!.uses).toBe(2)
  })
})

describe('Winchester Model 52', () => {
  it('spends 1 ammo to fight at +3 for +1 damage', () => {
    const s = fight(setup('60575'), '60575')
    expect(skillTestValue(s).total).toBe(6)
    expect(enemy(resolve(s)).damageTaken).toBe(2)
  })
  it('can be discarded to fight at +3 and evade the enemy on success', () => {
    let s = choose(setup('60575'), 'ability.simpleWinchesterDiscard', {
      card: name('60575'),
      enemy: 'Ghoul',
      skill: 'combat',
    })
    expect(s.assets['60575']).toBeUndefined()
    expect(skillTestValue(s).total).toBe(6)
    s = resolve(s)
    expect(enemy(s)).toMatchObject({ damageTaken: 1, engagedWith: null, exhausted: true })
  })
})

describe('Butterfly Swords', () => {
  it('fights at +1, then may exhaust to fight again adding agility for +1 damage', () => {
    let s = fight(setup('08025'), '08025')
    expect(skillTestValue(s).total).toBe(4)
    s = resolve(s)
    expect(enemy(s).damageTaken).toBe(1)
    s = choose(s, 'choice.fightAgain', { enemy: 'Ghoul' })
    expect(s.assets['08025']!.exhausted).toBe(true)
    expect(skillTestValue(s).total).toBe(6)
    s = resolve(s)
    expect(enemy(s).damageTaken).toBe(3)
    expect(me(s).actionsRemaining).toBe(2)
  })
  it('may decline the second attack, which needs an enemy to attack', () => {
    const s = resolve(fight(setup('08025', { asset: { exhausted: false } }), '08025'))
    const skipped = choose(s, 'choice.skip')
    expect(skipped.assets['08025']!.exhausted).toBe(false)
    const defeated = resolve(
      fight(set(setup('08025', { enemy: { ...sturdy, health: 1 } }), {}), '08025'),
    )
    expect(labels(defeated)).not.toContain('choice.fightAgain')
  })
})
