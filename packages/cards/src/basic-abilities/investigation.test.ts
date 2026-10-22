import { skillTestValue, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { me } from '../dunwich-pilot/testing'
import { enemy, investigate, resolve, setup } from './testing'

const clean = (code: string, asset = {}) => setup(code, { enemy: null, asset })
const shroud = (s: GameState, value: number) =>
  during(s, (x) => ({
    ...x,
    locations: { ...x.locations, A: { ...x.locations.A!, shroud: value } },
  }))

// RR: Investigate, Uses, Exhaust; shroud A = 2, investigator skills = 3.
describe('Burglary', () => {
  it.each(['01045', '01545'])('%s gains 3 resources instead of discovering clues', (code) => {
    const s = resolve(investigate(clean(code), code))
    expect(me(s)).toMatchObject({ resources: 8, clues: 0 })
    expect(s.assets[code]!.exhausted).toBe(true)
  })
  it('level 2 gains 2 resources plus 1 per point succeeded by, up to +3', () => {
    expect(me(resolve(investigate(shroud(clean('06200'), 3), '06200'))).resources).toBe(7)
    expect(me(resolve(investigate(clean('06200'), '06200'))).resources).toBe(8)
    expect(me(resolve(investigate(shroud(clean('06200'), 0), '06200'), 1)).resources).toBe(10)
  })
})

describe('Lockpicks', () => {
  it.each(['60305', '60361'])('%s adds agility and is discarded below a margin of 2', (code) => {
    let s = investigate(clean(code), code)
    expect(skillTestValue(s).total).toBe(6)
    s = resolve(s)
    expect(s.assets[code]!.exhausted).toBe(true)
    s = resolve(investigate(shroud(clean(code), 5), code))
    expect(s.assets[code]).toBeUndefined()
    expect(me(s).discard).toContain(code)
  })
  it.each(['03031', '01687', '60372'])(
    '%s loses a supply instead, and is discarded at 0',
    (code) => {
      expect(resolve(investigate(clean(code), code)).assets[code]!.uses).toBe(3)
      expect(resolve(investigate(shroud(clean(code), 5), code)).assets[code]!.uses).toBe(2)
      const last = resolve(investigate(shroud(clean(code, { uses: 1 }), 5), code))
      expect(last.assets[code]).toBeUndefined()
    },
  )
})

describe('Lantern', () => {
  it.each(['03036', '52009'])('%s investigates at -1 shroud', (code) => {
    const s = investigate(clean(code), code)
    expect(s.skillTest?.difficulty).toBe(1)
  })
  it('level 0 is discarded to deal 1 damage without provoking', () => {
    const s = choose(setup('03036'), 'ability.lanternDiscard', { card: 'Lantern', enemy: 'Ghoul' })
    expect(enemy(s).damageTaken).toBe(1)
    expect(me(s).damage).toBe(0)
    expect(me(s).discard).toContain('03036')
  })
  it('level 2 may be removed from the game to deal 2 damage', () => {
    const s = choose(setup('52009'), 'ability.lanternRemove', { card: 'Lantern', enemy: 'Ghoul' })
    expect(enemy(s).damageTaken).toBe(2)
    expect(s.assets['52009']).toBeUndefined()
    expect(me(s).discard).not.toContain('52009')
  })
})

describe('Old Keyring', () => {
  it('level 0: -2 shroud, a success removes a key and the last one discards it', () => {
    let s = investigate(clean('60507'), '60507')
    expect(s.skillTest?.difficulty).toBe(0)
    s = resolve(s)
    expect(s.assets['60507']!.uses).toBe(1)
    expect(me(s).clues).toBe(1)
    expect(
      resolve(investigate(clean('60507', { uses: 1 }), '60507')).assets['60507'],
    ).toBeUndefined()
    expect(resolve(investigate(shroud(clean('60507'), 6), '60507')).assets['60507']!.uses).toBe(2)
  })
  it('level 3 discovers 1 more clue only when the difficulty is 0', () => {
    expect(me(resolve(investigate(clean('09117'), '09117'))).clues).toBe(2)
    expect(me(resolve(investigate(shroud(clean('09117'), 3), '09117'))).clues).toBe(1)
  })
})

it('Grim Memoir: +2 and an optional draw when succeeding by 2', () => {
  let s = investigate(clean('09044'), '09044')
  expect(skillTestValue(s).total).toBe(5)
  const hand = me(s).hand.length
  s = choose(resolve(s), 'choice.drawCards', { n: 1 })
  expect(me(s).hand.length).toBe(hand + 1)
  s = resolve(investigate(shroud(clean('09044'), 4), '09044'))
  expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
})

it('Otherworldly Compass reduces the shroud by revealed connected locations', () => {
  let s = clean('04194')
  expect(investigate(s, '04194').skillTest?.difficulty).toBe(2)
  s = during(s, (x) => ({
    ...x,
    locations: { ...x.locations, B: { ...x.locations.B!, revealed: true } },
  }))
  expect(investigate(s, '04194').skillTest?.difficulty).toBe(1)
})

describe('Forensic Kit', () => {
  it('may use agility at +1 and heals 1 horror with an exhausted enemy here', () => {
    const hurt = (s: GameState) =>
      during(s, (x) => ({ ...x, investigators: x.investigators.map((i) => ({ ...i, horror: 2 })) }))
    let s = investigate(hurt(clean('11036')), '11036', 'agility')
    expect(skillTestValue(s).total).toBe(4)
    expect(me(resolve(s)).horror).toBe(2)
    s = hurt(setup('11036', { engagedWith: null }))
    s = during(s, (x) => ({
      ...x,
      enemies: Object.fromEntries(
        Object.entries(x.enemies).map(([id, e]) => [id, { ...e, exhausted: true }]),
      ),
    }))
    expect(me(resolve(investigate(s, '11036'))).horror).toBe(1)
  })
})

describe('Chemistry Set', () => {
  // Skill 3 with a -1 token: the shroud sets the exact margin.
  it.each([
    [4, 'discard'],
    [3, 'none'],
    [2, 'resources'],
    [0, 'draw'],
  ] as const)('shroud %i: %s', (value, effect) => {
    const before = clean('10040')
    const s = resolve(investigate(shroud(before, value), '10040'), -1)
    if (effect === 'discard') expect(s.assets['10040']).toBeUndefined()
    else expect(s.assets['10040']!.exhausted).toBe(true)
    expect(me(s).resources - me(before).resources).toBe(effect === 'resources' ? 2 : 0)
    expect(me(s).hand.length - me(before).hand.length).toBe(effect === 'draw' ? 1 : 0)
  })
  it('discovers 1 more clue when succeeding by exactly 4', () => {
    const s = resolve(investigate(shroud(clean('10040'), 0), '10040'), 1)
    expect(me(s).clues).toBe(2)
  })
})
