import { dispatch, playerCardDef, type GameState } from '@lcg/engine'
import { choose, during, ghoul, labels, spawnAt, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { andre, clear, effectTest, makeGame, withAndre } from '../andre-patel/testing'
import { game, hand, me, patch, withAsset } from '../dunwich-pilot/testing'

const card = (code: string) => playerCardDef(code)!.name
const enemies = (s: GameState) => Object.values(s.enemies)
const byName = (s: GameState, name: string) => enemies(s).find((e) => e.name === name)!
const skills = (n: Partial<Record<'willpower' | 'intellect' | 'combat' | 'agility', number>>) =>
  patch({ skills: { willpower: 3, intellect: 3, combat: 3, agility: 3, ...n } })
/** Answers pending test questions only (not the action menu of the André game). */
const through = (s: GameState, label = 'choice.skip') => {
  while (s.pending) s = choose(s, labels(s).includes(label) ? label : labels(s).at(-1)!)
  return s
}

describe('03233 / 11061: "Watch this!" (0) and (3)', () => {
  // RR: Committing Cards; Additional Costs. Same payout as 60371, per printing.
  it.each([
    ['03233', 2],
    ['11061', 4],
  ])('%s pays out twice the resources spent when succeeding by 1', (code, difficulty) => {
    let s = withAndre(clear(makeGame(false, [0])), { hand: [code], resources: 5 })
    s = dispatch(s, effectTest(difficulty, 'willpower'))
    s = choose(s, 'choice.commit')
    s = choose(s, 'choice.spendResources', { n: 2 })
    s = through(s, 'choice.revealToken')
    expect(andre(s).resources).toBe(5 - 2 + 4)
  })
})

describe('05187: .45 Thompson (3)', () => {
  // RR: Uses; Fight; ST.7. The extra target needs fight at most the margin and 1 more ammo.
  it('may spend 1 ammo to deal the damage to another enemy whose fight is at most the margin', () => {
    let s = during(
      withBag(0)(game()),
      (s) => withAsset(skills({})(s), '05187'),
      spawnAt('A', { ...ghoul, health: 9 }, 'a'),
      spawnAt('A', { ...ghoul, name: 'Rat', fight: 3, health: 9 }),
      spawnAt('A', { ...ghoul, name: 'Brute', fight: 4, health: 9 }),
    )
    s = choose(s, 'ability.fightWith', { card: card('05187'), enemy: 'Ghoul' })
    expect(labels(s)).toContain('choice.skip')
    expect(s.pending!.question.choices.map((c) => c.params?.enemy)).not.toContain('Brute')
    s = choose(s, 'choice.enemy', { enemy: 'Rat' })
    expect(byName(s, 'Ghoul').damageTaken).toBe(2)
    expect(byName(s, 'Rat').damageTaken).toBe(2)
    expect(byName(s, 'Brute').damageTaken).toBe(0)
    expect(s.assets['05187']!.uses).toBe(3)
  })
  it('offers nothing when no other enemy qualifies', () => {
    let s = during(
      withBag(0)(game()),
      (s) => withAsset(skills({ combat: 0 })(s), '05187'),
      spawnAt('A', { ...ghoul, health: 9 }, 'a'),
      spawnAt('A', { ...ghoul, name: 'Rat', fight: 1, health: 9 }),
    )
    // 0 + 2 against 2: success by 0; the Rat's fight 1 is above the margin.
    s = choose(s, 'ability.fightWith', { card: card('05187'), enemy: 'Ghoul' })
    expect(labels(s)).not.toContain('choice.skip')
    expect(byName(s, 'Rat').damageTaken).toBe(0)
  })
})

describe('07305: .25 Automatic (2)', () => {
  // RR: Reaction Abilities; Evade. The free attack spends ammo but no action, after the test.
  it('after evading an enemy at your location, fights without spending an action', () => {
    let s = during(
      withBag(0)(game()),
      (s) => withAsset(s, '07305'),
      spawnAt('A', { ...ghoul, health: 9 }, 'a'),
    )
    s = choose(s, 'action.evade', { enemy: 'Ghoul' })
    s = choose(s, 'ability.freeFightWith', { card: card('07305') })
    s = choose(s, 'choice.enemy', { enemy: 'Ghoul' })
    // Exhausted by the evasion: +2 [combat] and +1 damage.
    expect(enemies(s)[0]!.damageTaken).toBe(2)
    expect(s.assets['07305']!.uses).toBe(3)
    expect(me(s).actionsRemaining).toBe(2)
  })
  it('is not offered without ammo', () => {
    let s = during(
      withBag(0)(game()),
      (s) => withAsset(s, '07305', { uses: 0 }),
      spawnAt('A', { ...ghoul, health: 9 }, 'a'),
    )
    s = choose(s, 'action.evade', { enemy: 'Ghoul' })
    expect(labels(s)).not.toContain('ability.freeFightWith')
  })
})

describe('09074: Breaking and Entering (2)', () => {
  // RR: Investigate; automatic evasion; end-of-turn return by 3.
  it('by 3 or more evades automatically and returns to hand at the end of the turn', () => {
    let s = during(withBag(0)(game()), (s) => s, spawnAt('A', { ...ghoul, health: 9 }, 'a'))
    s = choose(hand(s, '09074'), 'action.play', { card: card('09074') })
    s = choose(s, 'choice.enemy', { enemy: 'Ghoul' })
    expect(enemies(s)[0]!.engagedWith).toBeNull()
    expect(me(s).clues).toBe(1)
    expect(s.endOfTurn?.some((e) => e.then.some((m) => m.type === 'DiscardToHand'))).toBe(true)
  })
  it('by 1 may still evade, but does not return', () => {
    let s = during(
      withBag(0)(game()),
      (s) => skills({ intellect: 0 })(s),
      spawnAt('A', { ...ghoul, health: 9 }, 'a'),
    )
    s = choose(hand(s, '09074'), 'action.play', { card: card('09074') })
    expect(labels(s)).toContain('choice.skip')
    s = choose(s, 'choice.skip')
    expect(enemies(s)[0]!.engagedWith).toBe('a')
    expect(s.endOfTurn ?? []).toHaveLength(0)
  })
})

describe('03030 / 60322: Daring Maneuver (0) and (2)', () => {
  // RR: Fast; ST.6. Only in the "would succeed" window of your own test.
  it.each([
    ['03030', 0],
    ['60322', 1],
  ])('%s is played when you would succeed', (code, drawn) => {
    let s = during(withBag(0)(game()), patch({ deck: ['01088', '01089'] }))
    s = choose(hand(s, code), 'action.investigate')
    s = choose(s, 'choice.revealToken')
    s = choose(s, 'ability.playCard', { card: card(code) })
    expect(me(s).discard).toContain(code)
    expect(me(s).hand).toHaveLength(drawn)
    expect(me(s).clues).toBe(1)
  })
  it('is not offered when the test fails', () => {
    let s = during(withBag(0)(game()), (s) => skills({ intellect: 0 })(s))
    s = choose(hand(s, '03030'), 'action.investigate')
    s = choose(s, 'choice.revealToken')
    expect(labels(s)).not.toContain('ability.playCard')
    expect(me(s).hand).toContain('03030')
  })
})

describe('09069: Quick Getaway', () => {
  // RR: Fast; Enemy Attacks; Evade; Cancel.
  const attacked = (agility: number) => {
    let s = during(
      withBag(0)(game()),
      (s) => skills({ agility })(s),
      spawnAt('A', { ...ghoul, health: 9 }, 'a'),
    )
    s = during(hand(s, '09069'), (s) => s, {
      type: 'EnemyAttack',
      enemy: enemies(s)[0]!.id,
      investigator: 'a',
      exhaustAfter: false,
    })
    return choose(s, 'ability.playCard', { card: card('09069') })
  }
  it('a successful evasion evades the attacker and cancels its attack', () => {
    const s = attacked(3)
    expect(me(s).damage).toBe(0)
    expect(me(s).horror).toBe(0)
    expect(enemies(s)[0]).toMatchObject({ engagedWith: null, exhausted: true })
  })
  it('a failed evasion lets the attack resolve', () => {
    const s = attacked(0)
    expect(me(s).damage).toBe(1)
    expect(enemies(s)[0]!.engagedWith).toBe('a')
  })
})
