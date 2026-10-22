import { dispatch, playableCards, skillTestValue, type GameState } from '@lcg/engine'
import { choose, ghoul } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { me } from '../dunwich-pilot/testing'
import { evade } from '../basic-abilities/testing'
import { setup } from '../basic-abilities/testing'
import { enemy, holding, play, resolve, sturdy } from './testing'

const endTurn = (s: GameState) =>
  dispatch({ ...s, pending: null, queue: [] }, { type: 'EndTurn', investigator: 'a' })

// RR: Evade, Attacks of Opportunity (an evade event does not provoke).
describe.each([
  ['01066', 1, 0],
  ['01566', 1, 0],
  ['01069', 2, 1],
  ['01569', 2, 1],
] as const)('%s Blinding Light', (code, damage, horror) => {
  it('evades with willpower and damages the evaded enemy without provoking', () => {
    let s = play(holding(code), code)
    expect(s.skillTest?.skill).toBe('willpower')
    expect(me(s).damage).toBe(0)
    s = resolve(s)
    expect(enemy(s)).toMatchObject({ engagedWith: null, damageTaken: damage })
    expect(me(s).actionsRemaining).toBe(2)
  })
  it('costs an action this turn on a symbol', () => {
    const s = resolve(play(holding(code), code), 'skull')
    expect(me(s).actionsRemaining).toBe(1)
    expect(me(s).horror).toBe(horror)
  })
})

it.each(['01078', '01578'])(
  '%s Cunning Distraction evades every enemy at your location',
  (code) => {
    let s = holding(code, { players: ['a', 'b'] })
    s = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'SpawnEnemy', card: ghoul, location: 'A', engageWith: 'b' },
      { type: 'PlayerWindow', investigator: 'a' },
    )
    s = play(s, code)
    expect(Object.values(s.enemies).every((e) => e.exhausted && e.engagedWith === null)).toBe(true)
    expect(playableCards(holding(code, { enemy: null }), 'a', false)).not.toContain(code)
  },
)

describe('Slip Away', () => {
  it.each(['04232', '60314'])(
    '%s adds intellect; by 2 a non-Elite enemy stays exhausted',
    (code) => {
      let s = play(holding(code), code)
      expect(skillTestValue(s).total).toBe(6)
      s = resolve(s)
      expect(enemy(s).stayExhausted).toBe(true)
      s = resolve(play(holding(code, { enemy: { ...sturdy, evade: 5 } }), code))
      expect(enemy(s).stayExhausted).toBeUndefined()
      s = resolve(play(holding(code, { enemy: { ...sturdy, traits: ['Elite'] } }), code))
      expect(enemy(s).stayExhausted).toBeUndefined()
    },
  )
  it('level 2 works by 1 and returns to hand at the end of the turn by 3', () => {
    let s = resolve(play(holding('60324', { enemy: { ...sturdy, evade: 5 } }), '60324'))
    expect(enemy(s).stayExhausted).toBe(true)
    expect(me(endTurn(s)).hand).not.toContain('60324')
    s = resolve(play(holding('60324'), '60324'))
    expect(me(endTurn(s)).hand).toContain('60324')
  })
})

it('Sneak By gains 2 resources when the action begins, even on failure', () => {
  const s = resolve(play(holding('60316', { enemy: { ...sturdy, evade: 9 } }), '60316'))
  expect(me(s).resources).toBe(10 - 0 + 2)
  expect(enemy(s).engagedWith).toBe('a')
})

describe("Bum's Rush", () => {
  it('adds combat; by 2 deals 1 damage and may move a non-Elite enemy', () => {
    let s = resolve(play(holding('11055'), '11055'))
    expect(enemy(s).damageTaken).toBe(1)
    s = choose(s, 'choice.moveEnemy', { enemy: 'Ghoul', location: 'Room B' })
    expect(enemy(s).location).toBe('B')
    s = resolve(play(holding('11055', { enemy: { ...sturdy, evade: 5 } }), '11055'))
    expect(enemy(s).damageTaken).toBe(0)
    s = resolve(play(holding('11055', { enemy: { ...sturdy, traits: ['Elite'] } }), '11055'))
    expect(enemy(s)).toMatchObject({ damageTaken: 1, location: 'A' })
  })
})

describe.each([
  ['04029', 0],
  ['53007', 1],
  ['04271', 3],
] as const)("%s Mists of R'lyeh", (code, bonus) => {
  it('evades with willpower, may move, and a symbol discards a card from hand', () => {
    let s = evade(setup(code), code, 'willpower')
    expect(skillTestValue(s).total).toBe(3 + bonus)
    s = resolve(s)
    expect(s.pending?.question.prompt).toBe('prompt.chooseMove')
    s = choose(s, 'action.move', { location: 'Room B' })
    expect(me(s).location).toBe('B')
    const base = setup(code)
    s = resolve(
      evade(
        { ...base, investigators: base.investigators.map((i) => ({ ...i, hand: ['x-card'] })) },
        code,
        'willpower',
      ),
      'autoFail',
    )
    expect(me(s).discard).toContain('x-card')
  })
})
