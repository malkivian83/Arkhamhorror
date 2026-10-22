import { dispatch, skillTestValue, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { patch } from '../dunwich-pilot/testing'
import { enemy, labels, me, put, setup } from './testing'

const investigateHere = (s: GameState) => choose(s, 'action.investigate', { location: 'Room A' })
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })

// RR: Allies, Constant abilities, Reactions, Fast.
describe('Jessica Hyde', () => {
  it('enters play with 2 damage, gives +1 combat and heals 1 damage after your turn', () => {
    let s = put(setup('01087', { enemy: null }), '06118')
    const id = Object.values(s.assets).find((a) => a.code === '06118')!.id
    expect(s.assets[id]!.damage).toBe(2)
    s = dispatch(clear(s), { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } })
    s = choose(s, 'ability.supportJessicaHeal', { card: 'Jessica Hyde' })
    expect(s.assets[id]!.damage).toBe(1)
    const fight = choose(setup('06118'), 'action.fight', { enemy: 'Ghoul' })
    expect(skillTestValue(fight).total).toBe(4)
  })
})

describe('Alice Luxley', () => {
  it('gives +1 intellect and, after you discover a clue, exhausts to deal 1 damage', () => {
    expect(skillTestValue(investigateHere(setup('05151', { enemy: null }))).total).toBe(4)
    let s = setup('05151')
    s = dispatch(clear(s), {
      type: 'DiscoverClues',
      investigator: 'a',
      location: 'A',
      amount: 1,
    })
    s = choose(s, 'ability.supportAliceDamage', { card: 'Alice Luxley' })
    expect(enemy(s).damageTaken).toBe(1)
    expect(s.assets['05151']!.exhausted).toBe(true)
  })
})

describe.each(['01055', '01555'])('%s Cat Burglar', (code) => {
  it('gives +1 agility and exhausts to disengage and move without provoking', () => {
    let s = setup(code)
    expect(skillTestValue(choose(s, 'action.evade', { enemy: 'Ghoul' })).total).toBe(4)
    s = choose(s, 'ability.supportCatBurglar', { card: 'Cat Burglar' })
    expect(me(s)).toMatchObject({ location: 'B', damage: 0, horror: 0, actionsRemaining: 2 })
    expect(enemy(s).engagedWith).toBeNull()
    expect(s.assets[code]!.exhausted).toBe(true)
  })
})

describe("Delilah O'Rourke", () => {
  it('gives +1 combat and agility and pays the evade value for 1 damage (2 if exhausted)', () => {
    let s = setup('06281', { resources: 2 })
    expect(skillTestValue(choose(s, 'action.evade', { enemy: 'Ghoul' })).total).toBe(4)
    s = choose(s, 'ability.supportDelilah', {
      card: "Delilah O'Rourke",
      enemy: 'Ghoul',
      n: 2,
      damage: 1,
    })
    expect(enemy(s).damageTaken).toBe(1)
    expect(me(s).resources).toBe(0)
    s = during(setup('06281', { resources: 2 }), (x) => ({
      ...x,
      enemies: Object.fromEntries(
        Object.entries(x.enemies).map(([id, e]) => [id, { ...e, exhausted: true }]),
      ),
    }))
    s = choose(s, 'ability.supportDelilah', {
      card: "Delilah O'Rourke",
      enemy: 'Ghoul',
      n: 2,
      damage: 2,
    })
    expect(enemy(s).damageTaken).toBe(2)
    expect(labels(setup('06281', { resources: 1 }))).not.toContain('ability.supportDelilah')
  })
})

describe('Brother Xavier', () => {
  it('gives +1 willpower, soaks for others and deals 2 damage when defeated', () => {
    let s = during(setup('02106', { players: ['a', 'b'] }), (x) => x)
    expect(
      skillTestValue(
        dispatch(clear(s), {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill: 'willpower',
          difficulty: 0,
          kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
        }),
      ).total,
    ).toBe(4)
    s = dispatch(clear(s), { type: 'DamageAsset', asset: '02106', damage: 3, horror: 0 })
    s = choose(s, 'ability.supportXavier', { card: 'Brother Xavier' })
    expect(enemy(s).damageTaken).toBe(2)
    expect(me(s).discard).toContain('02106')
  })
})

describe('Madame Labranche', () => {
  it('exhausts to draw with an empty hand or to gain a resource with none', () => {
    let s = setup('03198', { enemy: null, resources: 0 })
    expect(labels(s)).toEqual(
      expect.arrayContaining(['ability.supportLabrancheDraw', 'ability.supportLabrancheResource']),
    )
    s = choose(s, 'ability.supportLabrancheResource', { card: 'Madame Labranche' })
    expect(me(s).resources).toBe(1)
    expect(labels(s)).not.toContain('ability.supportLabrancheDraw')
    const full = during(setup('03198', { enemy: null }), patch({ hand: ['x'] }))
    expect(labels(full)).not.toContain('ability.supportLabrancheDraw')
    expect(labels(full)).not.toContain('ability.supportLabrancheResource')
  })
})
