import { dispatch, playableCards, skillTestValue, slotCapacity, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { me, patch, withAsset } from '../dunwich-pilot/testing'
import { enemy, fight, investigate, resolve, setup, sturdy } from './testing'

const roundEnds = (s: GameState) =>
  dispatch({ ...s, pending: null, queue: [] }, { type: 'Forced', trigger: { type: 'roundEnds' } })

// RR: Fight, Uses, Exhaust, Forced abilities.
describe('Baseball Bat (0)', () => {
  it.each(['01074', '01574'])('%s: +2 and +1 damage; skull or autofail discards it', (code) => {
    let s = fight(setup(code), code)
    expect(skillTestValue(s).total).toBe(5)
    s = resolve(s)
    expect(enemy(s).damageTaken).toBe(2)
    expect(s.assets[code]).toBeDefined()
    for (const token of ['skull', 'autoFail'] as const) {
      const after = resolve(fight(setup(code), code), token)
      expect(after.assets[code]).toBeUndefined()
      expect(me(after).discard).toContain(code)
    }
  })
})

it('.35 Winchester deals +2 damage on a +1, 0 or elder sign', () => {
  for (const [token, damage] of [
    [1, 3],
    [0, 3],
    ['elderSign', 3],
    [-1, 1],
  ] as const) {
    const s = resolve(fight(setup('06195'), '06195'), token)
    expect(enemy(s).damageTaken, String(token)).toBe(damage)
    expect(s.assets['06195']!.uses).toBe(4)
  }
})

describe('Shotgun and Sawed-Off Shotgun', () => {
  it.each(['01029', '01529'])('%s: damage equals the margin, from 1 to 5', (code) => {
    let s = fight(setup(code), code)
    expect(skillTestValue(s).total).toBe(6)
    expect(enemy(resolve(s, 0)).damageTaken).toBe(4)
    s = fight(setup(code, { enemy: { ...sturdy, fight: 0 } }), code)
    expect(enemy(resolve(s, 1)).damageTaken).toBe(5)
    s = fight(setup(code, { enemy: { ...sturdy, fight: 6 } }), code)
    expect(enemy(resolve(s, 0)).damageTaken).toBe(1)
  })
  it('Sawed-Off caps at 6 and damages the other investigator by the failure margin', () => {
    let s = fight(setup('06327', { enemy: { ...sturdy, fight: 3 } }), '06327')
    expect(enemy(resolve(s, 0)).damageTaken).toBe(1)
    const engaged = setup('06327', {
      players: ['a', 'b'],
      engagedWith: 'b',
      enemy: { ...sturdy, fight: 12 },
    })
    s = resolve(fight(engaged, '06327'), 0)
    expect(s.investigators[1]!.damage).toBe(6)
    expect(enemy(s).damageTaken).toBe(0)
  })
})

describe('Colt Vest Pocket', () => {
  it('level 0 is discarded at the end of every round', () => {
    const s = roundEnds(setup('04268'))
    expect(s.assets['04268']).toBeUndefined()
    expect(me(s).discard).toContain('04268')
  })
  it('level 2 is discarded only if its ability was triggered this round', () => {
    expect(roundEnds(setup('53006')).assets['53006']).toBeDefined()
    let s = fight(setup('53006'), '53006')
    expect(skillTestValue(s).total).toBe(5)
    s = resolve(s)
    expect(enemy(s).damageTaken).toBe(2)
    expect(roundEnds(s).assets['53006']).toBeUndefined()
  })
})

it('.45 Thompson places spent ammo in your resource pool', () => {
  let s = fight(setup('05186'), '05186')
  expect(skillTestValue(s).total).toBe(5)
  s = resolve(s)
  expect(me(s).resources).toBe(6)
  expect(s.assets['05186']!.uses).toBe(4)
  expect(enemy(s).damageTaken).toBe(2)
})

describe('.25 Automatic (0)', () => {
  it('is Fast and only gets its bonus against an exhausted enemy', () => {
    const inHand = during(setup('05186', { enemy: null }), (x) =>
      patch({ hand: ['07025'], resources: 5 })(x),
    )
    expect(playableCards(inHand, 'a', true)).toContain('07025')
    let s = fight(setup('07025'), '07025')
    expect(skillTestValue(s).total).toBe(3)
    expect(enemy(resolve(s)).damageTaken).toBe(1)
    const tired = setup('07025', { engagedWith: null })
    s = during(tired, (x) => ({
      ...x,
      enemies: Object.fromEntries(
        Object.entries(x.enemies).map(([id, e]) => [id, { ...e, exhausted: true }]),
      ),
    }))
    s = fight(s, '07025')
    expect(skillTestValue(s).total).toBe(5)
    expect(enemy(resolve(s)).damageTaken).toBe(2)
  })
})

it('Crowbar investigates with combat or fights at +2, exhausting itself', () => {
  let s = investigate(setup('11021', { enemy: null }), '11021', 'combat')
  expect(s.skillTest?.skill).toBe('combat')
  s = resolve(s)
  expect(me(s).clues).toBe(1)
  expect(s.assets['11021']!.exhausted).toBe(true)
  s = fight(setup('11021'), '11021')
  expect(skillTestValue(s).total).toBe(5)
  expect(() => fight(resolve(s), '11021')).toThrow()
})

it('Luger P08 attacks as a fast ability and reloads for an action and a resource', () => {
  let s = fight(setup('11050'), '11050')
  expect(skillTestValue(s).total).toBe(4)
  s = resolve(s)
  expect(me(s).actionsRemaining).toBe(3)
  expect(s.assets['11050']).toMatchObject({ exhausted: true, uses: 1 })
  s = choose(s, 'ability.replenishAndReady', { card: 'Luger P08' })
  expect(s.assets['11050']).toMatchObject({ exhausted: false, uses: 2 })
  expect(me(s).resources).toBe(4)
  expect(me(s).actionsRemaining).toBe(2)
})

describe('Mauser C96', () => {
  it('level 0: success by 2 readies it or gains 1 resource', () => {
    let s = resolve(fight(setup('60306'), '60306'), 0)
    expect(s.pending?.question.prompt).toBe('prompt.optional')
    s = choose(s, 'choice.readyAsset', { card: 'Mauser C96' })
    expect(s.assets['60306']).toMatchObject({ exhausted: false, uses: 4 })
    s = choose(resolve(fight(setup('60306'), '60306'), 0), 'choice.gainResource')
    expect(me(s).resources).toBe(6)
    s = resolve(fight(setup('60306'), '60306'), -1)
    expect(s.assets['60306']!.exhausted).toBe(true)
    expect(enemy(s).damageTaken).toBe(2)
  })
  it('level 2: success by 4 does both', () => {
    const s = resolve(fight(setup('60321', { enemy: { ...sturdy, fight: 1 } }), '60321'), 0)
    expect(s.assets['60321']!.exhausted).toBe(false)
    expect(me(s).resources).toBe(6)
  })
})

it('Dragon Pole adds an arcane slot and scales with filled arcane slots', () => {
  let s = setup('08060')
  expect(slotCapacity(s, 'a', 'arcane')).toBe(3)
  expect(skillTestValue(fight(s, '08060')).total).toBe(3)
  s = during(s, (x) => withAsset(withAsset(x, '01060'), '60407'))
  s = fight(s, '08060')
  expect(skillTestValue(s).total).toBe(5)
  expect(enemy(resolve(s)).damageTaken).toBe(2)
})
