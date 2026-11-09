// RR: Search, Drawing Encounter Cards, Spawn, Move, Fight, Evade, Engagement.
import type { GameState } from '@lcg/engine'
import { choose, during, ghoul, labels, spawnAt, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch } from '../dunwich-pilot/testing'
import { GUERRILLA_TACTICS_2, STALK_PREY, name, sturdy } from './testing'

const enemy = (s: GameState) => Object.values(s.enemies)[0]!
const stranger = { ...ghoul, code: 'test-stranger', name: 'Stranger', spawnAt: 'C' }

describe('60567: Stalk Prey', () => {
  it('draws the chosen enemy of the top 9, then draws 1 card and discovers 1 clue', () => {
    let s = during(game(), (s) => ({
      ...patch({ hand: [STALK_PREY], resources: 10 })(s),
      encounterDeck: [{ ...ghoul, code: 'x', name: 'Other' }, ghoul, ...s.encounterDeck],
    }))
    const deck = me(s).deck.length
    s = choose(s, 'action.play', { card: name(STALK_PREY) })
    s = choose(s, 'choice.zealot.searchDeckEnemy', { enemy: 'Ghoul' })
    expect(enemy(s)).toMatchObject({ name: 'Ghoul', location: 'A', engagedWith: 'a' })
    expect(me(s).deck.length).toBe(deck - 1)
    expect(me(s).clues).toBe(1)
    // That enemy is at his location: no movement is offered.
    expect(labels(s)).not.toContain('choice.pilotMove')
  })

  it('may move once toward the drawn enemy when it spawns elsewhere', () => {
    let s = during(game(), (s) => ({
      ...patch({ hand: [STALK_PREY], resources: 10 })(s),
      encounterDeck: [stranger],
    }))
    s = choose(s, 'action.play', { card: name(STALK_PREY) })
    expect(enemy(s).location).toBe('C')
    s = choose(s, 'choice.pilotMove', { location: 'Room B' })
    expect(me(s).location).toBe('B')
  })

  it('still draws and discovers a clue when there is no enemy in the top 9', () => {
    let s = during(game(), (s) => ({
      ...patch({ hand: [STALK_PREY], resources: 10 })(s),
      encounterDeck: [],
    }))
    s = choose(s, 'action.play', { card: name(STALK_PREY) })
    expect(Object.keys(s.enemies)).toEqual([])
    expect(me(s).clues).toBe(1)
  })
})

describe('60576: Guerrilla Tactics (2)', () => {
  it('attacks an enemy at a connecting location with +2 and deals 1 additional damage', () => {
    let s = during(
      game(),
      (s) =>
        patch({
          hand: [GUERRILLA_TACTICS_2],
          resources: 10,
          skills: { willpower: 3, intellect: 3, combat: 1, agility: 3 },
        })(withBag(0)(s)),
      spawnAt('B', sturdy),
    )
    s = choose(s, 'action.play', { card: name(GUERRILLA_TACTICS_2) })
    s = choose(s, 'choice.guerrillaFight', { enemy: 'Brute', location: 'Room B' })
    expect(enemy(s).damageTaken).toBe(2)
  })

  it('evading successfully also deals 1 damage to that enemy', () => {
    let s = during(
      game(),
      (s) => patch({ hand: [GUERRILLA_TACTICS_2], resources: 10 })(withBag(0)(s)),
      spawnAt('B', sturdy),
    )
    s = choose(s, 'action.play', { card: name(GUERRILLA_TACTICS_2) })
    s = choose(s, 'choice.guerrillaEvade', { enemy: 'Brute', location: 'Room B' })
    expect(enemy(s)).toMatchObject({ exhausted: true, damageTaken: 1 })
  })

  it('cannot target an enemy at a location that is not connecting', () => {
    const s = during(
      game(),
      (s) => patch({ hand: [GUERRILLA_TACTICS_2], resources: 10 })(s),
      spawnAt('C', sturdy),
    )
    expect(labels(s)).not.toContain('action.play')
  })
})
