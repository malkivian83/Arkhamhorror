import { availableAbilities, playerCardDef, type GameState } from '@lcg/engine'
import { choose, during, ghoul, labels, spawnAt, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const card = (code: string) => playerCardDef(code)!.name
const enemy = (s: GameState) => Object.values(s.enemies)[0]!
const skills = (combat: number) =>
  patch({ skills: { willpower: 3, intellect: 3, combat, agility: 3 } })
const fight = (s: GameState, code: string) => choose(s, 'ability.fightWith', { card: card(code) })

describe('03234: .41 Derringer (2)', () => {
  // RR: Uses; Fight. Succeeding by 1 already adds the damage.
  it('deals +1 damage when succeeding by 1 and spends ammo', () => {
    let s = during(
      game(),
      (s) => withAsset(skills(1)(s), '03234'),
      spawnAt('A', { ...ghoul, health: 8 }, 'a'),
    )
    s = fight(s, '03234')
    expect(enemy(s).damageTaken).toBe(2)
    expect(s.assets['03234']!.uses).toBe(2)
    expect(labels(s)).not.toContain('choice.quickThinkingAction')
  })
  // RR: Additional Actions; once per turn.
  it('offers one additional action per turn when succeeding by 3 or more', () => {
    let s = during(
      game(),
      (s) => withAsset(s, '03234'),
      spawnAt('A', { ...ghoul, health: 20 }, 'a'),
    )
    s = fight(s, '03234')
    s = choose(s, 'choice.quickThinkingAction')
    expect(me(s).actionsRemaining).toBe(3)
    s = fight(s, '03234')
    expect(labels(s)).not.toContain('choice.quickThinkingAction')
    expect(me(s).actionsRemaining).toBe(2)
    expect(s.assets['03234']!.uses).toBe(1)
  })
  it('cannot attack without ammo', () => {
    const s = during(
      game(),
      (s) => withAsset(s, '03234', { uses: 0 }),
      spawnAt('A', { ...ghoul }, 'a'),
    )
    expect(availableAbilities(s, 'a').some((a) => a.key.startsWith('03234:'))).toBe(false)
  })
})

describe('09113: Baseball Bat (2)', () => {
  // RR: Fight; ST.4. Without a skull or autofail the bat stays in play.
  it('deals +1 damage and stays in play without symbols', () => {
    let s = during(game(), (s) => withAsset(s, '09113'), spawnAt('A', { ...ghoul, health: 8 }, 'a'))
    s = fight(s, '09113')
    expect(enemy(s).damageTaken).toBe(2)
    expect(s.assets['09113']).toBeDefined()
  })
  it('on a skull may deal an additional +1 damage and is discarded', () => {
    let s = during(
      game(),
      (s) => withAsset(withBag('skull')(s), '09113'),
      spawnAt('A', { ...ghoul, health: 8 }, 'a'),
    )
    s = fight(s, '09113')
    s = choose(s, 'choice.discardForDamage', { card: card('09113') })
    expect(enemy(s).damageTaken).toBe(3)
    expect(s.assets['09113']).toBeUndefined()
    expect(me(s).discard).toContain('09113')
  })
  it('on an autofail may return to its owner hand', () => {
    let s = during(
      game(),
      (s) => withAsset(withBag('autoFail')(s), '09113'),
      spawnAt('A', { ...ghoul, health: 8 }, 'a'),
    )
    s = fight(s, '09113')
    s = choose(s, 'choice.returnToHand', { card: card('09113') })
    expect(enemy(s).damageTaken).toBe(0)
    expect(s.assets['09113']).toBeUndefined()
    expect(me(s).hand).toContain('09113')
  })
})

describe('51002: Blackjack (2)', () => {
  // RR: Fight. Against an enemy engaged with another investigator.
  it('deals +1 damage to an enemy engaged with another investigator', () => {
    let s = during(
      game(['a', 'b']),
      (s) => withAsset(s, '51002'),
      spawnAt('A', { ...ghoul, health: 8 }, 'b'),
    )
    s = fight(s, '51002')
    expect(enemy(s).damageTaken).toBe(2)
  })
  it('deals normal damage to its own engaged enemy', () => {
    let s = during(game(), (s) => withAsset(s, '51002'), spawnAt('A', { ...ghoul, health: 8 }, 'a'))
    s = fight(s, '51002')
    expect(enemy(s).damageTaken).toBe(1)
  })
  it('deals no damage to the other investigator when it fails', () => {
    let s = during(
      game(['a', 'b']),
      (s) => withAsset(skills(0)(s), '51002'),
      spawnAt('A', { ...ghoul, health: 8, fight: 5 }, 'b'),
    )
    s = fight(s, '51002')
    expect(s.investigators[1]!.damage).toBe(0)
    expect(enemy(s).damageTaken).toBe(0)
  })
})

describe("52010: Gravedigger's Shovel (2)", () => {
  // RR: Activate; Discover Clues; removed from the game for two clues.
  it('is discarded to discover one clue', () => {
    let s = during(game(), (s) => withAsset(s, '52010'))
    s = choose(s, 'ability.reactiveShovel', { card: card('52010') })
    expect(me(s).clues).toBe(1)
    expect(me(s).discard).toContain('52010')
  })
  it('is removed from the game to discover two clues', () => {
    let s = during(game(), (s) => withAsset(s, '52010'))
    s = choose(s, 'ability.shovelRemove', { card: card('52010') })
    expect(me(s).clues).toBe(2)
    expect(me(s).discard).not.toContain('52010')
    expect(s.assets['52010']).toBeUndefined()
  })
  it('attacks with +2 combat', () => {
    let s = during(
      game(),
      (s) => withAsset(skills(0)(s), '52010'),
      spawnAt('A', { ...ghoul, health: 8 }, 'a'),
    )
    s = fight(s, '52010')
    expect(enemy(s).damageTaken).toBe(1)
  })
})

describe('53002: Survival Knife (2)', () => {
  // RR: Enemy phase attacks; the reaction resolves before the attack.
  it('attacks the attacking enemy before its attack resolves', () => {
    let s = during(
      game(),
      (s) => withAsset(s, '53002'),
      spawnAt('A', { ...ghoul, health: 3, damage: 2 }, 'a'),
    )
    s = { ...s, phase: 'enemy' }
    s = during(s, (x) => x, {
      type: 'EnemyAttack',
      enemy: enemy(s).id,
      investigator: 'a',
      exhaustAfter: false,
    })
    s = choose(s, 'ability.supportSurvivalKnife', { card: card('53002') })
    expect(s.assets['53002']!.exhausted).toBe(true)
    expect(Object.keys(s.enemies)).toHaveLength(1)
    expect(enemy(s).damageTaken).toBe(2)
    expect(me(s).damage).toBe(2)
  })
  it('prevents the attack when it defeats the attacking enemy', () => {
    let s = during(
      game(),
      (s) => withAsset(s, '53002'),
      spawnAt('A', { ...ghoul, health: 2, damage: 2 }, 'a'),
    )
    s = { ...s, phase: 'enemy' }
    s = during(s, (x) => x, {
      type: 'EnemyAttack',
      enemy: enemy(s).id,
      investigator: 'a',
      exhaustAfter: false,
    })
    s = choose(s, 'ability.supportSurvivalKnife', { card: card('53002') })
    expect(Object.keys(s.enemies)).toHaveLength(0)
    expect(me(s).damage).toBe(0)
  })
  it('is not offered outside the enemy phase', () => {
    let s = during(game(), (s) => withAsset(s, '53002'), spawnAt('A', { ...ghoul, health: 3 }, 'a'))
    s = during(s, (x) => x, {
      type: 'EnemyAttack',
      enemy: enemy(s).id,
      investigator: 'a',
      exhaustAfter: false,
    })
    expect(labels(s)).not.toContain('ability.supportSurvivalKnife')
  })
})

describe('10120: Fire Axe (2)', () => {
  // RR: Fast abilities, three per attack; +1 damage with an empty pool.
  it('spends up to three resources for +2 combat each', () => {
    let s = during(
      game(),
      (s) => withAsset(patch({ resources: 4 })(s), '10120'),
      spawnAt('A', { ...ghoul, health: 8, fight: 8 }, 'a'),
    )
    s = fight(s, '10120')
    for (let n = 0; n < 3; n++) s = choose(s, 'ability.pilotAxe')
    expect(labels(s)).not.toContain('ability.pilotAxe')
    expect(me(s).resources).toBe(1)
    expect(enemy(s).damageTaken).toBe(1)
  })
  it('deals +1 damage when its controller has no resources', () => {
    let s = during(
      game(),
      (s) => withAsset(patch({ resources: 0 })(s), '10120'),
      spawnAt('A', { ...ghoul, health: 8 }, 'a'),
    )
    s = fight(s, '10120')
    expect(enemy(s).damageTaken).toBe(2)
  })
  it('is a fast asset', () => {
    expect(playerCardDef('10120')!.fast).toBe(true)
  })
})

describe('60558: Old Compass', () => {
  // RR: Investigate at −1 shroud; a failed test may be attempted again once.
  it('investigates at −1 shroud', () => {
    let s = during(game(), (s) =>
      withAsset(
        patch({ skills: { willpower: 3, intellect: 1, combat: 3, agility: 3 } })(s),
        '60558',
      ),
    )
    s = choose(s, 'ability.investigateWith', { card: card('60558') })
    expect(me(s).clues).toBe(1)
  })
  it('exhausts to attempt the same test again after failing', () => {
    let s = during(game(), (s) =>
      withAsset(
        patch({ skills: { willpower: 3, intellect: 0, combat: 3, agility: 3 } })(withBag(-1, 0)(s)),
        '60558',
      ),
    )
    s = choose(s, 'ability.investigateWith', { card: card('60558') })
    expect(me(s).clues).toBe(0)
    s = choose(s, 'ability.retryCompass', { card: card('60558') })
    expect(s.assets['60558']!.exhausted).toBe(true)
    expect(me(s).actionsRemaining).toBe(2)
  })
})

describe('60326: Lucky Cigarette Case (3)', () => {
  // RR: Search the top X cards (X = margin), draw one and shuffle the rest.
  it('searches as many cards as the test succeeded by', () => {
    let s = during(
      game(),
      (s) => withAsset(patch({ deck: ['01088', '01089', '01093', '01030', '01031'] })(s), '60326'),
      spawnAt('A', { ...ghoul, health: 8, fight: 0 }, 'a'),
    )
    s = choose(s, 'action.fight', { enemy: 'Ghoul' })
    const option = s.pending!.question.choices.find((c) => c.label === 'ability.searchTop')!
    expect(option.params).toMatchObject({ n: 3 })
    const hand = me(s).hand.length
    s = choose(s, 'ability.searchTop')
    expect(labels(s).filter((l) => l === 'choice.takeCard')).toHaveLength(3)
    s = choose(s, 'choice.takeCard', { card: card('01093') })
    expect(me(s).hand).toHaveLength(hand + 1)
    expect(me(s).hand).toContain('01093')
    expect(me(s).deck).toHaveLength(4)
    expect(s.assets['60326']!.exhausted).toBe(true)
  })
  it('is not offered when the test fails', () => {
    let s = during(
      game(),
      (s) => withAsset(skills(0)(s), '60326'),
      spawnAt('A', { ...ghoul, health: 8, fight: 4 }, 'a'),
    )
    s = choose(s, 'action.fight', { enemy: 'Ghoul' })
    expect(labels(s)).not.toContain('ability.searchTop')
  })
})

describe('09122: Flashlight (3)', () => {
  const intellect = (n: number) =>
    patch({ skills: { willpower: 3, intellect: n, combat: 3, agility: 3 } })
  // RR: Uses; ST.1. −2 difficulty only for the controller's investigations and evasions.
  it('spends a supply to reduce the difficulty of an investigation by 2', () => {
    let s = during(game(), (s) => withAsset(intellect(0)(withBag(0)(s)), '09122'))
    s = choose(s, 'action.investigate')
    s = choose(s, 'ability.flashlightDifficulty', { card: card('09122') })
    expect(s.assets['09122']!.uses).toBe(3)
    expect(me(s).clues).toBe(1)
  })
  it('is not offered for other tests or without supplies', () => {
    let s = during(
      game(),
      (s) => withAsset(withBag(0)(s), '09122'),
      spawnAt('A', { ...ghoul, health: 8 }, 'a'),
    )
    s = choose(s, 'action.fight', { enemy: 'Ghoul' })
    expect(labels(s)).not.toContain('ability.flashlightDifficulty')
    s = during(game(), (s) => withAsset(intellect(0)(withBag(0)(s)), '09122', { uses: 0 }))
    s = choose(s, 'action.investigate')
    expect(labels(s)).not.toContain('ability.flashlightDifficulty')
    expect(me(s).clues).toBe(0)
  })
})
