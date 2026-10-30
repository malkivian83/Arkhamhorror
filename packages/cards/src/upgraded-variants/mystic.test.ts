import { availableAbilities, playerCardDef, type GameState, type Message } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, hand, me, patch, withAsset } from '../dunwich-pilot/testing'

const name = (code: string) => playerCardDef(code)!.name
const labelled = (s: GameState, label: string) =>
  availableAbilities(s, 'a').filter((a) => a.label === label)
const play = (s: GameState, code: string) =>
  choose(hand(s, code), 'action.playFast', { card: name(code) })
const weak = { willpower: 0, intellect: 3, combat: 3, agility: 3 }

describe('51008 / 08068: heal 2 from among investigators at your location', () => {
  // RR: Activate Action; Uses; Healing.
  it('splits the horror healed by Clarity of Mind (3) between investigators', () => {
    let s = during(game(['a', 'b']), (s) =>
      withAsset(patch({ horror: 1 })(patch({ horror: 2 }, 'b')(s)), '51008'),
    )
    s = choose(s, 'ability.healHorrorAmong', { card: name('51008') })
    s = choose(s, 'choice.healHorrorOf', { name: 'A' })
    // Only B remains injured: the second point needs no choice.
    expect([me(s).horror, s.investigators[1]!.horror]).toEqual([0, 1])
    expect(s.assets['51008']!.uses).toBe(3)
    expect(me(s).actionsRemaining).toBe(2)
  })
  it('may heal both damage from one investigator with Healing Words (3)', () => {
    let s = during(game(['a', 'b']), (s) =>
      withAsset(patch({ damage: 1 })(patch({ damage: 3 }, 'b')(s)), '08068'),
    )
    s = choose(s, 'ability.healDamageAmong', { card: name('08068') })
    s = choose(s, 'choice.healDamageOf', { name: 'B' })
    s = choose(s, 'choice.healDamageOf', { name: 'B' })
    expect([me(s).damage, s.investigators[1]!.damage]).toEqual([1, 1])
  })
  it('heals only what is there and needs an injured investigator here and a charge', () => {
    let s = during(game(['a', 'b']), (s) =>
      withAsset(patch({ damage: 1 })(patch({ damage: 2, location: 'B' }, 'b')(s)), '08068'),
    )
    s = choose(s, 'ability.healDamageAmong', { card: name('08068') })
    expect(me(s).damage).toBe(0)
    expect(s.investigators[1]!.damage).toBe(2)
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
    expect(labelled(s, 'ability.healDamageAmong')).toEqual([])
    s = during(s, (s) => withAsset(patch({ damage: 1 })(s), '08068', { uses: 0 }))
    expect(labelled(s, 'ability.healDamageAmong')).toEqual([])
  })
})

describe('51007 / 02233: Rite of Seeking (2) and (4)', () => {
  // RR ST.3 / ST.8: +2 [willpower]; additional clues; symbols end the turn after results.
  for (const [code, clues] of [
    ['51007', 2],
    ['02233', 3],
  ] as const)
    it(`${code} adds +2 willpower and discovers ${clues} clues`, () => {
      let s = during(game(['a', 'b']), (s) => withAsset(patch({ skills: weak })(s), code))
      s = choose(s, 'ability.investigateWith', { card: name(code) })
      expect(me(s).clues).toBe(clues)
      expect(s.assets[code]!.uses).toBe(2)
      expect(me(s).actionsRemaining).toBe(2)
    })
  it('ends the turn after a symbol, keeping the clues', () => {
    let s = during(game(['a', 'b']), (s) => ({ ...withAsset(s, '02233'), chaosBag: ['skull'] }))
    s = choose(s, 'ability.investigateWith', { card: name('02233') })
    expect(me(s).clues).toBe(3)
    expect(s.activeTurn).not.toBe('a')
  })
})

describe('09093: Moonlight Ritual (2)', () => {
  const doomed = (traits: string[] = []) =>
    during(
      game(['a', 'b']),
      (s) => ({
        ...withAsset(s, '02233', { id: 'b-asset', owner: 'b', doom: 1 }),
        locations: { ...s.locations, A: { ...s.locations.A!, doom: 2 } },
      }),
      spawnAt('A', { ...ghoul, traits }),
    )
  const withEnemyDoom = (s: GameState) => {
    const id = Object.keys(s.enemies)[0]!
    return { ...s, enemies: { ...s.enemies, [id]: { ...s.enemies[id]!, doom: 3 } } }
  }
  // RR: Fast; Doom. Any non-Elite card at your location, controlled or not.
  it('removes all doom from a non-Elite enemy, the location or another investigator asset', () => {
    let s = during(doomed(), withEnemyDoom)
    s = choose(play(s, '09093'), 'choice.enemy', { enemy: 'Ghoul' })
    expect(Object.values(s.enemies)[0]!.doom).toBe(0)
    expect(s.locations.A!.doom).toBe(2)
    s = choose(play(s, '09093'), 'choice.location', { location: 'Room A' })
    expect(s.locations.A!.doom).toBe(0)
    s = play(s, '09093')
    expect(s.assets['b-asset']!.doom).toBe(0)
  })
  it('ignores Elite enemies and cannot be played without doom here', () => {
    const s = play(during(doomed(['Elite']), withEnemyDoom), '09093')
    expect(s.pending?.question.choices.some((c) => c.label === 'choice.enemy')).toBe(false)
    const empty = during(game(), (s) => patch({ hand: ['09093'], resources: 5 })(s))
    expect(empty.pending?.question.choices.some((c) => c.params?.card === name('09093'))).toBe(
      false,
    )
  })
})

describe('60481: Second Sight (5)', () => {
  const open = (changes: Parameters<typeof withAsset>[2] = {}, bag: GameState['chaosBag'] = [0]) =>
    during(game(['a', 'b']), (s) => ({
      ...withAsset(patch({ skills: weak })(s), '60481', changes),
      chaosBag: bag,
      locations: { ...s.locations, B: { ...s.locations.B!, revealed: true, clues: 1 } },
    }))
  const investigate = (s: GameState) =>
    choose(s, 'ability.investigateWith', { card: name('60481') })
  // RR: Investigate; Uses. +2 [willpower]; the charge is optional, here or connecting.
  it('may spend a charge for a clue here or at a connecting location', () => {
    let s = choose(investigate(open()), 'choice.spendChargeForClue')
    expect(me(s).clues).toBe(2)
    expect(s.assets['60481']!.uses).toBe(3)
    s = choose(investigate(open()), 'choice.spendChargeForClueAt', { location: 'Room B' })
    expect(me(s).clues).toBe(2)
    expect(s.locations.B!.clues).toBe(0)
    s = choose(investigate(open()), 'choice.skip')
    expect([me(s).clues, s.assets['60481']!.uses]).toEqual([1, 4])
  })
  it('a cultist removes a charge, or deals 1 horror and discards it without charges', () => {
    let s = investigate(open({}, ['cultist']))
    expect(s.assets['60481']!.uses).toBe(3)
    s = investigate(open({ uses: 0 }, ['cultist']))
    expect(me(s).horror).toBe(1)
    expect(s.assets['60481']).toBeUndefined()
  })
})

describe('60477: Blood Curse (3)', () => {
  const begin = (difficulty: number): Message => ({
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty,
    kind: { type: 'effect', source: 'blood-test', onSuccess: [], onFail: [], onFailEach: [] },
  })
  const open = (difficulty: number) =>
    during(
      game(['a', 'b']),
      (s) => patch({ hand: ['60477'] })(patch({ hand: [] }, 'b')(s)),
      spawnAt('A', { ...ghoul, health: 3 }),
      begin(difficulty),
    )
  // RR: Committing; Dealing Damage. Max 1 per test; the damage is mandatory on success.
  it('deals 1 damage to a chosen card with health at your location if the test succeeds', () => {
    expect(playerCardDef('60477')!.commitLimit).toBe(1)
    let s = choose(open(1), 'choice.commit', { card: name('60477') })
    expect(s.pending?.question.choices.some((c) => c.label === 'choice.investigator')).toBe(true)
    s = choose(s, 'choice.enemy', { enemy: 'Ghoul' })
    expect(Object.values(s.enemies)[0]!.damageTaken).toBe(1)
  })
  it('does nothing if the test fails', () => {
    const s = choose(open(99), 'choice.commit', { card: name('60477') })
    expect(Object.values(s.enemies)[0]!.damageTaken).toBe(0)
    expect(me(s).damage).toBe(0)
  })
})

describe('03268: Suggestion (4)', () => {
  const engaged = (evade: number, uses = 3, traits: string[] = []) =>
    during(
      game(['a', 'b']),
      (s) => withAsset(s, '03268', { uses }),
      spawnAt('A', { ...ghoul, evade, traits }, 'a'),
    )
  const evade = (s: GameState) => choose(s, 'ability.evadeWith', { card: name('03268') })
  // RR: Evade; Uses. The charge is lost below a margin of 2; it stays with no charges.
  it('adds willpower to the evasion and keeps the charge with a margin of 2', () => {
    const s = evade(engaged(4))
    expect(Object.values(s.enemies)[0]!.engagedWith).toBeNull()
    expect(s.assets['03268']!).toMatchObject({ uses: 3, exhausted: true })
  })
  it('removes a charge below that margin and remains in play without charges', () => {
    const s = evade(engaged(5, 1))
    expect(s.assets['03268']!.uses).toBe(0)
  })
  const attack = (s: GameState) =>
    during(s, (s) => s, {
      type: 'EnemyAttack',
      enemy: Object.keys(s.enemies)[0]!,
      investigator: 'a',
      exhaustAfter: true,
    })
  // RR: Cancel; Enemy Attacks. Only non-Elite attacks against you, paying a charge.
  it('spends a charge to cancel a non-Elite attack against you', () => {
    const s = choose(attack(engaged(2)), 'ability.suggestionCancel', { card: name('03268') })
    expect(me(s).damage).toBe(0)
    expect(s.assets['03268']!.uses).toBe(2)
    for (const blocked of [attack(engaged(2, 3, ['Elite'])), attack(engaged(2, 0))]) {
      expect(
        blocked.pending?.question.choices.some((c) => c.label === 'ability.suggestionCancel'),
      ).toBeFalsy()
      expect(me(blocked).damage).toBe(1)
    }
  })
})
