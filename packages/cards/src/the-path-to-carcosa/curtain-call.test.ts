import {
  availableAbilities,
  createGame,
  getInvestigator,
  scenarioBehavior,
  type Difficulty,
  type GameState,
  type ScenarioOutcome,
} from '@lcg/engine'
import {
  choose,
  during,
  keep,
  spawnAt,
  testInvestigator,
  testScenario,
  throughSetup,
} from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { CURTAIN_CALL } from './curtain-call'
import { CARCOSA_COUNTERS, carcosaBelief, carcosaCount, markCarcosa } from './log'
import {
  STRANGER_DEFEATS,
  theManInThePallidMask,
  THE_MAN_IN_THE_PALLID_MASK,
} from './the-man-in-the-pallid-mask'

/** Fixture genérica: comprueba reglas registradas sin habilitar un escenario incompleto. */
function game(difficulty: Difficulty = 'standard', players = 1, scenarioId = CURTAIN_CALL) {
  let state = throughSetup(
    createGame({
      seed: 2,
      interactive: true,
      difficulty,
      investigators: ['a', 'b', 'c', 'd'].slice(0, players).map((id) => testInvestigator(id)),
      scenario: testScenario({ id: scenarioId, encounterDeck: [], chaosBag: [0] }),
    }),
  )
  if (state.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    state = choose(state, 'choice.investigator', { name: 'A' })
  return state
}
const tokenEffect = (state: GameState, token: 'skull' | 'cultist' | 'tablet' | 'elderThing') =>
  scenarioBehavior(CURTAIN_CALL)!.tokenEffect!(state, token, 'a')

// Guía ES, p. 2: "Dudas y Convicciones". RR: "Campaign Play", registro compartido.
describe('Carcosa: shared campaign counters', () => {
  it('keeps doubt and conviction independent, preserves ties and accumulates queued marks', () => {
    const initial = game('standard', 4)
    expect(carcosaBelief(initial.campaignLog)).toBe('tie')
    const marked = during(
      initial,
      keep,
      markCarcosa('doubt'),
      markCarcosa('doubt'),
      markCarcosa('conviction'),
    )
    expect(carcosaCount(marked.campaignLog, 'doubt')).toBe(2)
    expect(carcosaCount(marked.campaignLog, 'conviction')).toBe(1)
    expect(carcosaBelief(marked.campaignLog)).toBe('doubt')
    const tied = during(marked, keep, markCarcosa('conviction'))
    expect(carcosaBelief(tied.campaignLog)).toBe('tie')
    expect(carcosaBelief(during(tied, keep, markCarcosa('conviction')).campaignLog)).toBe(
      'conviction',
    )
    expect(tied.campaignLog!.notes.filter((n) => n === CARCOSA_COUNTERS.doubt)).toHaveLength(1)
    expect(Object.values(tied.campaignLog!.investigators).every((i) => !('doubt' in i))).toBe(true)
    expect(carcosaBelief(JSON.parse(JSON.stringify(tied)).campaignLog)).toBe('tie')
  })
  it('zero marks leave the log untouched; invalid amounts are rejected', () => {
    const initial = game()
    expect(during(initial, keep, markCarcosa('chasing', 0)).campaignLog).toEqual(
      initial.campaignLog,
    )
    expect(() => markCarcosa('doubt', -1)).toThrow()
    expect(() => markCarcosa('doubt', 1.5)).toThrow()
  })
})

// RR: "Chaos Tokens", ST.4; referencia 03043, ambas caras.
describe('Curtain Call: symbol reference', () => {
  it.each(['easy', 'standard', 'hard', 'expert'] as const)(
    '%s skull follows the investigator’s current horror',
    (difficulty) => {
      for (const horror of [0, 1, 2, 3, 5]) {
        const initial = game(difficulty)
        initial.investigators[0]!.horror = horror
        expect(tokenEffect(initial, 'skull').modifier).toBe(
          difficulty === 'easy' || difficulty === 'standard'
            ? -(horror >= 3 ? 3 : 1)
            : -Math.max(1, horror),
        )
      }
    },
  )
  it.each(['cultist', 'tablet', 'elderThing'] as const)(
    '%s places horror on the location, then harms investigators there',
    (token) => {
      let state = game('standard', 2)
      expect(tokenEffect(state, token).modifier).toBe(-4)
      state = during(state, keep, ...tokenEffect(state, token).immediate!)
      expect(state.locations.A!.horror).toBe(1)
      expect(getInvestigator(state, 'a').horror).toBe(0)
      state = during(state, keep, ...tokenEffect(state, token).immediate!)
      expect(getInvestigator(state, 'a').horror).toBe(1)
      expect(getInvestigator(state, 'b').horror).toBe(0)
      expect(state.locations.A!.horror).toBe(1)
      state = during(
        state,
        (s) => ({
          ...s,
          investigators: s.investigators.map((i) => (i.id === 'a' ? { ...i, location: 'B' } : i)),
        }),
        ...tokenEffect(state, token).immediate!,
      )
      expect(state.locations.B!.horror).toBe(1)
      expect(getInvestigator(state, 'a').horror).toBe(1)
      expect(tokenEffect(game('hard'), token).modifier).toBe(-5)
      expect(tokenEffect(game('expert'), token).modifier).toBe(-5)
    },
  )
  it('recalculates between consecutive effects instead of overwriting location horror', () => {
    const initial = game()
    const result = during(
      initial,
      keep,
      ...tokenEffect(initial, 'cultist').immediate!,
      ...tokenEffect(initial, 'tablet').immediate!,
    )
    expect(getInvestigator(result, 'a').horror).toBe(1)
    expect(result.locations.A!.horror).toBe(1)
  })
})

// Guía ES pp. 5–6; RR: "Campaign Play", "Victory Display".
describe('Curtain Call: resolutions', () => {
  const cases: {
    outcome: ScenarioOutcome
    belief: 'doubt' | 'conviction' | 'tie'
    marks: number
    note?: string
  }[] = [
    { outcome: { type: 'noResolution' }, belief: 'tie', marks: 3 },
    {
      outcome: { type: 'resolution', resolution: 1 },
      belief: 'conviction',
      marks: 2,
      note: 'carcosaWarnedPolice',
    },
    {
      outcome: { type: 'resolution', resolution: 2 },
      belief: 'doubt',
      marks: 2,
      note: 'carcosaAvoidedPolice',
    },
  ]
  for (const example of cases) {
    it.each([1, 2, 3, 4])(`${JSON.stringify(example.outcome)} with %i investigators`, (players) => {
      let state = during(
        game('standard', players),
        (s) => ({
          ...s,
          victoryPoints: 2,
          locations: Object.fromEntries(
            Object.entries(s.locations).map(([key, location]) => [
              key,
              { ...location, clues: 0, victory: 1, revealed: true },
            ]),
          ),
          scenarioMeta: { [STRANGER_DEFEATS]: 3, 'carcosa:stoleFromBoxOffice': 1 },
        }),
        { type: 'EndScenario', outcome: example.outcome },
      )
      expect(state.pending?.question.prompt).toBe('prompt.story')
      state = choose(state, 'choice.continue')
      expect(state.pending).toBeNull()
      expect(state.outcome).toEqual(example.outcome)
      expect(carcosaBelief(state.campaignLog)).toBe(example.belief)
      expect(carcosaCount(state.campaignLog, 'chasing')).toBe(example.marks)
      if (example.note) expect(state.campaignLog!.notes).toContain(example.note)
      expect(state.campaignLog!.notes.includes('carcosaPoliceSuspicious')).toBe(
        example.belief === 'conviction',
      )
      expect(state.campaignLog!.notes).toContain('carcosaStrangerIsOnToYou')
      expect(state.campaignLog!.investigators.a!.storyAssets).toEqual([THE_MAN_IN_THE_PALLID_MASK])
      for (const [id, record] of Object.entries(state.campaignLog!.investigators)) {
        expect(record.xp).toBe(5)
        expect(record.physicalTrauma).toBe(0)
        expect(record.mentalTrauma).toBe(0)
        if (id !== 'a') expect(record.storyAssets).toEqual([])
      }
    })
  }
  it('no resolution adds only defeats from this scenario and preserves previous campaign marks', () => {
    let state = during(
      game(),
      keep,
      markCarcosa('chasing', 4),
      { type: 'SetScenarioMeta', key: STRANGER_DEFEATS, value: 0 },
      { type: 'EndScenario', outcome: { type: 'noResolution' } },
    )
    state = choose(state, 'choice.continue')
    expect(carcosaCount(state.campaignLog, 'chasing')).toBe(4)
  })
  it('resolves normally when every investigator has been defeated', () => {
    let state = during(game(), keep, { type: 'DefeatInvestigator', investigator: 'a' })
    expect(state.pending?.question.prompt).toBe('prompt.story')
    state = choose(state, 'choice.continue')
    expect(state.outcome).toEqual({ type: 'noResolution' })
    expect(state.campaignLog!.investigators.a!.storyAssets).toContain(THE_MAN_IN_THE_PALLID_MASK)
  })
  it('warning the police without stealing from the box office does not create suspicion', () => {
    let state = during(game(), keep, {
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: 1 },
    })
    state = choose(state, 'choice.continue')
    expect(state.campaignLog!.notes).not.toContain('carcosaPoliceSuspicious')
  })
})

// RR: "Weakness", "Spawn", "Investigate", "Instead"; carta 03059.
describe('The Man in the Pallid Mask', () => {
  it('spawns as an owned weakness at the farthest reachable location', () => {
    const state = during(game(), keep, {
      type: 'ResolveWeakness',
      investigator: 'a',
      code: THE_MAN_IN_THE_PALLID_MASK,
    })
    expect(Object.values(state.enemies)).toHaveLength(1)
    expect(Object.values(state.enemies)[0]).toMatchObject({
      code: THE_MAN_IN_THE_PALLID_MASK,
      owner: 'a',
      location: 'C',
      engagedWith: null,
      fight: 4,
      health: 3,
      evade: 4,
    })
  })
  it('uses the nearest of all investigators, includes occupied locations and lets the lead break ties', () => {
    let state = during(
      game('standard', 2),
      (s) => ({
        ...s,
        investigators: s.investigators.map((i) => (i.id === 'b' ? { ...i, location: 'C' } : i)),
      }),
      spawnAt('B'),
    )
    state = during(state, keep, {
      type: 'ResolveWeakness',
      investigator: 'a',
      code: THE_MAN_IN_THE_PALLID_MASK,
    })
    expect(
      Object.values(state.enemies).find((e) => e.code === THE_MAN_IN_THE_PALLID_MASK)?.location,
    ).toBe('B')
    let tied = during(
      game('standard', 3),
      (s) => ({
        ...s,
        investigators: s.investigators.map((i, n) => ({ ...i, location: ['A', 'B', 'C'][n]! })),
      }),
      { type: 'ResolveWeakness', investigator: 'a', code: THE_MAN_IN_THE_PALLID_MASK },
    )
    expect(tied.pending?.question.prompt).toBe('prompt.spawnTied')
    expect(tied.pending?.question.promptParams?.enemy).toBeTruthy()
    expect(tied.pending?.question.choices).toHaveLength(3)
    tied = choose(tied, 'choice.location', { location: 'Room C' })
    expect(Object.values(tied.enemies)[0]?.location).toBe('C')
  })
  it('investigates with modified shroud +2, defeats instead of discovering clues, and tracks the defeat', () => {
    let state = during(
      game(),
      (s) => ({
        ...s,
        investigators: s.investigators.map((i) => ({
          ...i,
          skills: { ...i.skills, intellect: 10 },
        })),
      }),
      spawnAt('A', theManInThePallidMask),
    )
    const enemy = Object.values(state.enemies)[0]!
    state = during(state, keep, { type: 'ModifyShroud', location: 'A', amount: 1 })
    const ability = availableAbilities(state, 'a').find((a) => a.key === `${enemy.id}:investigate`)!
    const clues = state.locations.A!.clues
    state = during(state, keep, ...ability.then)
    expect(state.skillTest?.difficulty).toBe(5)
    state = choose(state, 'choice.revealToken')
    state = choose(state, 'choice.applyResults')
    expect(state.enemies[enemy.id]).toBeUndefined()
    expect(state.locations.A!.clues).toBe(clues)
    expect(getInvestigator(state, 'a').clues).toBe(0)
    expect(state.scenarioMeta?.[STRANGER_DEFEATS]).toBe(1)
  })
  it('defeats of the weakness in later scenarios add one campaign mark and return it to its owner’s discard', () => {
    let state = during(
      game('standard', 1, 'test'),
      (s) => ({ ...s, campaignLog: { ...s.campaignLog!, notes: ['carcosaStrangerIsOnToYou'] } }),
      { type: 'ResolveWeakness', investigator: 'a', code: THE_MAN_IN_THE_PALLID_MASK },
    )
    const enemy = Object.values(state.enemies)[0]!
    state = during(state, keep, { type: 'DefeatEnemy', enemy: enemy.id, by: 'a' })
    expect(carcosaCount(state.campaignLog, 'chasing')).toBe(1)
    expect(getInvestigator(state, 'a').discard).toContain(THE_MAN_IN_THE_PALLID_MASK)
    expect(state.encounterDiscard.some((c) => c.code === THE_MAN_IN_THE_PALLID_MASK)).toBe(false)
  })
  it('failing its investigation leaves the enemy and clues in place', () => {
    let state = during(
      game(),
      (s) => ({ ...s, chaosBag: ['autoFail'] }),
      spawnAt('A', theManInThePallidMask),
    )
    const enemy = Object.values(state.enemies)[0]!
    const clues = state.locations.A!.clues
    const ability = availableAbilities(state, 'a').find((a) => a.key === `${enemy.id}:investigate`)!
    state = during(state, keep, ...ability.then)
    state = choose(choose(state, 'choice.revealToken'), 'choice.applyResults')
    expect(state.enemies[enemy.id]).toBeDefined()
    expect(state.locations.A!.clues).toBe(clues)
    expect(state.scenarioMeta?.[STRANGER_DEFEATS]).toBeUndefined()
  })
})
