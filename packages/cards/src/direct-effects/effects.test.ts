import { playableCards, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { patch, withAsset } from '../dunwich-pilot/testing'
import { enemy, holding, me, play, resolve, sturdy } from './testing'

const set = (s: GameState, changes: Parameters<typeof patch>[0]) => during(s, patch(changes))

// RR: Fast, Reactions, Damage, Defeat, Heal, Doom, Actions.
it('"If it bleeds..." heals each investigator here the horror of a defeated Monster', () => {
  let s = set(
    holding('02225', {
      enemy: { ...sturdy, health: 1, horror: 2, traits: ['Monster'] },
      players: ['a', 'b'],
    }),
    {
      horror: 3,
    },
  )
  s = during(s, patch({ horror: 2 }, 'b'))
  s = during(s, (x) => x, {
    type: 'DamageEnemy',
    enemy: Object.keys(s.enemies)[0]!,
    amount: 1,
    by: 'a',
  })
  s = choose(s, 'ability.playCard', { card: '"If it bleeds..."' })
  expect(me(s).horror).toBe(1)
  expect(s.investigators[1]!.horror).toBe(0)
  const human = set(holding('02225', { enemy: { ...sturdy, health: 1, traits: ['Humanoid'] } }), {})
  const after = during(human, (x) => x, {
    type: 'DamageEnemy',
    enemy: Object.keys(human.enemies)[0]!,
    amount: 1,
    by: 'a',
  })
  expect(after.pending?.question.choices.map((c) => c.label)).not.toContain('ability.playCard')
})

describe('Mano a Mano', () => {
  it('deals 1 damage to an engaged enemy as your first action without provoking', () => {
    const s = play(holding('03229'), '03229')
    expect(enemy(s).damageTaken).toBe(1)
    expect(me(s)).toMatchObject({ damage: 0, horror: 0 })
    const later = set(holding('03229'), { actionsTaken: 1 })
    expect(playableCards(later, 'a', false)).not.toContain('03229')
  })
})

describe('Coup de Grâce', () => {
  it('deals 1 damage, draws if it defeats the enemy and ends your turn', () => {
    let s = set(holding('04269', { enemy: { ...sturdy, health: 1 } }), { deck: ['x', 'y'] })
    const round = s.round
    const target = Object.keys(s.enemies)[0]!
    s = play(s, '04269')
    // A new round has begun, so the mythos phase may have spawned another enemy.
    expect(s.enemies[target]).toBeUndefined()
    expect(me(s).hand).toContain('x')
    expect(s.round).toBe(round + 1)
    s = play(holding('04269'), '04269')
    expect(enemy(s).damageTaken).toBe(1)
  })
})

it('Pay Day gains a resource per action this turn, including itself, and ends your turn', () => {
  let s = set(holding('04233', { enemy: null }), { actionsTaken: 2, resources: 0 })
  const round = s.round
  s = play(s, '04233')
  // 3 from Pay Day (two earlier actions and itself) plus 1 in the upkeep of the closed round.
  expect(me(s).resources).toBe(4)
  expect(s.round).toBe(round + 1)
})

it('Sacrifice discards a Mystic asset, then draws or gains 3 in any combination', () => {
  let s = during(
    set(holding('04234', { enemy: null }), { resources: 0, deck: ['x', 'y', 'z'] }),
    (x) => withAsset(x, '01060'),
  )
  s = play(s, '04234')
  expect(s.assets['01060']).toBeUndefined()
  s = choose(s, 'choice.drawCards', { n: 1 })
  s = choose(s, 'choice.eventResources', { n: 1 })
  s = choose(s, 'choice.eventResources', { n: 1 })
  expect(me(s).hand).toEqual(['x'])
  expect(me(s).resources).toBe(2)
  expect(playableCards(holding('04234', { enemy: null }), 'a', false)).not.toContain('04234')
})

it('Moonlight Ritual removes all doom from your investigator or an asset you control', () => {
  let s = during(set(holding('02267', { enemy: null }), { doom: 2 }), (x) =>
    withAsset(x, '01060', { doom: 1 }),
  )
  s = play(s, '02267')
  s = choose(s, 'choice.investigator', { name: 'A' })
  expect(me(s).doom).toBe(0)
  expect(s.assets['01060']!.doom).toBe(1)
  expect(playableCards(holding('02267', { enemy: null }), 'a', false)).not.toContain('02267')
})

describe('Waylay and Eavesdrop', () => {
  it('Waylay tests agility against an exhausted non-Elite enemy and defeats it', () => {
    const exhausted = (x: GameState) => ({
      ...x,
      enemies: Object.fromEntries(
        Object.entries(x.enemies).map(([id, e]) => [id, { ...e, exhausted: true }]),
      ),
    })
    let s = during(holding('03237', { engagedWith: null }), exhausted)
    s = play(s, '03237')
    expect(s.skillTest?.skill).toBe('agility')
    s = resolve(s)
    expect(Object.keys(s.enemies)).toHaveLength(0)
    expect(playableCards(holding('03237'), 'a', false)).not.toContain('03237')
  })
  it('Eavesdrop tests intellect against an unengaged enemy to discover 2 clues', () => {
    let s = play(
      holding('04027', { engagedWith: null, enemy: { ...sturdy, keywords: ['aloof'] } }),
      '04027',
    )
    expect(s.skillTest?.skill).toBe('intellect')
    s = resolve(s)
    expect(me(s).clues).toBe(2)
    expect(playableCards(holding('04027'), 'a', false)).not.toContain('04027')
  })
})

it('Meditative Trance heals 1 damage or horror per filled arcane slot', () => {
  let s = during(set(holding('08061', { enemy: null }), { damage: 2, horror: 1 }), (x) =>
    withAsset(withAsset(x, '01060'), '01060', { id: 'second' }),
  )
  s = play(s, '08061')
  s = choose(s, 'choice.healHorror')
  // Only damage is left, so the second point heals it without asking.
  expect(me(s)).toMatchObject({ damage: 1, horror: 0 })
  expect(
    playableCards(set(holding('08061', { enemy: null }), { damage: 1 }), 'a', false),
  ).not.toContain('08061')
})
