import { dispatch, skillTestValue, type GameState } from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { me } from '../dunwich-pilot/testing'
import { fight, setup } from '../basic-abilities/testing'
import { enemy, holding, play, resolve, sturdy } from './testing'

const endTurn = (s: GameState) =>
  dispatch({ ...s, pending: null, queue: [] }, { type: 'EndTurn', investigator: 'a' })

// RR: Fight, Attacks of Opportunity (a fight event does not provoke).
describe('Monster Slayer', () => {
  it('level 5 defeats a non-Elite enemy on success, but not an Elite one', () => {
    let s = play(holding('02300'), '02300')
    expect(me(s).damage).toBe(0)
    s = resolve(s)
    expect(Object.keys(s.enemies)).toHaveLength(0)
    s = resolve(play(holding('02300', { enemy: { ...sturdy, traits: ['Elite'] } }), '02300'))
    expect(enemy(s).damageTaken).toBe(1)
  })
  it('level 0 deals +1 damage', () => {
    expect(enemy(resolve(play(holding('60116'), '60116'))).damageTaken).toBe(2)
  })
})

describe('Cheap Shot', () => {
  it.each(['03194', '60312'])('%s adds agility and evades by 2', (code) => {
    let s = play(holding(code), code)
    expect(skillTestValue(s).total).toBe(6)
    s = resolve(s)
    expect(enemy(s)).toMatchObject({ damageTaken: 1, engagedWith: null, exhausted: true })
    s = resolve(play(holding(code, { enemy: { ...sturdy, fight: 5 } }), code))
    expect(enemy(s).engagedWith).toBe('a')
  })
  it('level 2 evades by 1 and returns to hand at the end of the turn by 3', () => {
    let s = resolve(play(holding('60323', { enemy: { ...sturdy, fight: 5 } }), '60323'))
    expect(enemy(s).exhausted).toBe(true)
    expect(me(endTurn(s)).hand).not.toContain('60323')
    s = resolve(play(holding('60323'), '60323'))
    expect(me(endTurn(s)).hand).toContain('60323')
  })
})

it('Sweeping Kick adds agility, deals +1 damage and evades on success', () => {
  let s = play(holding('08023'), '08023')
  expect(skillTestValue(s).total).toBe(6)
  s = resolve(s)
  expect(enemy(s)).toMatchObject({ damageTaken: 2, engagedWith: null })
})

describe('Blood Eclipse', () => {
  it('level 1 takes 2 damage for +2 willpower and +2 damage', () => {
    const s = play(holding('53001'), '53001')
    expect(me(s).damage).toBe(2)
    expect(s.skillTest?.skill).toBe('willpower')
    expect(skillTestValue(s).total).toBe(5)
    expect(enemy(resolve(s)).damageTaken).toBe(3)
  })
  it('level 3 takes up to 3 damage, +1 and +1 damage for each', () => {
    for (const n of [0, 3]) {
      let s = choose(play(holding('04266'), '04266'), 'choice.takeDamage', { n })
      expect(me(s).damage).toBe(n)
      expect(skillTestValue(s).total).toBe(3 + n)
      s = resolve(s)
      expect(enemy(s).damageTaken).toBe(1 + n)
    }
  })
})

describe('Spectral Razor', () => {
  it('adds willpower, +2 damage against non-Elite and +1 against Elite', () => {
    let s = play(holding('06201'), '06201')
    expect(skillTestValue(s).total).toBe(6)
    expect(enemy(resolve(s)).damageTaken).toBe(3)
    s = play(holding('06201', { enemy: { ...sturdy, traits: ['Elite'] } }), '06201')
    expect(enemy(resolve(s)).damageTaken).toBe(2)
  })
  it('engages an unengaged aloof enemy immediately before attacking it', () => {
    const aloof = { ...sturdy, keywords: ['aloof' as const] }
    const s = play(holding('06201', { enemy: aloof, engagedWith: null }), '06201')
    expect(enemy(s).engagedWith).toBe('a')
    expect(enemy(resolve(s)).damageTaken).toBe(3)
  })
  it('level 2 returns to hand at the end of the turn if a symbol was revealed', () => {
    const attack = (token: Parameters<typeof resolve>[1]) =>
      resolve(play(holding('10102'), '10102'), token)
    expect(me(endTurn(attack('elderSign'))).hand).toContain('10102')
    expect(me(endTurn(attack(0))).hand).not.toContain('10102')
  })
})

describe('One-Two Punch', () => {
  it('fights again at +2 and +1 damage after a success', () => {
    let s = play(holding('60117'), '60117')
    expect(skillTestValue(s).total).toBe(4)
    s = resolve(s)
    expect(enemy(s).damageTaken).toBe(1)
    s = choose(s, 'choice.fightAgain', { enemy: 'Ghoul' })
    expect(skillTestValue(s).total).toBe(5)
    expect(enemy(resolve(s)).damageTaken).toBe(3)
  })
  it('offers nothing after a failure or if the enemy was defeated', () => {
    let s = resolve(play(holding('60117', { enemy: { ...sturdy, fight: 6 } }), '60117'))
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
    s = resolve(play(holding('60117', { enemy: { ...sturdy, health: 1 } }), '60117'))
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  })
})

describe('Enchanted Blade (Mystic)', () => {
  it('spends up to 2 charges as an additional cost for +1 and +1 damage each', () => {
    let s = fight(setup('05193'), '05193')
    expect(skillTestValue(s).total).toBe(5)
    expect(enemy(resolve(s)).damageTaken).toBe(1)
    for (const n of [1, 2]) {
      s = choose(setup('05193'), 'ability.fightWithCharges', { card: 'Enchanted Blade', n })
      expect(s.assets['05193']!.uses).toBe(4 - n)
      expect(skillTestValue(s).total).toBe(5 + n)
      expect(enemy(resolve(s)).damageTaken).toBe(1 + n)
    }
    expect(() =>
      choose(setup('05193', { asset: { uses: 1 } }), 'ability.fightWithCharges', {
        card: 'Enchanted Blade',
        n: 2,
      }),
    ).toThrow()
  })
})
