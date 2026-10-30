import { playerCardDef, type GameState } from '@lcg/engine'
import { choose, during, ghoul, labels, spawnAt, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const card = (code: string) => playerCardDef(code)!.name
const enemy = (s: GameState) => Object.values(s.enemies)[0]
const skills = (agility: number, combat = 3) =>
  patch({ skills: { willpower: 3, intellect: 3, combat, agility }, resources: 10 })
const inHand = (...codes: string[]) => patch({ hand: codes, resources: 10 })

describe('04034: Dumb Luck', () => {
  // RR: Fast, Evade. Same text as 60514: fail by 2 or less against a non-Elite enemy.
  it('places the enemy on top of the encounter deck after failing an evasion by 1', () => {
    let s = during(
      game(),
      (s) => inHand('04034')(skills(1)(withBag(0)(s))),
      spawnAt('A', ghoul, 'a'),
    )
    s = choose(choose(s, 'action.evade', { enemy: 'Ghoul' }), 'choice.revealToken')
    s = choose(s, 'ability.playCard', { card: card('04034') })
    expect(enemy(s)).toBeUndefined()
    expect(s.encounterDeck[0]!.code).toBe(ghoul.code)
  })
})

describe("60574: Hunter's Instinct (2)", () => {
  // RR: Uses; Reactions. Level 0-2 events only; the supply and the exhaustion are costs.
  it('recovers a level 0-2 event, but not a higher-level one, after engaging', () => {
    let s = during(
      game(),
      (s) => withAsset(patch({ discard: ['01023', '51006', '02261'] })(s), '60574'),
      spawnAt('A', { ...ghoul, keywords: ['aloof'] }),
    )
    s = choose(s, 'action.engage', { enemy: 'Ghoul' })
    const offered = s.pending!.question.choices.filter(
      (c) => c.label === 'ability.returnFromDiscard',
    )
    expect(offered.map((c) => c.params?.target).sort()).toEqual(
      [card('01023'), card('51006')].sort(),
    )
    s = choose(s, 'ability.returnFromDiscard', { target: card('51006') })
    expect(me(s).hand).toContain('51006')
    expect(s.assets['60574']!.uses).toBe(2)
    expect(s.assets['60574']!.exhausted).toBe(true)
  })
})

describe('05160: Belly of the Beast', () => {
  // RR: Fast, Evade. Only after succeeding by 2 or more.
  it('discovers a clue after evading by 2', () => {
    let s = during(
      game(),
      (s) => inHand('05160')(skills(4)(withBag(0)(s))),
      spawnAt('A', ghoul, 'a'),
    )
    s = choose(choose(s, 'action.evade', { enemy: 'Ghoul' }), 'choice.revealToken')
    s = choose(s, 'ability.playCard', { card: card('05160') })
    expect(me(s).clues).toBe(1)
  })
  it('is not offered after evading by only 1', () => {
    let s = during(
      game(),
      (s) => inHand('05160')(skills(3)(withBag(0)(s))),
      spawnAt('A', ghoul, 'a'),
    )
    s = choose(choose(s, 'action.evade', { enemy: 'Ghoul' }), 'choice.revealToken')
    expect(labels(s)).not.toContain('ability.playCard')
    expect(enemy(s)!.exhausted).toBe(true)
    expect(me(s).hand).toEqual(['05160'])
  })
})

describe('01083: Close Call (2)', () => {
  // RR: Fast, Evade, Elite. The evaded enemy is shuffled into the encounter deck.
  it('shuffles an evaded non-Elite enemy into the encounter deck', () => {
    let s = during(
      game(),
      (s) => inHand('01083')(skills(3)(withBag(0)(s))),
      spawnAt('A', ghoul, 'a'),
    )
    const deck = s.encounterDeck.length
    s = choose(choose(s, 'action.evade', { enemy: 'Ghoul' }), 'choice.revealToken')
    s = choose(s, 'ability.playCard', { card: card('01083') })
    expect(enemy(s)).toBeUndefined()
    expect(s.encounterDeck).toHaveLength(deck + 1)
  })
  it('cannot be played on an Elite enemy', () => {
    let s = during(
      game(),
      (s) => inHand('01083')(skills(3)(withBag(0)(s))),
      spawnAt('A', { ...ghoul, traits: ['Elite'] }, 'a'),
    )
    s = choose(choose(s, 'action.evade', { enemy: 'Ghoul' }), 'choice.revealToken')
    expect(labels(s)).not.toContain('ability.playCard')
  })
})

describe('60559: Pocketknife', () => {
  // RR: Fight. Combat or agility, +1; optional exhaustion for a resource on defeat.
  it('fights with agility and may exhaust to gain a resource after defeating', () => {
    let s = during(
      game(),
      (s) => withAsset(skills(1, 0)(withBag(0)(s)), '60559'),
      spawnAt('A', { ...ghoul, health: 1 }, 'a'),
    )
    s = choose(s, 'ability.fightWithSkill', { card: card('60559'), skill: 'agility' })
    expect(enemy(s)).toBeUndefined()
    const resources = me(s).resources
    s = choose(s, 'ability.gainResource', { card: card('60559') })
    expect(me(s).resources).toBe(resources + 1)
    expect(s.assets['60559']!.exhausted).toBe(true)
  })
  it('offers nothing if the enemy survives', () => {
    let s = during(
      game(),
      (s) => withAsset(skills(1, 3)(withBag(0)(s)), '60559'),
      spawnAt('A', { ...ghoul, health: 5 }, 'a'),
    )
    s = choose(s, 'ability.fightWithSkill', { card: card('60559'), skill: 'combat' })
    expect(enemy(s)!.damageTaken).toBe(1)
    expect(labels(s)).not.toContain('ability.gainResource')
  })
})

describe('60571: Field Dressing (1)', () => {
  // RR: Fast, Healing. After a Creature or Monster enemy at your location is defeated.
  it('heals up to 3 damage one at a time after a Monster is defeated', () => {
    let s = during(
      game(),
      (s) => patch({ damage: 2 })(inHand('60571')(skills(3)(withBag(0)(s)))),
      spawnAt('A', { ...ghoul, health: 1, traits: ['Monster'] }, 'a'),
    )
    s = choose(s, 'action.fight', { enemy: 'Ghoul' })
    s = choose(s, 'ability.playCard', { card: card('60571') })
    s = choose(s, 'choice.healDamageOf', { name: 'A' })
    s = choose(s, 'choice.healDamageOf', { name: 'A' })
    expect(me(s).damage).toBe(0)
  })
  it('is not offered for other enemies', () => {
    let s = during(
      game(),
      (s) => patch({ damage: 2 })(inHand('60571')(skills(3)(withBag(0)(s)))),
      spawnAt('A', { ...ghoul, health: 1, traits: ['Humanoid'] }, 'a'),
    )
    s = choose(s, 'action.fight', { enemy: 'Ghoul' })
    expect(labels(s)).not.toContain('ability.playCard')
  })
})

describe('60564: Guerrilla Tactics', () => {
  // RR: Fight/Evade; an enemy at a connecting location is targeted as if engaged.
  it('evades an enemy at a connecting location', () => {
    let s = during(game(), (s) => inHand('60564')(skills(2)(withBag(0)(s))), spawnAt('B'))
    s = choose(s, 'action.play', { card: card('60564') })
    s = choose(s, 'choice.guerrillaEvade', { enemy: 'Ghoul', location: 'Room B' })
    expect(enemy(s)!.exhausted).toBe(true)
    expect(enemy(s)!.location).toBe('B')
  })
  it('attacks an enemy at a connecting location with +1', () => {
    let s = during(game(), (s) => inHand('60564')(skills(3, 1)(withBag(0)(s))), spawnAt('B'))
    s = choose(s, 'action.play', { card: card('60564') })
    s = choose(s, 'choice.guerrillaFight', { enemy: 'Ghoul', location: 'Room B' })
    expect(enemy(s)!.damageTaken).toBe(1)
  })
})
