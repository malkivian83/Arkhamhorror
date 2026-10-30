import { availableAbilities, playerCardBehavior, playerCardDef, type GameState } from '@lcg/engine'
import { choose, during, ghoul, labels, spawnAt, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const card = (code: string) => playerCardDef(code)!.name
const enemy = (s: GameState) => Object.values(s.enemies)[0]!
const skills = (combat: number, agility = 3) =>
  patch({ skills: { willpower: 3, intellect: 3, combat, agility } })
const attack = (s: GameState, investigator = 'a', exhaustAfter = false) =>
  during(s, (s) => s, {
    type: 'EnemyAttack',
    enemy: enemy(s).id,
    investigator,
    exhaustAfter,
  })

describe('08030: Butterfly Swords (5)', () => {
  // RR: Fight. The second attack needs no exhaustion; it adds agility.
  it('fights again without exhausting and adds +1 damage after two successes', () => {
    let s = during(
      game(),
      (s) => withAsset(skills(2, 1)(withBag(0)(s)), '08030'),
      spawnAt('A', { ...ghoul, health: 10, fight: 3 }, 'a'),
    )
    s = choose(s, 'ability.fightWith', { card: card('08030') })
    expect(enemy(s).damageTaken).toBe(1)
    expect(s.assets['08030']!.exhausted).toBe(false)
    s = choose(s, 'choice.fightAgain', { enemy: 'Ghoul' })
    s = choose(s, 'ability.butterflySwordsDamage')
    expect(enemy(s).damageTaken).toBe(3)
    expect(s.assets['08030']!.exhausted).toBe(true)
  })
  it('does not offer the bonus when the first attack failed', () => {
    let s = during(
      game(),
      (s) => withAsset(skills(0, 4)(withBag(0)(s)), '08030'),
      spawnAt('A', { ...ghoul, health: 10, fight: 3 }, 'a'),
    )
    s = choose(s, 'ability.fightWith', { card: card('08030') })
    expect(enemy(s).damageTaken).toBe(0)
    s = choose(s, 'choice.fightAgain', { enemy: 'Ghoul' })
    expect(labels(s)).not.toContain('ability.butterflySwordsDamage')
    expect(enemy(s).damageTaken).toBe(1)
  })
})

describe('09034: Guard Dog (2)', () => {
  // RR: Fast; Engaging. Exhaust it so an enemy at your location engages and attacks you.
  it('provokes an enemy at your location, which engages and attacks', () => {
    let s = during(game(['a', 'b']), (s) => withAsset(s, '09034'), spawnAt('A', ghoul, 'b'))
    s = choose(s, 'ability.wrenchProvoke', { enemy: 'Ghoul' })
    expect(enemy(s).engagedWith).toBe('a')
    expect(s.assets['09034']!.exhausted).toBe(true)
  })
  // RR: Reactions. Horror alone also triggers it (level 0 needs damage).
  it('deals 1 damage to the attacker when an attack deals horror to it', () => {
    const behavior = playerCardBehavior('09034')!
    let s = during(game(), (s) => withAsset(s, '09034'), spawnAt('A', ghoul, 'a'))
    const options = behavior.reactions!(
      s,
      {
        type: 'afterDamageAssigned',
        investigator: 'a',
        enemy: enemy(s).id,
        dealt: [{ asset: '09034', damage: 0, horror: 1 }],
      },
      s.assets['09034']!,
    )
    expect(options).toHaveLength(1)
    s = during(s, (s) => s, ...options[0]!.then)
    expect(enemy(s).damageTaken).toBe(1)
  })
})

describe('09036: Prepared for the Worst (2)', () => {
  // RR: Searching. The chosen investigator may play the Weapon paying its cost.
  it('lets an investigator at your location play a Weapon from their top 9 cards', () => {
    let s = during(game(['a', 'b']), (s) =>
      patch(
        { deck: ['02016', 'x-1', 'x-2'], resources: 5 },
        'b',
      )(patch({ hand: ['09036'], resources: 5 })(s)),
    )
    s = choose(s, 'action.play', { card: card('09036') })
    s = choose(s, 'choice.investigator', { name: 'B' })
    expect(labels(s)).toEqual(['choice.takeCard', 'choice.preparedPlayWeapon'])
    s = choose(s, 'choice.preparedPlayWeapon', { card: card('02016') })
    expect(Object.values(s.assets).some((a) => a.code === '02016' && a.owner === 'b')).toBe(true)
    expect(s.investigators[1]!.resources).toBe(5 - playerCardDef('02016')!.cost!)
    expect(s.investigators[1]!.deck).toHaveLength(2)
  })
  it('adds the Weapon to the hand, or only shuffles when none is found', () => {
    let s = during(game(), patch({ hand: ['09036'], resources: 0, deck: ['x-1', '02016'] }))
    s = choose(s, 'action.play', { card: card('09036') })
    s = choose(s, 'choice.investigator', { name: 'A' })
    expect(me(s).hand).toContain('02016')
    s = during(game(), patch({ hand: ['09036'], resources: 1, deck: ['x-1', 'x-2'] }))
    s = choose(s, 'action.play', { card: card('09036') })
    s = choose(s, 'choice.investigator', { name: 'A' })
    expect(me(s).deck).toHaveLength(2)
    expect(me(s).hand).toEqual([])
  })
})

describe('06196: Safeguard (2)', () => {
  // RR: Reactions; Movement. One exhaustion covers every move of that turn.
  it('follows another investigator repeatedly during their turn', () => {
    let s = during(game(['a', 'b']), (s) => ({ ...withAsset(s, '06196'), activeTurn: 'b' }), {
      type: 'MoveTo',
      investigator: 'b',
      location: 'B',
    })
    s = choose(s, 'ability.safeguard')
    expect(me(s).location).toBe('B')
    expect(s.assets['06196']!.exhausted).toBe(true)
    s = during(s, (s) => s, { type: 'MoveTo', investigator: 'b', location: 'C' })
    s = choose(s, 'ability.safeguard')
    expect(me(s).location).toBe('C')
  })
  it('is not offered during your own turn or when exhausted for another reason', () => {
    let s = during(game(['a', 'b']), (s) => withAsset(s, '06196'), {
      type: 'MoveTo',
      investigator: 'b',
      location: 'B',
    })
    expect(labels(s)).not.toContain('ability.safeguard')
    s = during(
      game(['a', 'b']),
      (s) => ({ ...withAsset(s, '06196', { exhausted: true }), activeTurn: 'b' }),
      { type: 'MoveTo', investigator: 'b', location: 'B' },
    )
    expect(labels(s)).not.toContain('ability.safeguard')
  })
})

describe('01027: Police Badge (2)', () => {
  // RR: Fast; Additional Actions.
  it('gives +1 willpower and discards for 2 additional actions', () => {
    let s = during(game(), (s) => withAsset(s, '01027'))
    expect(
      playerCardBehavior('01027')!.skillModifier!(s, s.assets['01027']!, {
        skill: 'willpower',
      } as never),
    ).toBe(1)
    s = choose(s, 'ability.policeBadge', { name: 'A' })
    expect(me(s).actionsRemaining).toBe(5)
    expect(s.assets['01027']).toBeUndefined()
  })
  it('is not offered for an investigator at another location', () => {
    const s = during(game(['a', 'b']), (s) => ({
      ...withAsset(patch({ location: 'B' }, 'b')(s), '01027', { owner: 'b' }),
    }))
    expect(availableAbilities(s, 'b').some((o) => o.label === 'ability.policeBadge')).toBe(false)
  })
})

describe('60158: Service Revolver', () => {
  // RR: Uses; Reactions. Fight the attacking enemy at +1 for +1 damage.
  it('spends ammo to fight the enemy after it attacks you', () => {
    let s = during(
      game(),
      (s) => withAsset(skills(1)(withBag(0)(s)), '60158'),
      spawnAt('A', { ...ghoul, health: 5 }, 'a'),
    )
    s = attack(s)
    s = choose(s, 'ability.supportSurvivalKnife', { card: card('60158') })
    expect(s.assets['60158']!.uses).toBe(2)
    expect(enemy(s).damageTaken).toBe(2)
  })
  it('requires ammo', () => {
    let s = during(
      game(),
      (s) => withAsset(s, '60158', { uses: 0 }),
      spawnAt('A', { ...ghoul, health: 5 }, 'a'),
    )
    s = attack(s)
    expect(labels(s)).not.toContain('ability.supportSurvivalKnife')
  })
})

describe('60157: Rookie Cop', () => {
  // RR: Damage assignment; Reactions.
  it('may soak for others and discovers a clue when defeated', () => {
    expect(playerCardBehavior('60157')!.soaksForOthers).toBe(true)
    let s = during(game(), (s) => withAsset(s, '60157'), {
      type: 'DamageAsset',
      asset: '60157',
      damage: 2,
      horror: 0,
    })
    s = choose(s, 'ability.discoverClue', { card: card('60157') })
    expect(me(s).clues).toBe(1)
    expect(s.assets['60157']).toBeUndefined()
  })
})

describe('08020: Toe to Toe', () => {
  // RR: Costs; Automatic Success. The chosen enemy attacks first, then the attack succeeds.
  it('the enemy attacks you, then the attack automatically succeeds for +1 damage', () => {
    let s = during(
      game(),
      (s) => skills(0)(patch({ hand: ['08020'], resources: 3 })(withBag(-8)(s))),
      spawnAt('A', { ...ghoul, health: 5, fight: 5 }, 'a'),
    )
    s = choose(s, 'action.play', { card: card('08020') })
    s = choose(s, 'choice.enemy', { enemy: 'Ghoul' })
    expect(me(s).damage).toBe(1)
    expect(me(s).horror).toBe(1)
    expect(enemy(s).damageTaken).toBe(2)
    expect(me(s).actionsRemaining).toBe(2)
  })
  it('cannot be played without an enemy to attack', () => {
    const s = during(game(), patch({ hand: ['08020'], resources: 3 }))
    expect(labels(s)).not.toContain('action.play')
  })
})

describe('03106: Heroic Rescue', () => {
  // RR: Cancel; Enemy Attacks. The attack is redirected to you and the enemy engages you.
  it('takes the attack against another investigator and deals 1 damage', () => {
    let s = during(
      game(['a', 'b']),
      patch({ hand: ['03106'], resources: 3 }),
      spawnAt('A', { ...ghoul, health: 5 }, 'b'),
    )
    s = attack(s, 'b', true)
    s = choose(s, 'ability.playCard', { card: card('03106') })
    expect(s.investigators[1]!.damage + s.investigators[1]!.horror).toBe(0)
    expect(me(s).damage).toBe(1)
    expect(me(s).horror).toBe(1)
    expect(enemy(s).engagedWith).toBe('a')
    expect(enemy(s).damageTaken).toBe(1)
  })
  it('is not offered for attacks against you or by Elite enemies', () => {
    let s = during(
      game(['a', 'b']),
      patch({ hand: ['03106'], resources: 3 }),
      spawnAt('A', { ...ghoul, health: 5 }, 'a'),
    )
    expect(labels(attack(s, 'a'))).not.toContain('ability.playCard')
    s = during(
      game(['a', 'b']),
      patch({ hand: ['03106'], resources: 3 }),
      spawnAt('A', { ...ghoul, health: 5, traits: ['Elite'] }, 'b'),
    )
    expect(labels(attack(s, 'b'))).not.toContain('ability.playCard')
  })
})
