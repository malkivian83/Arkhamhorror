import { availableAbilities, playerCardDef, registerTreachery, type GameState } from '@lcg/engine'
import { choose, during, ghoul, keep, labels, spawnAt, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'

const card = (code: string) => playerCardDef(code)!.name
registerTreachery({
  code: 'test-arcane-trap',
  revelation: (_s, investigator) => [{ type: 'TakeDamage', investigator, damage: 2, horror: 0 }],
})
const trap = { kind: 'treachery' as const, code: 'test-arcane-trap', name: 'Trap', keywords: [] }
const drawTrap = (s: GameState, investigator = 'a') =>
  during(s, keep, { type: 'ResolveEncounterCard', investigator, card: trap })
const all =
  (...fns: ((s: GameState) => GameState)[]) =>
  (s: GameState) =>
    fns.reduce((acc, f) => f(acc), s)
const skills = (n: number) => ({ willpower: n, intellect: n, combat: n, agility: n })
const other = (s: GameState) => Object.keys(s.locations).find((l) => l !== me(s).location)!

describe('08039: Unearth the Ancients (2)', () => {
  // RR: Investigate; "up to 2"; difficulty = combined printed cost; Relic draws.
  it('puts two chosen Seeker assets into play with their combined cost as difficulty', () => {
    let s = during(
      game(),
      all(
        patch({ hand: ['08039', '01030', '01031'], resources: 10, skills: skills(6) }),
        withBag(0),
      ),
    )
    s = choose(s, 'action.play', { card: card('08039') })
    s = choose(s, 'choice.card', { card: card('01030') })
    s = choose(s, 'choice.card', { card: card('01031') })
    expect(s.skillTest?.difficulty).toBe(
      (playerCardDef('01030')!.cost ?? 0) + (playerCardDef('01031')!.cost ?? 0),
    )
    s = choose(s, 'choice.revealToken')
    expect(Object.values(s.assets).map((a) => a.code)).toEqual(
      expect.arrayContaining(['01030', '01031']),
    )
    expect(me(s).clues).toBe(0)
  })
  it('may stop after one asset and is not playable without Seeker assets', () => {
    let s = during(
      game(),
      patch({ hand: ['08039', '01030', '01031'], resources: 10, skills: skills(4) }),
    )
    s = choose(s, 'action.play', { card: card('08039') })
    s = choose(s, 'choice.card', { card: card('01030') })
    s = choose(s, 'choice.skip')
    expect(s.skillTest?.difficulty).toBe(playerCardDef('01030')!.cost ?? 0)
    const none = during(game(), patch({ hand: ['08039', '01025'], resources: 10 }))
    expect(labels(none)).not.toContain('action.play')
  })
})

describe('07158: Blood Pact (0)', () => {
  // RR: Fast; Limits; Doom as a cost. +2 willpower or combat, each once per test.
  it('adds doom for +2 combat, once per test, and is not offered for other skills', () => {
    let s = during(
      game(),
      (s) => withAsset(withBag(0)(patch({ skills: skills(0) })(s)), '07158'),
      spawnAt('A', { ...ghoul, health: 8, fight: 2 }, 'a'),
    )
    s = choose(s, 'action.fight', { enemy: 'Ghoul' })
    s = choose(s, 'ability.bloodPact', { skill: 'combat' })
    expect(s.assets['07158']!.doom).toBe(1)
    expect(labels(s)).not.toContain('ability.bloodPact')
    let t = during(game(), (s) => withAsset(withBag(0)(s), '07158'))
    t = choose(t, 'action.investigate')
    expect(labels(t)).not.toContain('ability.bloodPact')
  })
})

describe('03270: Ward of Protection (2)', () => {
  // RR: Revelation; Cancel. Any investigator's non-weakness treachery; you take 1 horror.
  it("cancels another investigator's revelation and its player takes 1 horror", () => {
    let s = during(
      game(['a', 'b']),
      all(patch({ hand: ['03270'], resources: 5 }), patch({ location: 'B' }, 'b')),
    )
    s = drawTrap(s, 'b')
    s = choose(s, 'ability.playCard', { card: card('03270') })
    expect(s.investigators[1]!.damage).toBe(0)
    expect(me(s).horror).toBe(1)
    expect(me(s).hand).not.toContain('03270')
  })
  it('lets the revelation resolve when not played', () => {
    let s = during(game(), patch({ hand: [], resources: 5 }))
    s = drawTrap(s)
    expect(me(s).damage).toBe(2)
  })
})

describe('03150: Forewarned (1)', () => {
  // RR: "Then": a clue must be placed before canceling the revelation.
  it('places one of your clues on your location and cancels the revelation', () => {
    let s = during(game(), patch({ hand: ['03150'], clues: 2, resources: 5 }))
    const before = s.locations[me(s).location!]!.clues
    s = drawTrap(s)
    s = choose(s, 'ability.playCard', { card: card('03150') })
    expect(me(s).clues).toBe(1)
    expect(s.locations[me(s).location!]!.clues).toBe(before + 1)
    expect(me(s).damage).toBe(0)
  })
  it('is not offered without clues', () => {
    let s = during(game(), patch({ hand: ['03150'], clues: 0, resources: 5 }))
    s = drawTrap(s)
    expect(labels(s)).not.toContain('ability.playCard')
    expect(me(s).damage).toBe(2)
  })
})

describe('60265: De-Escalate', () => {
  // RR: Parley; heal horror equal to the chosen enemy's horror value.
  it('heals horror equal to the enemy horror value', () => {
    let s = during(
      game(),
      patch({ hand: ['60265'], horror: 3, resources: 5 }),
      spawnAt('A', { ...ghoul, horror: 2 }, 'a'),
    )
    s = choose(s, 'action.play', { card: card('60265') })
    expect(me(s).horror).toBe(1)
  })
  it('needs an enemy at your location', () => {
    const s = during(game(), patch({ hand: ['60265'], horror: 3, resources: 5 }))
    expect(labels(s)).not.toContain('action.play')
  })
})

describe('09046: Bizarre Diagnosis', () => {
  // RR: "Then"; heal an investigator or an Ally asset at your location.
  it('places a clue and heals 3 damage from an investigator at your location', () => {
    let s = during(
      game(['a', 'b']),
      all(patch({ hand: ['09046'], clues: 1, resources: 5 }), patch({ damage: 4 }, 'b')),
    )
    s = choose(s, 'action.play', { card: card('09046') })
    expect(me(s).clues).toBe(0)
    expect(s.investigators[1]!.damage).toBe(1)
  })
  it('heals an Ally asset and needs a clue to be played', () => {
    let s = during(game(), (s) =>
      withAsset(patch({ hand: ['09046'], clues: 1, resources: 5 })(s), '01018', { damage: 2 }),
    )
    s = choose(s, 'action.play', { card: card('09046') })
    expect(s.assets['01018']!.damage).toBe(0)
    const none = during(game(), patch({ hand: ['09046'], clues: 0, resources: 5, damage: 2 }))
    expect(labels(none)).not.toContain('action.play')
  })
})

describe('03027: In the Know (1)', () => {
  // RR: Investigate a revealed location as if you were there; clues are discovered there.
  it('investigates another revealed location and discovers its clue', () => {
    let s = during(game(), (s) => {
      const t = withAsset(withBag(0)(patch({ skills: skills(5) })(s)), '03027')
      const id = other(t)
      return {
        ...t,
        locations: { ...t.locations, [id]: { ...t.locations[id]!, revealed: true, clues: 2 } },
      }
    })
    const id = other(s)
    s = choose(s, 'ability.inTheKnow', { location: s.locations[id]!.name })
    expect(me(s).clues).toBe(1)
    expect(s.locations[id]!.clues).toBe(1)
    expect(s.assets['03027']!.uses).toBe(2)
    expect(me(s).location).not.toBe(id)
  })
  it('is not offered without secrets', () => {
    const s = during(game(), (s) => withAsset(s, '03027', { uses: 0 }))
    expect(availableAbilities(s, 'a').filter((o) => o.label === 'ability.inTheKnow')).toEqual([])
  })
})

describe('03265: Guidance', () => {
  // RR: Additional Actions for another investigator yet to take a turn this round.
  it('gives an additional action to another investigator who has yet to take a turn', () => {
    let s = during(game(['a', 'b']), patch({ hand: ['03265'], resources: 5 }))
    s = choose(s, 'action.play', { card: card('03265') })
    expect(s.investigators[1]!.roundTurnActions).toMatchObject({ amount: 1 })
  })
  it('is not playable if the other investigator already took a turn or is elsewhere', () => {
    const done = during(
      game(['a', 'b']),
      all(patch({ hand: ['03265'], resources: 5 }), patch({ turnTaken: true }, 'b')),
    )
    expect(labels(done)).not.toContain('action.play')
    const away = during(
      game(['a', 'b']),
      all(patch({ hand: ['03265'], resources: 5 }), patch({ location: 'B' }, 'b')),
    )
    expect(labels(away)).not.toContain('action.play')
  })
})
