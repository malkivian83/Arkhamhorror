import { playableCards, playerCardBehavior } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch } from '../dunwich-pilot/testing'
import './index'

// RR: Fast, Reaction windows ("Play after…"): played from hand by the investigator concerned.
describe.each(['01022', '01522'])('%s Evidence!', (code) => {
  it('discovers 1 clue at your location after you defeat an enemy', () => {
    let s = during(
      game(),
      patch({ hand: [code], resources: 1 }),
      spawnAt('A', { ...ghoul, health: 1 }, 'a'),
    )
    const enemy = Object.keys(s.enemies)[0]!
    s = during(s, (s) => s, { type: 'DamageEnemy', enemy, amount: 1, by: 'a' })
    s = choose(s, 'ability.playCard', { card: 'Evidence!' })
    expect(me(s)).toMatchObject({ clues: 1, resources: 0, actionsRemaining: 3 })
    expect(me(s).discard).toContain(code)
  })
  it('is not offered for another investigator defeat or in an ordinary fast window', () => {
    const s = during(game(), patch({ hand: [code] }), spawnAt('A', ghoul, 'a'))
    const enemy = Object.values(s.enemies)[0]!
    expect(
      playerCardBehavior(code)!.handReactions!(s, { type: 'enemyDefeated', enemy, by: 'b' }, 'a'),
    ).toEqual([])
    expect(playableCards(s, 'a', true)).not.toContain(code)
  })
})

describe('Lesson Learned', () => {
  it('discovers 2 clues after you take damage from an enemy attack', () => {
    let s = during(game(), patch({ hand: ['60124'], resources: 1 }), spawnAt('A', ghoul, 'a'))
    const enemy = Object.keys(s.enemies)[0]!
    s = during(s, (s) => s, {
      type: 'EnemyAttack',
      enemy,
      investigator: 'a',
      exhaustAfter: false,
    })
    while (s.pending && !s.pending.question.choices.some((c) => c.label === 'ability.playCard'))
      s = choose(s, s.pending.question.choices[0]!.label, s.pending.question.choices[0]!.params)
    s = choose(s, 'ability.playCard', { card: 'Lesson Learned' })
    expect(me(s).clues).toBe(2)
  })
  it('is not offered for horror only, for damage outside an attack or for others', () => {
    const s = during(game(), patch({ hand: ['60124'] }), spawnAt('A', ghoul, 'a'))
    const enemy = Object.keys(s.enemies)[0]!
    const offer = (
      t: Parameters<NonNullable<ReturnType<typeof playerCardBehavior>>['handReactions'] & {}>[1],
    ) => playerCardBehavior('60124')!.handReactions!(s, t, 'a')
    expect(
      offer({ type: 'afterTakeDamage', investigator: 'a', damage: 0, horror: 1, enemy }),
    ).toEqual([])
    expect(offer({ type: 'afterTakeDamage', investigator: 'a', damage: 1, horror: 0 })).toEqual([])
    expect(
      offer({ type: 'afterTakeDamage', investigator: 'b', damage: 1, horror: 0, enemy }),
    ).toEqual([])
    expect(
      offer({ type: 'afterTakeDamage', investigator: 'a', damage: 1, horror: 0, enemy }),
    ).toHaveLength(1)
  })
})
