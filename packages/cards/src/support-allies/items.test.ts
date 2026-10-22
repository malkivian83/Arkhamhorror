import { dispatch, skillTestValue, type GameState } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { enemy, fight, labels, me, resolve, setup } from './testing'

const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })

// RR: Fight, Engage, Attacks of Opportunity, Reactions.
describe('Survival Knife', () => {
  it('fights at +1', () => {
    expect(skillTestValue(fight(setup('04017'), '04017')).total).toBe(4)
  })
  it('after an enemy-phase attack deals damage, exhausts to fight that enemy at +2 for +1', () => {
    let s = setup('04017')
    const id = Object.keys(s.enemies)[0]!
    s = { ...clear(s), phase: 'enemy' }
    s = dispatch(s, {
      type: 'Forced',
      trigger: { type: 'afterTakeDamage', investigator: 'a', damage: 1, horror: 0, enemy: id },
    })
    s = choose(s, 'ability.supportSurvivalKnife', { card: 'Survival Knife', enemy: 'Ghoul' })
    expect(s.assets['04017']!.exhausted).toBe(true)
    expect(skillTestValue(s).total).toBe(5)
    expect(enemy(resolve(s)).damageTaken).toBe(2)
  })
  it('does not react outside the enemy phase or to horror only', () => {
    const s = setup('04017')
    const id = Object.keys(s.enemies)[0]!
    const after = (x: GameState, damage: number) =>
      dispatch(clear(x), {
        type: 'Forced',
        trigger: { type: 'afterTakeDamage', investigator: 'a', damage, horror: 1, enemy: id },
      })
    expect(labels(after(s, 1))).not.toContain('ability.supportSurvivalKnife')
    expect(labels(after({ ...s, phase: 'enemy' }, 0))).not.toContain('ability.supportSurvivalKnife')
  })
})

describe('Trench Knife', () => {
  it('fights at +1 for each enemy engaged with you', () => {
    let s = during(setup('03147'), (x) => x, spawnAt('A', ghoul, 'a'))
    expect(skillTestValue(fight(s, '03147')).total).toBe(5)
    s = setup('03147', { enemy: null })
    expect(labels(s)).not.toContain('ability.fightWith')
  })
  // An aloof enemy stays unengaged, so it can be engaged while the Ghoul is engaged with you.
  it('lets you engage an enemy without attacks of opportunity from others', () => {
    let s = during(
      setup('03147', { engagedWith: 'a' }),
      (x) => x,
      spawnAt('A', { ...ghoul, name: 'Lurker', keywords: ['aloof'] }, null),
    )
    s = choose(s, 'action.engage', { enemy: 'Lurker' })
    expect(me(s)).toMatchObject({ damage: 0, horror: 0 })
    let without = during(
      setup('01087', { engagedWith: 'a' }),
      (x) => x,
      spawnAt('A', { ...ghoul, name: 'Lurker', keywords: ['aloof'] }, null),
    )
    without = choose(without, 'action.engage', { enemy: 'Lurker' })
    expect(me(without).damage + me(without).horror).toBeGreaterThan(0)
  })
})

describe('Hiking Boots', () => {
  it('gives +1 agility and moves after the last clue at your location is discovered', () => {
    let s = setup('08035', { enemy: null })
    expect(skillTestValue(choose(s, 'action.investigate', { location: 'Room A' })).total).toBe(3)
    s = dispatch(clear(s), {
      type: 'DiscoverClues',
      investigator: 'a',
      location: 'A',
      amount: 2,
    })
    s = choose(s, 'ability.supportHikingBoots', { card: 'Hiking Boots' })
    expect(me(s).location).toBe('B')
    expect(s.assets['08035']!.exhausted).toBe(true)
  })
  it('is limited to one Footwear per investigator', () => {
    const s = setup('08035', { enemy: null })
    const again = dispatch(
      { ...clear(s), investigators: s.investigators.map((i) => ({ ...i, hand: ['08035'] })) },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: '08035', fromHand: true },
    )
    expect(Object.values(again.assets).filter((a) => a.code === '08035')).toHaveLength(1)
  })
})
