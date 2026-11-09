// RR: Weakness, Immune, Elusive, Hunter, Prey, Retaliate, Forced Abilities.
import {
  attackBlocked,
  attackDamage,
  availableActions,
  dispatch,
  enemyBehavior,
  immuneToPlayerCards,
  playerCardBehavior,
  type EnemyCard,
  type GameState,
  type Message,
  type SkillTest,
} from '@lcg/engine'
import { choose, during, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { code } from '../core-2026/player-cards'
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

  it('ignores evading, exhausting, disengaging and moving effects from player cards', () => {
    let s = dispatch({ ...makeGame(), pending: null }, spawnAt('A', card(FELINE_HYBRID), MIGUEL), {
      type: 'PlayerWindow',
      investigator: MIGUEL,
    })
    const e = only(s)
    const fromCard = { effectSource: '60565' }
    s = during(s, (x) => x, { type: 'EvadeEnemy', enemy: e.id, ...fromCard } as Message)
    s = during(s, (x) => x, { type: 'ExhaustEnemy', enemy: e.id, ...fromCard } as Message)
    s = during(s, (x) => x, { type: 'DisengageEnemy', enemy: e.id, ...fromCard } as Message)
    s = during(s, (x) => x, {
      type: 'MoveEnemy',
      enemy: e.id,
      location: 'B',
      ...fromCard,
    } as Message)
    expect(only(s)).toMatchObject({ location: 'A', exhausted: false, engagedWith: MIGUEL })
    // The same effects without a player card source still apply.
    s = during(s, (x) => x, { type: 'EvadeEnemy', enemy: e.id } as Message)
    expect(only(s)).toMatchObject({ exhausted: true, engagedWith: null })
  })

  it('a committed skill adds no damage to a basic attack against it', () => {
    const s = dispatch(
      { ...makeGame(), pending: null },
      spawnAt('A', card(FELINE_HYBRID), MIGUEL),
      {
        type: 'PlayerWindow',
        investigator: MIGUEL,
      },
    )
    const e = only(s)
    const brutal = code(25)
    expect(playerCardBehavior(brutal)?.committedAttackDamage).toBeDefined()
    const test = {
      investigator: MIGUEL,
      kind: { type: 'fight', enemy: e.id },
      difficulty: 3,
      modifiedSkill: 5,
      succeeded: true,
      tokens: [],
      committed: [{ code: brutal, by: MIGUEL }],
    } as unknown as SkillTest
    expect(attackDamage(s, test)).toBe(1)
    // Control: the same commit adds its damage against an enemy without that immunity.
    const plain = { ...s, enemies: { [e.id]: { ...e, code: BLOOD_DRINKER } } }
    expect(attackDamage(plain, test)).toBe(2)
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
