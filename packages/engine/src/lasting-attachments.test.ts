import { describe, expect, it } from 'vitest'
import { dispatch } from './engine'
import { attachedStat, enemyHasKeyword, enemyMaxHealth } from './state'
import { during, ghoul, newTestGame, spawnAt } from './testing'
import type { EnemyModifier, GameState, Message } from './types'

// RR Lasting effects (lot 136): enemy modifiers end with their round, phase, turn or the next
// attack against the enemy; "to a minimum of" floors only the reduction.
const start = () =>
  during({ ...newTestGame(), interactive: true }, (s) => s, spawnAt('B', { ...ghoul, health: 4 }))
const enemyId = (s: GameState) => Object.keys(s.enemies)[0]!
const send = (s: GameState, ...messages: Message[]): GameState => {
  const next = dispatch({ ...s, pending: null, queue: [] }, ...messages)
  return { ...next, pending: s.pending, queue: s.queue }
}
const add = (s: GameState, modifier: Omit<EnemyModifier, 'round' | 'phase' | 'turn'>) =>
  send(s, { type: 'AddEnemyModifier', enemy: enemyId(s), modifier })

describe('Modificadores temporales de Enemigo', () => {
  it('caducan al acabar su ronda o su fase', () => {
    let s = add(start(), { source: 'x', until: 'round', fight: -1, loses: ['hunter'] })
    s = add(s, { source: 'y', until: 'phase', evade: -2 })
    expect(attachedStat(s, enemyId(s), 'fight')).toBe(-1)
    expect(attachedStat(s, enemyId(s), 'evade')).toBe(-2)
    const enemyPhase = { ...s, phase: 'enemy' as const }
    expect(attachedStat(enemyPhase, enemyId(s), 'evade')).toBe(0)
    expect(attachedStat(enemyPhase, enemyId(s), 'fight')).toBe(-1)
    expect(attachedStat({ ...s, round: s.round + 1 }, enemyId(s), 'fight')).toBe(0)
    const hunter = {
      ...s,
      enemies: { [enemyId(s)]: { ...s.enemies[enemyId(s)]!, keywords: ['hunter' as const] } },
    }
    expect(enemyHasKeyword(hunter, hunter.enemies[enemyId(s)]!, 'hunter')).toBe(false)
  })

  it('el siguiente ataque consume el modificador y el mínimo limita la reducción', () => {
    let s = add(start(), { source: 'x', until: 'nextAttack', fightSetTo: 0 })
    expect(attachedStat(s, enemyId(s), 'fight')).toBe(-2)
    s = add(s, { source: 'w', until: 'round', health: -5, minimum: 1 })
    expect(enemyMaxHealth(s, s.enemies[enemyId(s)]!)).toBe(1)
    s = send(s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'combat',
      difficulty: 2,
      kind: { type: 'fight', enemy: enemyId(s) },
    })
    expect(s.skillTest?.difficulty).toBe(0)
    s = send(s, { type: 'EndSkillTest' })
    expect(attachedStat(s, enemyId(s), 'fight')).toBe(0)
  })
})
