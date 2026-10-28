// RR: Skill Test Timing, Triggered Abilities, Seal, Exile, Automatic Success, Uses, Permanent.
import {
  dispatch,
  playableCards,
  registerTreachery,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import {
  A_TEST_OF_WILL,
  A_TEST_OF_WILL_2,
  ATYCHIPHOBIA,
  CALLED_BY_THE_MISTS,
  CHERISHED_KEEPSAKE_1,
  clear,
  DARK_HORSE,
  DERRINGER_2,
  DUMB_LUCK,
  DUMB_LUCK_2,
  effectTest,
  GRANNY_ORNE,
  GRANNY_ORNE_3,
  GRIMMS_FAIRY_TALES,
  GRIT_YOUR_TEETH,
  LIVE_AND_LEARN,
  LOOK_WHAT_I_FOUND_2,
  LUCKY_3,
  makeGame,
  NEITHER_RAIN_NOR_SNOW,
  put,
  QUICK_LEARNER,
  RABBITS_FOOT,
  result,
  SCAVENGING,
  SCHOFFNERS_CATALOGUE,
  SHED_A_LIGHT,
  stella,
  STELLA,
  TAKE_HEART,
  through,
  UNRELENTING,
  WILL_TO_SURVIVE,
  WINGING_IT,
  withStella,
} from './testing'

// Stella: willpower 3, intellect 2, combat 3, agility 4.
const ready = (bag: GameState['chaosBag'] = [0]) =>
  withStella(clear(makeGame(false, bag)), { hand: [], resources: 5, damage: 0, horror: 0 })
const asset = (s: GameState, code: string) => Object.values(s.assets).find((a) => a.code === code)
const horror = (n: number): Message => ({
  type: 'TakeDamage',
  investigator: STELLA,
  damage: 0,
  horror: n,
})
const reveal = (s: GameState) =>
  labels(s).includes('choice.revealToken') ? choose(s, 'choice.revealToken') : s

describe('Stella Clark', () => {
  it('after failing during her turn she takes an additional action (once per round)', () => {
    let s = dispatch(ready([-8]), { type: 'BeginTurn', investigator: STELLA })
    s = clear(s)
    s = dispatch(s, effectTest(1))
    s = reveal(s)
    expect(labels(s)).toContain('ability.stella.action')
    s = choose(s, 'ability.stella.action')
    expect(stella(s).actionsRemaining).toBe(4)
    s = dispatch(clear(s), effectTest(1))
    s = reveal(s)
    expect(labels(s)).not.toContain('ability.stella.action')
  })

  it('before her turn this round, the action waits for her turn; after it, nothing', () => {
    let s: GameState = { ...ready([-8]), phase: 'mythos', activeTurn: null }
    s = reveal(dispatch(s, effectTest(1)))
    s = choose(s, 'ability.stella.action')
    expect(stella(s).roundTurnActions).toEqual({ round: s.round, amount: 1 })
    s = dispatch(clear({ ...s, phase: 'investigation' }), {
      type: 'BeginTurn',
      investigator: STELLA,
    })
    expect(stella(s).actionsRemaining).toBe(4)
    let after: GameState = { ...ready([-8]), phase: 'enemy', activeTurn: null }
    after = reveal(dispatch(after, effectTest(1)))
    expect(labels(after)).not.toContain('ability.stella.action')
  })

  it('[elder_sign]: +1, or she automatically fails to heal 1 damage and 1 horror', () => {
    let s = withStella(ready(['elderSign']), { damage: 2, horror: 2 })
    s = reveal(dispatch(s, effectTest(5)))
    s = choose(s, 'choice.stella.resolve')
    expect(result(through(s))).toBe('log.testSuccess')
    s = withStella(ready(['elderSign']), { damage: 2, horror: 2 })
    s = reveal(dispatch(s, effectTest(1)))
    s = through(choose(s, 'choice.stella.fail'))
    expect(result(s)).toBe('log.testFailure')
    expect([stella(s).damage, stella(s).horror]).toEqual([1, 1])
  })
})

describe('Neither Rain nor Snow', () => {
  // RR ST.7: results are applied in the testing investigator's chosen order.
  it.each(['04201', TAKE_HEART])(
    'can resolve Take Heart (%s) before canceling remaining effects',
    (code) => {
      let s = withStella(ready([-8]), {
        hand: [NEITHER_RAIN_NOR_SNOW, code],
        deck: ['01088', '01089', '01090'],
      })
      s = dispatch(s, effectTest(9, [horror(2)]))
      s = choose(s, 'choice.commit', { card: 'Neither Rain nor Snow' })
      s = choose(s, 'choice.commit', { card: 'Take Heart' })
      s = { ...s, skillTest: { ...s.skillTest!, tokenOnFail: [horror(1)] } }
      s = reveal(s)
      for (
        let n = 0;
        n < 20 && s.pending?.question.prompt !== 'prompt.orderCancelableTestResults';
        n++
      )
        s = choose(s, labels(s).includes('choice.skip') ? 'choice.skip' : labels(s).at(-1)!)
      expect(s.pending?.question.prompt).toBe('prompt.orderCancelableTestResults')
      s = choose(s, 'choice.card', { card: 'Take Heart' })
      expect(stella(s).hand).toHaveLength(2)
      expect(stella(s).resources).toBe(7)
      expect(labels(s)).not.toContain('choice.card')
      s = through(choose(s, 'choice.cancelRemainingTestResults'))
      expect(stella(s).horror).toBe(0)
      expect(result(s)).toBe('log.testFailure')
    },
  )

  it('does not undo token consequences resolved before cancellation', () => {
    let s = withStella(ready([-8]), { hand: [NEITHER_RAIN_NOR_SNOW] })
    s = dispatch(s, effectTest(9, [horror(2)]))
    s = choose(s, 'choice.commit', { card: 'Neither Rain nor Snow' })
    s = { ...s, skillTest: { ...s.skillTest!, tokenOnFail: [horror(1)] } }
    s = reveal(s)
    for (
      let n = 0;
      n < 20 && s.pending?.question.prompt !== 'prompt.orderCancelableTestResults';
      n++
    )
      s = choose(s, labels(s).includes('choice.skip') ? 'choice.skip' : labels(s).at(-1)!)
    s = choose(s, 'choice.resolveTokenConsequences')
    expect(stella(s).horror).toBe(1)
    expect(labels(s)).not.toContain('choice.resolveTokenConsequences')
    s = through(choose(s, 'choice.cancelRemainingTestResults'))
    expect(stella(s).horror).toBe(1)
  })

  it('preserves Stella, Atychiphobia and Rabbit’s Foot after-failure abilities', () => {
    let s = dispatch(ready([-8]), { type: 'BeginTurn', investigator: STELLA })
    s = dispatch(clear(s), put(RABBITS_FOOT))
    s = dispatch(clear(s), { type: 'ResolveWeakness', investigator: STELLA, code: ATYCHIPHOBIA })
    s = withStella(clear(s), { hand: [NEITHER_RAIN_NOR_SNOW], deck: ['01088'] })
    s = dispatch(s, effectTest(9, [horror(2)]))
    s = choose(s, 'choice.commit', { card: 'Neither Rain nor Snow' })
    s = reveal(s)
    expect(stella(s).horror).toBe(1)
    expect(labels(s)).toContain('ability.stella.action')
    expect(labels(s)).toContain('ability.drawCards')
    s = choose(s, 'ability.stella.action')
    s = choose(s, 'ability.drawCards', { n: 1 })
    s = through(s)
    expect(stella(s).hand).toContain('01088')
    expect(stella(s).actionsRemaining).toBe(4)
    expect(stella(s).horror).toBe(1)
  })

  it('cancels the effects of the failed test, chaos tokens and committed cards included', () => {
    let s = withStella(ready([-8]), { hand: [NEITHER_RAIN_NOR_SNOW, TAKE_HEART] })
    s = dispatch(s, effectTest(9, [horror(2)]))
    s = choose(s, 'choice.commit', { card: 'Neither Rain nor Snow' })
    s = choose(s, 'choice.commit', { card: 'Take Heart' })
    s = { ...s, skillTest: { ...s.skillTest!, tokenOnFail: [horror(1)] } }
    s = through(reveal(s))
    expect(result(s)).toBe('log.testFailure')
    expect(stella(s).horror).toBe(0)
    expect(stella(s).hand).toEqual([])
    expect(stella(s).resources).toBe(5)
    expect(s.log.some((e) => e.key === 'log.failedTestEffectsCanceled')).toBe(true)
    // Without it, the failure applies.
    s = through(reveal(dispatch(ready([-8]), effectTest(9, [horror(2)]))))
    expect(stella(s).horror).toBe(2)
  })

  it.each(['alert', 'retaliate'] as const)('also cancels the %s attack', (keyword) => {
    let s = dispatch(ready([-8]), spawnAt('A', { ...ghoul, evade: 9, keywords: [keyword] }, STELLA))
    s = withStella(s, { hand: [NEITHER_RAIN_NOR_SNOW] })
    const enemy = Object.keys(s.enemies)[0]!
    s = dispatch(s, {
      type: 'BeginSkillTest',
      investigator: STELLA,
      skill: 'agility',
      difficulty: 9,
      kind: keyword === 'alert' ? { type: 'evade', enemy } : { type: 'fight', enemy },
    })
    s = choose(s, 'choice.commit', { card: 'Neither Rain nor Snow' })
    s = through(reveal(s))
    expect([stella(s).damage, stella(s).horror]).toEqual([0, 0])
  })
})

describe('weaknesses', () => {
  const inThreat = (code: string) => {
    let s = ready([0])
    s = dispatch(s, { type: 'ResolveWeakness', investigator: STELLA, code })
    return clear(s)
  }

  it('Called by the Mists: 1 damage after initiating a test of difficulty 4 or more', () => {
    let s = inThreat(CALLED_BY_THE_MISTS)
    s = through(reveal(dispatch(s, effectTest(3))))
    expect(stella(s).damage).toBe(0)
    s = through(reveal(dispatch(clear(s), effectTest(4))))
    expect(stella(s).damage).toBe(1)
  })

  it('Atychiphobia: 1 horror after failing; two actions discard each weakness', () => {
    let s = inThreat(ATYCHIPHOBIA)
    s = through(reveal(dispatch(s, effectTest(9))))
    expect(stella(s).horror).toBe(1)
    s = dispatch(clear(s), { type: 'PlayerWindow', investigator: STELLA })
    expect(labels(s)).toContain('ability.discardTreachery')
  })
})

describe('Survivor assets', () => {
  it("Grimm's Fairy Tales heals 1 horror after failing by 2 or more", () => {
    let s = withStella(dispatch(ready([0]), put(GRIMMS_FAIRY_TALES)), { horror: 2 })
    s = reveal(dispatch(clear(s), effectTest(6)))
    s = choose(s, 'ability.grimmsFairyTales', { name: 'Stella Clark' })
    expect(stella(s).horror).toBe(1)
    expect(asset(s, GRIMMS_FAIRY_TALES)!.uses).toBe(3)
  })

  it('Granny Orne: +1 [willpower]; the test fails by 1 more (or less)', () => {
    let s = dispatch(ready([0]), put(GRANNY_ORNE))
    s = dispatch(clear(s), {
      ...effectTest(6),
      kind: {
        type: 'effect',
        source: 'test',
        onSuccess: [],
        onFail: [],
        onFailEach: [{ type: 'GainResources', investigator: STELLA, amount: 1 }],
      },
    })
    s = reveal(s)
    s = choose(s, 'ability.grannyOrne', { name: 'Stella Clark' })
    s = through(choose(s, 'choice.failByMore'))
    // Agilidad 4 contra 6: falla por 2 y, con la Abuelita, por 3.
    expect(stella(s).resources).toBe(8)
  })

  it('Granny Orne (3): +1 skill value can turn the failure into a success', () => {
    let s = dispatch(ready([0]), put(GRANNY_ORNE_3))
    s = reveal(dispatch(clear(s), effectTest(5)))
    s = choose(s, 'ability.grannyOrne3', { name: 'Stella Clark' })
    s = through(choose(s, 'choice.skillValuePlus'))
    expect(result(s)).toBe('log.testSuccess')
  })

  it("Rabbit's Foot (60510) behaves as 01075; Scavenging returns an Item", () => {
    let s = dispatch(ready([-8]), put(RABBITS_FOOT))
    s = withStella(clear(s), { deck: ['01088'] })
    s = reveal(dispatch(s, effectTest(9)))
    s = through(choose(s, 'ability.drawCards', { n: 1 }))
    expect(stella(s).hand).toContain('01088')
    let t = dispatch(ready([0]), put(SCAVENGING))
    t = withStella(clear(t), { discard: ['60505'] })
    t = dispatch(t, {
      type: 'BeginSkillTest',
      investigator: STELLA,
      skill: 'intellect',
      difficulty: 0,
      kind: { type: 'investigate', location: 'A' },
    })
    t = reveal(t)
    t = choose(t, 'ability.scavenging')
    t = through(choose(t, 'choice.takeCard', { card: '.18 Derringer' }))
    expect(stella(t).hand).toContain('60505')
  })

  it('.18 Derringer (2): failing returns the ammo and primes +1 for its next attack', () => {
    let s = dispatch(ready([-8]), put(DERRINGER_2))
    s = dispatch(clear(s), spawnAt('A', { ...ghoul, fight: 9, health: 9 }, STELLA))
    s = dispatch(s, { type: 'PlayerWindow', investigator: STELLA })
    s = through(reveal(choose(s, 'ability.fightWith', { card: '.18 Derringer', enemy: 'Ghoul' })))
    expect(asset(s, DERRINGER_2)!.uses).toBe(3)
    expect(asset(s, DERRINGER_2)!.nextFightBonus).toBe(1)
    s = dispatch(clear(s), { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(asset(s, DERRINGER_2)!.nextFightBonus).toBeUndefined()
  })

  it('Cherished Keepsake (1) is exiled when defeated', () => {
    let s = dispatch(ready(), put(CHERISHED_KEEPSAKE_1))
    const id = asset(s, CHERISHED_KEEPSAKE_1)!.id
    s = dispatch(clear(s), { type: 'DamageAsset', asset: id, damage: 0, horror: 4 })
    expect(asset(s, CHERISHED_KEEPSAKE_1)).toBeUndefined()
    expect(stella(s).discard).not.toContain(CHERISHED_KEEPSAKE_1)
    expect(s.exiled).toEqual([{ investigator: STELLA, code: CHERISHED_KEEPSAKE_1 }])
  })

  it('Dark Horse: +1 to each skill without resources; the upkeep resources may be declined', () => {
    let s = withStella(dispatch(ready([0]), put(DARK_HORSE)), { resources: 0 })
    s = through(reveal(dispatch(clear(s), effectTest(5))))
    expect(result(s)).toBe('log.testSuccess')
    s = dispatch(clear(s), { type: 'GainResources', investigator: STELLA, amount: 1, upkeep: true })
    expect(labels(s)).toEqual(['choice.gainResources', 'choice.declineResources'])
    s = choose(s, 'choice.declineResources')
    expect(stella(s).resources).toBe(0)
  })

  it('Quick Learner: +1 difficulty before the first action resolves, -1 from the third', () => {
    const at = (taken: number) => {
      let s = dispatch(ready([0]), put(QUICK_LEARNER))
      s = withStella(dispatch(clear(s), { type: 'BeginTurn', investigator: STELLA }), {
        actionsTaken: taken,
      })
      s = through(reveal(dispatch(clear(s), effectTest(4))))
      return s.log.findLast((e) => e.key.startsWith('log.test'))?.params?.difficulty
    }
    expect([at(0), at(1), at(3)]).toEqual([5, 4, 3])
  })

  it("Schoffner's Catalogue: its secrets pay for Item assets", () => {
    let s = dispatch(ready(), put(SCHOFFNERS_CATALOGUE))
    s = withStella(clear(s), { resources: 1, hand: ['60505'] })
    expect(playableCards(s, STELLA, false)).toContain('60505')
    s = dispatch(s, { type: 'PlayCard', investigator: STELLA, code: '60505' })
    s = choose(s, 'choice.payWithUses', { n: 2 })
    expect(stella(s).resources).toBe(0)
    expect(asset(s, SCHOFFNERS_CATALOGUE)!.uses).toBe(3)
    expect(asset(s, '60505')).toBeDefined()
  })
})

describe('Survivor events and skills', () => {
  it('Will to Survive: no chaos tokens for the next test this turn', () => {
    let s = dispatch(ready([-8]), { type: 'BeginTurn', investigator: STELLA })
    s = withStella(clear(s), { hand: [WILL_TO_SURVIVE] })
    s = dispatch(s, { type: 'PlayCard', investigator: STELLA, code: WILL_TO_SURVIVE })
    s = through(reveal(dispatch(clear(s), effectTest(4))))
    expect(result(s)).toBe('log.testSuccess')
    expect(s.log.findLast((e) => e.key === 'log.testSuccess')?.params?.tokens).toBe('')
  })

  it('Grit Your Teeth: +1 to each skill for the rest of the round', () => {
    let s = withStella(ready([-8]), { hand: [GRIT_YOUR_TEETH] })
    s = reveal(dispatch(s, effectTest(9)))
    s = through(choose(s, 'ability.playCard', { card: 'Grit Your Teeth' }))
    expect(stella(s).roundSkillBonuses).toHaveLength(4)
  })

  it('Live and Learn: the failed test is attempted again with +2', () => {
    let s = withStella(ready([-1]), { hand: [LIVE_AND_LEARN] })
    s = choose(reveal(dispatch(s, effectTest(5))), 'choice.skip')
    s = choose(s, 'ability.playCard', { card: 'Live and Learn' })
    s = through(reveal(s))
    expect(s.log.filter((e) => e.key === 'log.testFailure')).toHaveLength(1)
    expect(result(s)).toBe('log.testSuccess')
  })

  it('Lucky! (3): +3 and the tester draws 1 card', () => {
    let s = withStella(ready([0]), { hand: [LUCKY_3], deck: ['01088'] })
    s = reveal(dispatch(s, effectTest(7)))
    s = through(choose(s, 'ability.playCard', { card: 'Lucky!' }))
    expect(result(s)).toBe('log.testSuccess')
    expect(stella(s).hand).toContain('01088')
  })

  it('Dumb Luck: the evaded enemy goes on top (level 2: bottom) of the encounter deck', () => {
    for (const [code, failBy, top] of [
      [DUMB_LUCK, 2, true],
      [DUMB_LUCK_2, 3, false],
    ] as const) {
      let s = dispatch(
        ready([0]),
        spawnAt('A', { ...ghoul, name: 'Lurker', evade: 4 + failBy }, STELLA),
      )
      s = withStella(s, { hand: [code] })
      const enemy = Object.keys(s.enemies)[0]!
      s = dispatch(s, {
        type: 'BeginSkillTest',
        investigator: STELLA,
        skill: 'agility',
        difficulty: 4 + failBy,
        kind: { type: 'evade', enemy },
      })
      s = through(choose(reveal(s), 'ability.playCard', { card: 'Dumb Luck' }))
      expect(Object.keys(s.enemies)).toHaveLength(0)
      const deck = s.encounterDeck
      expect((top ? deck[0] : deck.at(-1))!.name).toBe('Lurker')
    }
  })

  it('A Test of Will: a successful test cancels the drawn treachery; level 2 is exiled on a fail', () => {
    registerTreachery({
      code: 'test-stella-trap',
      revelation: (_s, by) => [{ type: 'TakeDamage', investigator: by, damage: 0, horror: 2 }],
    })
    const draw = (s: GameState): GameState =>
      dispatch(s, {
        type: 'ResolveEncounterCard',
        investigator: STELLA,
        card: { kind: 'treachery', code: 'test-stella-trap', name: 'Trap', keywords: [] },
      })
    let s = draw(withStella(ready([0]), { hand: [A_TEST_OF_WILL] }))
    s = through(choose(s, 'ability.playCard', { card: 'A Test of Will' }), 'choice.revealToken')
    expect(stella(s).horror).toBe(0)
    let t = draw(withStella(ready([-8]), { hand: [A_TEST_OF_WILL_2] }))
    t = through(choose(t, 'ability.playCard', { card: 'A Test of Will' }), 'choice.revealToken')
    expect(stella(t).horror).toBe(0)
    expect(t.exiled).toEqual([{ investigator: STELLA, code: A_TEST_OF_WILL_2 }])
  })

  it('"Look what I found!" (2): 2 clues among your location and connecting ones', () => {
    let s = withStella(ready([-1]), { hand: [LOOK_WHAT_I_FOUND_2] })
    s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, revealed: true, clues: 1 } } }
    s = dispatch(s, {
      type: 'BeginSkillTest',
      investigator: STELLA,
      skill: 'intellect',
      difficulty: 4,
      kind: { type: 'investigate', location: 'A' },
    })
    s = choose(reveal(s), 'ability.playCard', { card: '"Look what I found!"' })
    s = choose(s, 'choice.discoverAt', { location: 'Room A' })
    s = through(choose(s, 'choice.discoverAt', { location: 'Room B' }))
    expect(stella(s).clues).toBe(2)
  })

  it('Winging It from the discard pile: 1 additional clue, then shuffled into the deck', () => {
    let s = withStella(ready([0]), { discard: [WINGING_IT], deck: [] })
    expect(playableCards(s, STELLA, false)).toContain(WINGING_IT)
    s = dispatch(s, { type: 'PlayCard', investigator: STELLA, code: WINGING_IT })
    s = through(reveal(s))
    expect(stella(s).clues).toBe(2)
    expect(stella(s).discard).not.toContain(WINGING_IT)
    expect(stella(s).deck).toContain(WINGING_IT)
  })

  it('Unrelenting seals up to 3 tokens, draws 2 if all are +1/0/[elder_sign], then releases them', () => {
    let s = withStella(ready([1, 0, 'elderSign', -4, 'autoFail']), {
      hand: [UNRELENTING],
      deck: ['01088', '01089'],
    })
    s = dispatch(s, effectTest(1))
    s = choose(s, 'choice.commit', { card: 'Unrelenting' })
    s = choose(s, 'choice.sealToken', { token: '1' })
    s = choose(s, 'choice.sealToken', { token: '0' })
    expect(labels(s)).not.toContain('choice.sealToken:autoFail')
    s = choose(s, 'choice.sealToken', { token: 'elderSign' })
    expect(stella(s).hand).toEqual(['01088', '01089'])
    expect(s.sealed).toHaveLength(3)
    s = through(reveal(s))
    expect(s.sealed ?? []).toEqual([])
    expect([...s.chaosBag].map(String).sort()).toEqual(['-4', '0', '1', 'autoFail', 'elderSign'])
  })

  it('Shed a Light: an investigation of difficulty 0 succeeds without tokens and gains clues', () => {
    let s = withStella(ready(['autoFail']), { hand: [SHED_A_LIGHT] })
    s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, revealed: true, clues: 1 } } }
    s = dispatch(s, {
      type: 'BeginSkillTest',
      investigator: STELLA,
      skill: 'intellect',
      difficulty: 0,
      kind: { type: 'investigate', location: 'A' },
    })
    s = choose(s, 'ability.playFastFor', { name: 'Stella Clark', card: 'Shed a Light' })
    s = choose(s, 'ability.playCard', { card: 'Shed a Light' })
    s = choose(s, 'choice.discoverAt', { location: 'Room B' })
    s = through(s, 'choice.revealToken')
    expect(result(s)).toBe('log.testSuccess')
    expect(stella(s).clues).toBe(3)
  })
})
