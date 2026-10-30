import { playableCards, playerCardDef, type GameState } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, hand, me, patch, play, withAsset } from '../dunwich-pilot/testing'

const enemy = (s: GameState, name: string) => Object.values(s.enemies).find((e) => e.name === name)!
const playCard = (s: GameState, code: string) =>
  choose(s, 'ability.playCard', { card: playerCardDef(code)!.name })
const weak = { willpower: 0, intellect: 0, combat: 0, agility: 0 }

describe('60164 / 60174: Physical Fitness', () => {
  // RR: Move designator; Healing. The move and the healing differ only in amount.
  it.each([
    ['60164', 2, 2],
    ['60174', 3, 1],
  ])('%s moves, then heals %i damage', (code, healed, cost) => {
    const s = play(during(game(), patch({ damage: 4 })), code)
    expect(me(s).location).toBe('B')
    expect(me(s).damage).toBe(4 - healed)
    expect(me(s).resources).toBe(10 - cost)
    expect(me(s).actionsRemaining).toBe(2)
  })
  it('heals only after moving, after an engaged enemy follows', () => {
    const s = play(during(game(), patch({ damage: 1 }), spawnAt('A', ghoul, 'a')), '60164')
    expect(me(s).location).toBe('B')
    expect(me(s).damage).toBe(0)
    expect(Object.values(s.enemies)[0]!.location).toBe('B')
  })
  it('cannot be played without a location to move to', () => {
    const s = hand(
      during(game(), (s) => ({
        ...s,
        locations: { ...s.locations, A: { ...s.locations.A!, connections: [] } },
      })),
      '60174',
    )
    expect(playableCards(s, 'a', false)).not.toContain('60174')
  })
})

describe('60320: Liquid Courage (1)', () => {
  // RR: Skill Tests. Success draws a card instead of healing more.
  it('heals 1 horror and the patient draws on success', () => {
    let s = during(game(['a', 'b']), (s) =>
      withAsset(patch({ horror: 3, deck: ['x', 'y'] }, 'b')(s), '60320'),
    )
    const before = s.investigators[1]!.hand.length
    s = choose(s, 'ability.pilotCourage', { name: 'B' })
    expect(s.investigators[1]!.horror).toBe(2)
    expect(s.investigators[1]!.hand).toHaveLength(before + 1)
    expect(s.investigators[1]!.hand.at(-1)).toBe('x')
    expect(s.assets['60320']!.uses).toBe(3)
  })
  // RR: Random. Failure heals the additional horror and discards at random.
  it('heals twice and discards at random on failure', () => {
    let s = during(game(['a', 'b']), (s) =>
      withAsset(patch({ horror: 3, hand: ['one', 'two'], skills: weak }, 'b')(s), '60320'),
    )
    s = choose(s, 'ability.pilotCourage', { name: 'B' })
    expect(s.investigators[1]!.horror).toBe(1)
    expect(s.investigators[1]!.hand).toHaveLength(1)
    expect(s.investigators[1]!.discard).toHaveLength(1)
  })
})

describe('51006: Think on Your Feet (2)', () => {
  // RR: Fast; Move. It answers an enemy entering, not only a spawn, and leaves it behind.
  it('moves away from a spawning enemy, which stays unengaged', () => {
    let s = during(hand(game(), '51006'), (s) => s, spawnAt('A', ghoul))
    s = playCard(s, '51006')
    expect(me(s).location).toBe('B')
    expect(Object.values(s.enemies)[0]).toMatchObject({ location: 'A', engagedWith: null })
    expect(me(s).resources).toBe(10)
  })
  it('moves away from a hunter that entered and engaged', () => {
    let s = during(
      hand(game(), '51006'),
      (s) => s,
      spawnAt('C', { ...ghoul, keywords: ['hunter'] }),
    )
    s = during(s, (s) => ({ ...s, phase: 'enemy' }), { type: 'HuntersMove' })
    expect(me(s).location).toBe('A')
    s = during(s, (s) => s, { type: 'HuntersMove' })
    s = playCard(s, '51006')
    expect(me(s).location).toBe('B')
    expect(Object.values(s.enemies)[0]).toMatchObject({ location: 'A', engagedWith: null })
  })
  it('is not offered for an enemy entering another location', () => {
    const s = during(hand(game(), '51006'), (s) => s, spawnAt('C', ghoul))
    expect(s.pending?.question.choices.map((c) => c.label)).not.toContain('ability.playCard')
  })
})

describe('51009: Oops! (2)', () => {
  const fight = (s: GameState, name: string) =>
    choose(choose(s, 'action.fight', { enemy: name }), 'choice.revealToken')
  // RR: Fight. Any enemy at your location, including the attacked one.
  it('deals the failed attack’s damage to the attacked enemy itself', () => {
    let s = during(
      hand(game(), '51009'),
      patch({ skills: { ...weak, combat: 1 } }),
      spawnAt('A', { ...ghoul, name: 'Target', health: 8 }, 'a'),
    )
    s = playCard(fight(s, 'Target'), '51009')
    expect(enemy(s, 'Target').damageTaken).toBe(1)
  })
  // RR: Fight. The redirected attack no longer hurts the other investigator; Retaliate remains.
  it('spares the investigator engaged with the attacked enemy, keeping Retaliate', () => {
    let s = during(
      hand(game(['a', 'b']), '51009'),
      patch({ skills: { ...weak, combat: 1 } }),
      spawnAt('A', { ...ghoul, name: 'Target', health: 8, keywords: ['retaliate'] }, 'b'),
    )
    s = playCard(fight(s, 'Target'), '51009')
    expect(enemy(s, 'Target').damageTaken).toBe(1)
    expect(s.investigators[1]!.damage).toBe(0)
    expect(me(s).damage).toBe(1)
  })
  it('allows failing by 3 but not by 4', () => {
    const offered = (fightValue: number) => {
      const s = fight(
        during(
          hand(game(), '51009'),
          patch({ skills: weak }),
          spawnAt('A', { ...ghoul, name: 'Target', fight: fightValue, health: 8 }, 'a'),
        ),
        'Target',
      )
      return s.pending!.question.choices.some((c) => c.label === 'ability.playCard')
    }
    expect(offered(3)).toBe(true)
    expect(offered(4)).toBe(false)
  })
})

describe('51005: Contraband (2)', () => {
  // RR: Uses; "Either (choose one)". Placing works from zero and draws a card.
  it('places 2 supplies on an empty asset (the only option) and draws 1 card', () => {
    let s = during(game(), (s) => withAsset(patch({ deck: ['x'] })(s), '12031', { uses: 0 }))
    s = play(s, '51005')
    expect(s.assets['12031']!.uses).toBe(2)
    expect(me(s).hand).toEqual(['x'])
  })
  it('doubles the remaining ammunition instead, without drawing', () => {
    let s = during(game(), (s) => withAsset(patch({ deck: ['x'] })(s), '12019', { uses: 3 }))
    s = play(s, '51005')
    expect(s.pending!.question.choices.map((c) => c.label)).toEqual([
      'choice.contrabandPlaceUses',
      'choice.pilotDoubleUses',
    ])
    s = choose(s, 'choice.pilotDoubleUses')
    expect(s.assets['12019']!.uses).toBe(6)
    expect(me(s).hand).toEqual([])
  })
  it('requires an ammunition or supply asset at your location', () => {
    const s = hand(
      during(game(['a', 'b']), (s) =>
        withAsset(patch({ location: 'B' }, 'b')(s), '12019', { owner: 'b' }),
      ),
      '51005',
    )
    expect(playableCards(s, 'a', false)).not.toContain('51005')
  })
})

describe('05282: Bait and Switch (3)', () => {
  // RR: Evade. The first mode keeps Bait and Switch (0).
  it('evades an engaged enemy and moves it away', () => {
    let s = during(game(), (s) => s, spawnAt('A', { ...ghoul, name: 'Near' }, 'a'))
    s = play(s, '05282')
    expect(enemy(s, 'Near')).toMatchObject({ location: 'B', exhausted: true, engagedWith: null })
    expect(me(s).location).toBe('A')
  })
  // RR: Evade; Move. The second mode switches places with an enemy at a connecting location.
  it('switches locations with a non-Elite enemy at a connecting location', () => {
    let s = during(
      game(),
      (s) => s,
      spawnAt('A', { ...ghoul, name: 'Near' }, 'a'),
      spawnAt('B', { ...ghoul, name: 'Far' }),
    )
    s = play(s, '05282')
    s = choose(s, 'choice.baitAndSwitchSwap', { enemy: 'Far' })
    expect(me(s).location).toBe('B')
    expect(enemy(s, 'Far')).toMatchObject({ location: 'A', exhausted: true, engagedWith: null })
    expect(enemy(s, 'Near')).toMatchObject({ location: 'B', engagedWith: 'a' })
    expect(me(s).damage).toBe(0)
  })
  it('does not offer the switch against an Elite enemy', () => {
    const s = hand(
      during(game(), (s) => s, spawnAt('B', { ...ghoul, name: 'Far', traits: ['Elite'] })),
      '05282',
    )
    expect(playableCards(s, 'a', false)).not.toContain('05282')
  })
})
