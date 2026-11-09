// RR: Abilities, Costs, Playing Cards, Uses, Chaos Tokens, Fight, Aloof, Retaliate, Evade,
// Attachments, Revelation, Weakness, Choices, Round End.
import {
  availableAbilities,
  createGame,
  dispatch,
  getInvestigator,
  type Asset,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, ghoul, labels, spawnAt, testInvestigator, testScenario } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { sturdy } from '../basic-abilities/testing'
import { patch } from '../dunwich-pilot/testing'
import '../index'
import {
  BECKY,
  LOOSE_CANNON,
  OVERCONFIDENT,
  RESTRAINED,
  THOMPSON,
  TOMMY,
  VICIOUS_BLOW_2,
} from './register'

const M1911 = '60155'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const me = (s: GameState) => getInvestigator(s, TOMMY)
const enemy = (s: GameState) => Object.values(s.enemies)[0]!
const asset = (s: GameState, code: string) => Object.values(s.assets).find((a) => a.code === code)
const skip = (s: GameState): GameState => {
  for (let n = 0; n < 50 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = choose(s, labels(s).includes('choice.skip') ? 'choice.skip' : labels(s)[0]!)
  return s
}
/** Tommy at Room A on his turn, with an empty hand and the given resources. */
const tommy = (changes: Parameters<typeof patch>[0] = {}, bag: GameState['chaosBag'] = [0]) => {
  let s = createGame({
    seed: 3,
    scenario: testScenario({ chaosBag: bag }),
    investigators: [
      testInvestigator(TOMMY, {
        skills: { willpower: 3, intellect: 3, combat: 4, agility: 2 },
        health: 9,
        sanity: 6,
      }),
    ],
  })
  s = skip(s)
  return patch({ hand: [], resources: 10, ...changes }, TOMMY)({ ...clear(s), interactive: true })
}
const put = (s: GameState, code: string, changes: Partial<Asset> = {}) => {
  s = skip(run(s, { type: 'PutAssetIntoPlay', investigator: TOMMY, code }))
  const a = asset(s, code)!
  return { ...s, assets: { ...s.assets, [a.id]: { ...a, ...changes } } }
}
const menu = (s: GameState) => run(s, { type: 'PlayerWindow', investigator: TOMMY })
const finish = (s: GameState): GameState => {
  s = choose(s, 'choice.revealToken')
  if (labels(s).includes('choice.applyResults')) s = choose(s, 'choice.applyResults')
  return s
}
/** Combat test; success gains 1 resource so the result is observable. */
const effectTest = (difficulty: number): Message => ({
  type: 'BeginSkillTest',
  investigator: TOMMY,
  skill: 'combat',
  difficulty,
  kind: {
    type: 'effect',
    source: 'test',
    onSuccess: [{ type: 'GainResources', investigator: TOMMY, amount: 1 }],
    onFail: [],
    onFailEach: [],
  },
})

describe('Tommy Muldoon', () => {
  it('spends 1 resource to play a Firearm from hand, which enters with 2 additional ammo', () => {
    let s = menu(tommy({ hand: [M1911], resources: 5 }))
    expect(labels(s)).not.toContain('ability.tommyDiscard')
    s = choose(s, 'ability.tommyResource')
    expect(asset(s, M1911)).toMatchObject({ uses: 4 + 2 })
    expect(me(s)).toMatchObject({ resources: 5 - 1 - 3, hand: [], actionsRemaining: 2 })
  })

  it('may discard a Firearm in play instead, freeing its hands for the new Firearm', () => {
    let s = put(tommy({ hand: [THOMPSON], resources: 6 }), BECKY)
    s = menu(s)
    // Spending 1 resource would leave 5, not enough for the Thompson.
    expect(labels(s)).not.toContain('ability.tommyResource')
    s = choose(s, 'ability.tommyDiscard', { card: 'Becky' })
    expect(asset(s, BECKY)).toBeUndefined()
    expect(me(s).discard).toContain(BECKY)
    expect(asset(s, THOMPSON)).toMatchObject({ uses: 6 + 2 })
    expect(me(s).resources).toBe(0)
  })

  it('is not offered without a playable Firearm in hand', () => {
    expect(availableAbilities(tommy({ hand: ['60156'] }), TOMMY).map((a) => a.label)).not.toContain(
      'ability.tommyResource',
    )
    expect(
      availableAbilities(tommy({ hand: [M1911], resources: 3 }), TOMMY).map((a) => a.label),
    ).not.toContain('ability.tommyResource')
  })

  it('elder sign: +1 and places 1 ammo on an asset with uses (ammo), even on a failure', () => {
    // Combat 4 + 1 against 5 succeeds only thanks to the elder sign modifier.
    let s = put(put(tommy({ resources: 0 }, ['elderSign']), BECKY), '60159')
    s = skip(finish(run(s, effectTest(5))))
    expect(me(s).resources).toBe(1)
    expect(asset(s, BECKY)!.uses).toBe(3)
    s = skip(finish(run(s, effectTest(9))))
    expect(me(s).resources).toBe(1)
    expect(asset(s, BECKY)!.uses).toBe(4)
  })

  it('elder sign: chooses among several assets with ammo', () => {
    let s = put(put(tommy({}, ['elderSign']), M1911), '60158')
    s = choose(run(s, effectTest(1)), 'choice.revealToken')
    s = skip(choose(s, 'choice.tommyAmmo', { card: 'Service Revolver' }))
    expect(asset(s, '60158')!.uses).toBe(4)
    expect(asset(s, M1911)!.uses).toBe(4)
  })
})

describe('Becky', () => {
  it('spends 1 ammo to fight with +2 combat and +1 damage', () => {
    let s = put(tommy(), BECKY)
    s = skip(run(s, spawnAt('A', { ...sturdy, fight: 6 }, TOMMY)))
    s = choose(menu(s), 'ability.fightWith', { card: 'Becky', enemy: 'Ghoul' })
    s = finish(s)
    expect(enemy(s).damageTaken).toBe(2)
    expect(asset(s, BECKY)).toMatchObject({ uses: 1, exhausted: false })
  })

  it('may exhaust to ignore retaliate and attack an unengaged aloof enemy', () => {
    let s = put(tommy(), BECKY)
    s = skip(run(s, spawnAt('A', { ...sturdy, fight: 9, keywords: ['aloof', 'retaliate'] }, null)))
    s = menu(s)
    expect(labels(s)).not.toContain('ability.fightWith')
    s = choose(s, 'ability.beckyIgnore', { card: 'Becky', enemy: 'Ghoul' })
    expect(s.skillTest?.kind).toMatchObject({ ignoreRetaliate: true })
    s = skip(finish(s))
    // The failed attack does not trigger retaliate.
    expect(me(s).damage).toBe(0)
    expect(asset(s, BECKY)).toMatchObject({ uses: 1, exhausted: true })
    expect(availableAbilities(s, TOMMY).map((a) => a.label)).not.toContain('ability.beckyIgnore')
  })
})

describe('Loose Cannon', () => {
  const reveal = (s: GameState) =>
    run(s, { type: 'ResolveWeakness', investigator: TOMMY, code: LOOSE_CANNON })

  it('discards each Firearm asset you control, or loses 5 resources', () => {
    const s = put(put(put(tommy({ resources: 7 }), '60158'), M1911), '60159')
    const discarded = skip(choose(reveal(s), 'choice.looseCannonDiscard'))
    expect(asset(discarded, '60158')).toBeUndefined()
    expect(asset(discarded, M1911)).toBeUndefined()
    expect(asset(discarded, '60159')).toBeDefined()
    expect(me(discarded).resources).toBe(7)
    const lost = skip(choose(reveal(s), 'choice.looseCannonLose'))
    expect(me(lost).resources).toBe(2)
    expect(asset(lost, M1911)).toBeDefined()
    expect(me(lost).discard).toContain(LOOSE_CANNON)
  })

  it('must lose resources without Firearms, and must discard them without resources', () => {
    expect(me(skip(reveal(tommy({ resources: 3 })))).resources).toBe(0)
    const s = skip(reveal(put(tommy({ resources: 0 }), BECKY)))
    expect(asset(s, BECKY)).toBeUndefined()
  })
})

describe('Overconfident', () => {
  it('enters the threat area, deals 1 damage after each failed test and costs two actions', () => {
    let s = skip(
      run(tommy(), { type: 'ResolveWeakness', investigator: TOMMY, code: OVERCONFIDENT }),
    )
    const t = Object.values(s.treacheries).find((t) => t.code === OVERCONFIDENT)!
    expect(t.placement).toEqual({ type: 'threatArea', investigator: TOMMY })
    s = skip(finish(run(s, effectTest(1))))
    expect(me(s).damage).toBe(0)
    s = skip(finish(run(s, effectTest(9))))
    expect(me(s).damage).toBe(1)
    const discard = availableAbilities(s, TOMMY).find(
      (a) => a.label === 'ability.discardTreachery',
    )!
    expect(discard).toMatchObject({ actions: 2, provokes: true })
  })
})

describe('Restrained', () => {
  const attacked = (card = sturdy) => {
    let s = skip(run(tommy({ resources: 3 }), spawnAt('A', card, TOMMY)))
    s = patch({ hand: [RESTRAINED] }, TOMMY)(s)
    return run(s, {
      type: 'EnemyAttack',
      enemy: enemy(s).id,
      investigator: TOMMY,
      exhaustAfter: false,
    })
  }

  it('after a non-Elite enemy attacks you: evade it and attach; it cannot ready', () => {
    let s = choose(attacked(), 'ability.playCard', { card: 'Restrained' })
    s = skip(s)
    const id = enemy(s).id
    expect(enemy(s)).toMatchObject({ exhausted: true, engagedWith: null })
    const t = Object.values(s.treacheries).find((t) => t.code === RESTRAINED)!
    expect(t).toMatchObject({ owner: TOMMY, placement: { type: 'enemy', enemy: id } })
    expect(me(s).discard).not.toContain(RESTRAINED)
    expect(me(s).resources).toBe(2)
    s = skip(run(s, { type: 'ReadyAll' }))
    s = skip(run(s, { type: 'ReadyEnemy', enemy: id }))
    expect(enemy(s).exhausted).toBe(true)
    // At the end of the round a non-Humanoid enemy loses Restrained.
    s = skip(run(s, { type: 'Forced', trigger: { type: 'roundEnds' } }))
    expect(Object.values(s.treacheries)).toHaveLength(0)
    expect(me(s).discard).toContain(RESTRAINED)
    s = skip(run(s, { type: 'ReadyAll' }))
    expect(enemy(s).exhausted).toBe(false)
  })

  it('stays on a Humanoid enemy and returns to its owner when the enemy is defeated', () => {
    let s = choose(attacked({ ...sturdy, traits: ['Humanoid'] }), 'ability.playCard', {
      card: 'Restrained',
    })
    s = skip(run(skip(s), { type: 'Forced', trigger: { type: 'roundEnds' } }))
    expect(Object.values(s.treacheries)).toHaveLength(1)
    s = skip(run(s, { type: 'DamageEnemy', enemy: enemy(s).id, by: TOMMY, amount: 10 }))
    expect(Object.values(s.treacheries)).toHaveLength(0)
    expect(me(s).discard).toContain(RESTRAINED)
  })

  it('cannot be played after an Elite enemy attacks', () => {
    const s = attacked({ ...sturdy, traits: ['Elite'] })
    expect(s.pending === null || !labels(s).includes('ability.playCard')).toBe(true)
  })
})

describe('Thompson Submachine Gun', () => {
  const armed = () => {
    const s = put(tommy(), THOMPSON)
    return skip(run(s, spawnAt('A', { ...sturdy, fight: 7 }, TOMMY)))
  }

  it('fights with +3 and +1 damage, then may spend 1 ammo to fight again with +1 damage', () => {
    let s = choose(menu(armed()), 'ability.fightWith', { card: 'Thompson Submachine Gun' })
    expect(s.skillTest).toMatchObject({ baseModifier: 3, kind: { extraDamage: 1 } })
    s = finish(s)
    expect(enemy(s).damageTaken).toBe(2)
    s = choose(s, 'choice.thompsonFight', { enemy: 'Ghoul' })
    expect(asset(s, THOMPSON)!.uses).toBe(4)
    expect(s.skillTest).toMatchObject({ baseModifier: 0, kind: { extraDamage: 1 } })
    // 4 combat against 7 fails: no further reaction is offered after the reaction attack.
    s = finish(s)
    expect(enemy(s).damageTaken).toBe(2)
    expect(labels(s)).not.toContain('choice.thompsonFight')
    expect(me(s).actionsRemaining).toBe(2)
  })

  it('the reaction is optional and needs ammo', () => {
    let s = choose(menu(armed()), 'ability.fightWith', { card: 'Thompson Submachine Gun' })
    s = skip(finish(s))
    expect(asset(s, THOMPSON)!.uses).toBe(5)
    let empty = put(tommy(), THOMPSON, { uses: 1 })
    empty = skip(run(empty, spawnAt('A', { ...sturdy, fight: 7 }, TOMMY)))
    empty = finish(choose(menu(empty), 'ability.fightWith', { card: 'Thompson Submachine Gun' }))
    expect(labels(empty)).not.toContain('choice.thompsonFight')
    expect(asset(empty, THOMPSON)!.uses).toBe(0)
  })
})

describe('Vicious Blow (2) reprint', () => {
  it('adds +2 damage when the attack succeeds by 2 or more, under its own code', () => {
    let s = skip(
      run(tommy({ hand: [VICIOUS_BLOW_2] }), spawnAt('A', { ...ghoul, health: 9 }, TOMMY)),
    )
    s = choose(menu(s), 'action.fight')
    s = choose(s, 'choice.commit', { card: 'Vicious Blow' })
    s = finish(s)
    expect(enemy(s).damageTaken).toBe(3)
    expect(me(s).discard).toContain(VICIOUS_BLOW_2)
  })
})
