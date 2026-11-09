// RR: Weakness, Immune, Elusive, Hunter, Prey, Retaliate, Forced Abilities.
import {
  attackBlocked,
  availableActions,
  dispatch,
  enemyBehavior,
  immuneToPlayerCards,
  playerCardBehavior,
  type EnemyCard,
  type GameState,
} from '@lcg/engine'
import { choose, during, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me } from '../dunwich-pilot/testing'
import { BLOOD_DRINKER, FELINE_HYBRID, MIGUEL, makeGame, withMiguel } from './testing'

const card = (code: string) => playerCardBehavior(code)!.enemy as EnemyCard
const only = (s: GameState) => Object.values(s.enemies)[0]!

describe('60553: Feline Hybrid', () => {
  it('has its printed keywords and preys only on Miguel', () => {
    expect(card(FELINE_HYBRID)).toMatchObject({
      fight: 3,
      health: 2,
      evade: 3,
      damage: 1,
      horror: 1,
      keywords: ['elusive', 'hunter'],
      prey: { type: 'only', investigator: MIGUEL },
    })
    expect(enemyBehavior(FELINE_HYBRID)?.immuneToPlayerCards).toBe(true)
  })

  it('is immune to player card effects but can be attacked with a basic fight action', () => {
    let s = dispatch({ ...makeGame(), pending: null }, spawnAt('A', card(FELINE_HYBRID), MIGUEL), {
      type: 'PlayerWindow',
      investigator: MIGUEL,
    })
    const e = only(s)
    expect(immuneToPlayerCards(e)).toBe(true)
    expect(attackBlocked(s, MIGUEL, e)).toBe(false)
    expect(attackBlocked(s, MIGUEL, e, '60564')).toBe(true)
    expect(availableActions(s, MIGUEL)).toContainEqual({ kind: 'fight', enemy: e.id })
    // Damage dealt by a player card effect does not affect it.
    s = during(s, (x) => x, {
      type: 'DamageEnemy',
      enemy: e.id,
      amount: 2,
      by: MIGUEL,
      source: { code: '60581' },
    })
    expect(only(s).damageTaken).toBe(0)
    expect(s.log.some((l) => l.key === 'log.enemyImmunePlayerCards')).toBe(true)
  })

  it('a successful basic attack damages it and it retreats (Elusive)', () => {
    let s = dispatch(
      { ...withMiguel(makeGame(false, [0]), { hand: [] }), pending: null },
      spawnAt('A', card(FELINE_HYBRID), MIGUEL),
      { type: 'PlayerWindow', investigator: MIGUEL },
    )
    s = choose(s, 'action.fight', { enemy: 'Feline Hybrid' })
    expect(only(s).damageTaken).toBe(1)
    expect(only(s).location).toBe('B')
    expect(only(s).exhausted).toBe(true)
  })
})

describe('60554: Blood Drinker', () => {
  it('has Hunter and Retaliate', () => {
    expect(card(BLOOD_DRINKER)).toMatchObject({
      fight: 2,
      health: 3,
      evade: 4,
      damage: 1,
      horror: 1,
      keywords: ['hunter', 'retaliate'],
    })
  })

  it('heals 1 damage from itself after it attacks', () => {
    let s = during(game(), (x) => x, spawnAt('A', card(BLOOD_DRINKER), 'a'))
    const id = only(s).id
    s = during(s, (x) => x, { type: 'DamageEnemy', enemy: id, amount: 2 })
    expect(only(s).damageTaken).toBe(2)
    s = during(s, (x) => x, {
      type: 'EnemyAttack',
      enemy: id,
      investigator: 'a',
      exhaustAfter: true,
    })
    expect(only(s).damageTaken).toBe(1)
    expect(me(s).damage + me(s).horror).toBe(2)
  })
})
