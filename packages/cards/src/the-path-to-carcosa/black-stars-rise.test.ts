import {
  agendaBehavior,
  availableAbilities,
  availableActions,
  createGame,
  enemyBehavior,
  getInvestigator,
  scenarioBehavior,
  shroudOf,
  type Difficulty,
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, labels, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { canPlayNext, finishScenario, startScenario } from '../campaign'
import '../index'
import {
  BLACK_STARS_RISE,
  blackStarsRise,
  CODES,
  riftSeeker,
  tidalTerror,
  type BlackStarsVersion,
} from './black-stars-rise'
import { afterThePallidMask } from './bsr-playthrough.test'
import { SETS } from './encounter-sets'
import { carcosaCount } from './log'
import { VIPS } from './the-last-king'

const IDS = ['a', 'b', 'c', 'd']
type Mod = (s: GameState) => GameState
const ASHLEIGH = VIPS.find((v) => v.key === 'Ashleigh')!.enemy

function game(
  players = 1,
  {
    notes = [],
    difficulty = 'standard',
    version = 'flood',
    seed = 3,
  }: {
    notes?: string[]
    difficulty?: Difficulty
    version?: BlackStarsVersion
    seed?: number
  } = {},
): GameState {
  let state = throughSetup(
    createGame({
      seed,
      interactive: true,
      difficulty,
      investigators: IDS.slice(0, players).map((id) => testInvestigator(id)),
      scenario: blackStarsRise({
        difficulty,
        seed,
        version,
        log: { notes, crossedOut: [], values: {}, chaosTokens: [], investigators: {} },
      }),
      campaignLog: {
        notes,
        crossedOut: [],
        values: {},
        chaosTokens: [],
        investigators: Object.fromEntries(
          IDS.slice(0, players).map((id) => [
            id,
            { xp: 0, physicalTrauma: 0, mentalTrauma: 0, storyAssets: [] },
          ]),
        ),
      },
    }),
  )
  for (
    let n = 0;
    n < 20 && state.pending && state.pending.question.prompt !== 'prompt.chooseAction';
    n++
  )
    state = choose(state, labels(state)[0]!, state.pending.question.choices[0]!.params)
  return state
}

const update =
  (id: string, changes: Partial<GameState['investigators'][number]>): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...changes } : i)),
  })
const placeAt =
  (...where: string[]): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i, n) => ({ ...i, location: where[n] ?? i.location })),
  })
const withBag =
  (...tokens: GameState['chaosBag']): Mod =>
  (s) => ({ ...s, chaosBag: tokens })
const withDoom =
  (first: number, second: number): Mod =>
  (s) => ({ ...s, doom: first, secondAgenda: { ...s.secondAgenda!, doom: second } })
const atAgendas =
  (first: number, second: number): Mod =>
  (s) => ({ ...s, agendaIndex: first, secondAgenda: { ...s.secondAgenda!, index: second } })
const meta =
  (key: string): Mod =>
  (s) => ({ ...s, scenarioMeta: { ...s.scenarioMeta, [key]: 1 } })
const prep = (state: GameState, mods: Mod[], ...messages: Message[]) =>
  during(state, (s) => mods.reduce((next, mod) => mod(next), s), ...messages)
const resolveTest = (state: GameState) =>
  choose(choose(state, 'choice.revealToken'), 'choice.applyResults')
const behavior = () => scenarioBehavior(BLACK_STARS_RISE)!
const enemyOf = (state: GameState, code: string) =>
  Object.values(state.enemies).find((e) => e.code === code)
const spawn = (card: EnemyCard, location: string, engageWith: string | null = null): Message => ({
  type: 'SpawnEnemy',
  card: { ...card },
  location,
  engageWith,
})
const draw = (card: EncounterCard, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card,
})
const treacheryOf = (code: string, traits: string[] = []): EncounterCard => ({
  kind: 'treachery',
  code,
  name: code,
  traits,
  keywords: [],
})
function readAll(state: GameState, pick: (ls: string[]) => number = () => 0): GameState {
  let s = state
  for (let n = 0; n < 40 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    const choice = s.pending.question.choices[pick(labels(s))]!
    s = choose(s, choice.label, choice.params)
  }
  return s
}
/** Revela la Iglesia de la abadía (pone en juego el resto de la abadía). */
const revealChurch = (state: GameState) =>
  readAll(prep(state, [], { type: 'RevealLocation', location: CODES.abbeyChurch }))
const firstCode = (s: GameState) => s.agendas[s.agendaIndex]?.code
const secondCode = (s: GameState) => s.secondAgenda?.agendas[s.secondAgenda.index]?.code

// Guía ES p. 25, "Preparación".
describe('Black Stars Rise: setup', () => {
  for (const players of [1, 2, 3, 4])
    it(`${players} investigator(s): six locations, two agenda decks and no act`, () => {
      const state = game(players)
      expect(Object.keys(state.locations)).toHaveLength(6)
      expect(state.locations[CODES.porteDeLAvancee]).toBeDefined()
      expect(state.locations[CODES.abbeyChurch]).toBeDefined()
      expect(state.investigators.every((i) => i.location === CODES.porteDeLAvancee)).toBe(true)
      expect(Object.keys(state.setAsideLocations)).toHaveLength(5)
      expect(state.agendas.map((a) => a.code)).toEqual([
        CODES.theTideRises,
        CODES.letTheStormRageFlood,
        CODES.theCityFloods,
      ])
      expect(state.secondAgenda!.agendas.map((a) => a.code)).toEqual([
        CODES.theRitualBegins,
        CODES.theEntityAboveFlood,
        CODES.swallowedSky,
      ])
      expect(state.acts).toEqual([])
      // Encuentros: 6 propias, Portentos 6, Byakhee 4, Habitantes 2, Extranjero 3,
      // Secta oscura 6 y Antiguos males 3.
      expect(state.encounterDeck).toHaveLength(6 + 6 + 4 + 2 + 3 + 6 + 3)
      expect(state.setAside.map((c) => c.code).sort()).toEqual(
        [
          CODES.tidalTerror,
          CODES.tidalTerror,
          CODES.riftSeeker,
          CODES.riftSeeker,
          SETS.beastOfAldebaran,
        ].sort(),
      )
    })

  it('each version keeps its agendas, Chapel and Abbey Tower together', () => {
    const flood = game(1, { version: 'flood' })
    expect(Object.keys(flood.setAsideLocations)).toEqual(
      expect.arrayContaining([CODES.chapelPathOpen, CODES.towerSpiresForbidden]),
    )
    const vortex = game(1, { version: 'vortex' })
    expect(vortex.agendas[1]!.code).toBe(CODES.letTheStormRageVortex)
    expect(vortex.secondAgenda!.agendas[1]!.code).toBe(CODES.theEntityAboveVortex)
    expect(Object.keys(vortex.setAsideLocations)).toEqual(
      expect.arrayContaining([CODES.chapelWatersForbidden, CODES.towerPathOpen]),
    )
  })

  it('the version, Chœur Gothique and the location copies are chosen at random', () => {
    const builds = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
      blackStarsRise({ difficulty: 'standard', seed }),
    )
    expect(new Set(builds.map((b) => b.agendas[1]!.code)).size).toBe(2)
    expect(new Set(builds.map((b) => b.locations.map((l) => l.id).join())).size).toBeGreaterThan(1)
  })

  it.each([
    ['easy', -3],
    ['standard', -5],
    ['hard', -6],
    ['expert', -7],
  ] as const)('%s: adds %i to the chaos bag for the rest of the campaign', (difficulty, token) => {
    const state = game(1, { difficulty })
    expect(state.campaignLog!.chaosTokens).toContain(token)
    expect(state.chaosBag).toContain(token)
  })

  it('each investigator adds a random Madness, Pact, Cultist or Detective weakness', () => {
    const state = game(2)
    for (const id of ['a', 'b']) {
      const [weakness] = state.campaignLog!.investigators[id]!.storyAssets
      expect(weakness).toBeDefined()
      const me = getInvestigator(state, id)
      expect([...me.deck, ...me.hand, ...me.discard]).toContain(weakness)
    }
  })

  it('Ashleigh’s Information gives a once-per-game ability to remove 1 doom', () => {
    let state = prep(game(1, { notes: ['carcosaInterviewedAshleigh'] }), [withDoom(2, 0)])
    const ability = availableAbilities(state, 'a').find((a) => a.label === 'ability.bsr.ashleigh')!
    expect(ability).toBeDefined()
    state = readAll(choose(state, ability.label, ability.params))
    expect(state.doom).toBe(1)
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.bsr.ashleigh')).toBe(
      false,
    )
    expect(
      availableAbilities(prep(game(1), [withDoom(2, 0)]), 'a').some(
        (a) => a.label === 'ability.bsr.ashleigh',
      ),
    ).toBe(false)
  })

  it('a campaign after The Pallid Mask starts Black Stars Rise', () => {
    const campaign = afterThePallidMask(2)
    expect(canPlayNext(campaign)).toBe(true)
    expect(startScenario(campaign, 4).scenarioId).toBe(BLACK_STARS_RISE)
  })
})

describe('Black Stars Rise: dual agendas', () => {
  it('doom placed on "the current agenda" goes to the agenda the lead chooses', () => {
    let state = prep(game(), [], { type: 'PlaceDoom', amount: 1 })
    expect(state.pending!.question.prompt).toBe('prompt.doomOnAgenda')
    state = readAll(choose(state, 'choice.doomOnAgenda', { name: 'The Ritual Begins' }))
    expect(state.doom).toBe(0)
    expect(state.secondAgenda!.doom).toBe(1)
  })

  it('doom on other cards counts toward both thresholds', () => {
    let state = game()
    state = prep(state, [withDoom(3, 3)], spawn(tidalTerror, CODES.grandRue))
    const terror = enemyOf(state, CODES.tidalTerror)!
    state = readAll(
      prep(
        state,
        [],
        { type: 'PlaceDoomOnEnemy', enemy: terror.id, amount: 2 },
        { type: 'CheckAgenda' },
      ),
    )
    // Ambos llegan a 5: se elige uno y después avanza el otro.
    expect(firstCode(state)).not.toBe(CODES.theTideRises)
    expect(secondCode(state)).toBe(CODES.theRitualBegins)
    // La perdición del enemigo se retiró; la del plan "c" no.
    expect(state.secondAgenda!.doom).toBe(3)
  })

  it('when both thresholds are met, the lead chooses which advances first', () => {
    let state = prep(game(), [withDoom(5, 5)], { type: 'CheckAgenda' })
    expect(state.pending!.question.prompt).toBe('prompt.agendaToAdvance')
    state = choose(state, 'choice.advanceAgenda', { name: 'The Ritual Begins' })
    state = readAll(state)
    expect(secondCode(state)).toBe(CODES.theEntityAboveFlood)
    // El plan "a" seguía en su umbral: también avanza.
    expect(firstCode(state)).toBe(CODES.letTheStormRageFlood)
  })

  it('[fast] agenda abilities: 1 clue per investigator for 1 doom and resources or cards', () => {
    let state = prep(game(2), [update('a', { clues: 1 }), update('b', { clues: 1 })])
    const resources = getInvestigator(state, 'b').resources
    const tide = availableAbilities(state, 'a').find(
      (a) => a.label === 'ability.bsr.agendaResources',
    )!
    state = readAll(choose(state, tide.label, tide.params))
    expect(state.doom).toBe(1)
    expect(getInvestigator(state, 'b').resources).toBe(resources + 2)
    // Límite de grupo: una vez por ronda.
    state = prep(state, [update('a', { clues: 2 })])
    expect(
      availableAbilities(state, 'a').some((a) => a.label === 'ability.bsr.agendaResources'),
    ).toBe(false)
    const hand = getInvestigator(state, 'b').hand.length
    const ritual = availableAbilities(state, 'a').find(
      (a) => a.label === 'ability.bsr.agendaCards',
    )!
    state = readAll(choose(state, ritual.label, ritual.params))
    expect(state.secondAgenda!.doom).toBe(1)
    expect(getInvestigator(state, 'b').hand.length).toBe(hand + 1)
  })

  it('agenda 1a: Tidal Terrors shuffled in; Conviction with 2 or less doom on agenda 1c', () => {
    let state = prep(game(), [withDoom(5, 2)], { type: 'CheckAgenda' })
    state = readAll(state)
    expect(state.setAside.some((c) => c.code === CODES.tidalTerror)).toBe(false)
    expect(state.encounterDeck.filter((c) => c.code === CODES.tidalTerror)).toHaveLength(2)
    expect(carcosaCount(state.campaignLog, 'conviction')).toBe(1)
    expect(carcosaCount(state.campaignLog, 'doubt')).toBe(0)
  })

  it('agenda 1c: Rift Seekers shuffled in; Doubt with 3 or more doom on agenda 1a', () => {
    const state = readAll(prep(game(), [withDoom(3, 5)], { type: 'AdvanceSecondAgenda' }))
    expect(state.encounterDeck.filter((c) => c.code === CODES.riftSeeker)).toHaveLength(2)
    expect(carcosaCount(state.campaignLog, 'doubt')).toBe(1)
  })

  it('no mark when the other deck is past agenda 1', () => {
    const state = readAll(prep(game(), [atAgendas(0, 1)], { type: 'AdvanceAgenda' }))
    expect(carcosaCount(state.campaignLog, 'doubt')).toBe(0)
    expect(carcosaCount(state.campaignLog, 'conviction')).toBe(0)
  })

  it('flood: agenda 2a becomes act 3a; the other deck remains the only agenda', () => {
    let state = prep(game(), [atAgendas(1, 1), withDoom(2, 4)], { type: 'AdvanceAgenda' })
    state = readAll(state)
    expect(state.acts.map((a) => a.code)).toEqual([CODES.openThePathBelow])
    expect(firstCode(state)).toBe(CODES.theEntityAboveFlood)
    expect(state.doom).toBe(4)
    expect(state.secondAgenda).toBeNull()
  })

  it('flood: agenda 2c spawns the Beast at the Chapel and Ashleigh at the Porte', () => {
    let state = revealChurch(game())
    state = readAll(prep(state, [atAgendas(1, 1)], { type: 'AdvanceSecondAgenda' }))
    expect(enemyOf(state, SETS.beastOfAldebaran)!.location).toBe(CODES.chapelPathOpen)
    expect(enemyOf(state, ASHLEIGH.code)!.location).toBe(CODES.porteDeLAvancee)
    expect(secondCode(state)).toBe(CODES.swallowedSky)
  })

  it('vortex: agenda 2c becomes act 3c and 2a advances to agenda 3a', () => {
    let state = revealChurch(game(1, { version: 'vortex', notes: ['carcosaSlainAshleigh'] }))
    state = readAll(prep(state, [atAgendas(1, 1)], { type: 'AdvanceSecondAgenda' }))
    expect(state.acts.map((a) => a.code)).toEqual([CODES.openThePathAbove])
    expect(state.secondAgenda).toBeNull()
    state = readAll(prep(state, [], { type: 'AdvanceAgenda' }))
    expect(firstCode(state)).toBe(CODES.theCityFloods)
    expect(enemyOf(state, SETS.beastOfAldebaran)!.location).toBe(CODES.towerPathOpen)
    // Ashleigh murió en El Último Rey: no aparece.
    expect(enemyOf(state, ASHLEIGH.code)).toBeUndefined()
  })

  it('agenda 3 (either deck): Resolution 3, everyone goes insane and the campaign is lost', () => {
    const campaign = afterThePallidMask(2)
    let state = readAll(startScenario(campaign, 4))
    state = readAll(during(state, (s) => ({ ...s, agendaIndex: 2 }), { type: 'AdvanceAgenda' }))
    expect(state.outcome).toEqual({ type: 'resolution', resolution: 3 })
    expect(state.campaignLog!.notes).toContain('carcosaRealmsMerged')
    const next = finishScenario(campaign, state)
    expect(Object.values(next.log.investigators).every((r) => r.insane)).toBe(true)
    expect(canPlayNext(next)).toBe(false)
  })
})

describe('Black Stars Rise: acts and resolutions', () => {
  const withAct = (state: GameState, code: string) =>
    readAll(
      prep(
        state,
        [atAgendas(1, 1)],
        code === CODES.openThePathBelow
          ? { type: 'AdvanceAgenda' }
          : { type: 'AdvanceSecondAgenda' },
      ),
    )

  it('Open the Path Below: everyone at the Chapel with no clues on it → R1', () => {
    const campaign = afterThePallidMask(1)
    // Una semilla con la versión La inundación de abajo.
    const seed = [1, 2, 3, 4, 5, 6, 7, 8].find(
      (n) => startScenario(campaign, n).agendas[1]!.code === CODES.letTheStormRageFlood,
    )!
    let state = readAll(startScenario(campaign, seed))
    const id = state.investigators[0]!.id
    state = withAct(revealChurch(state), CODES.openThePathBelow)
    state = prep(
      state,
      [
        (s) => ({
          ...s,
          locations: {
            ...s.locations,
            [CODES.chapelPathOpen]: {
              ...s.locations[CODES.chapelPathOpen]!,
              clues: 0,
              revealed: true,
            },
          },
        }),
        placeAt(CODES.chapelPathOpen),
      ],
      { type: 'CheckActObjective' } as Message,
    )
    state = readAll(state)
    expect(state.outcome).toEqual({ type: 'resolution', resolution: 1 })
    const next = finishScenario(campaign, state)
    expect(next.log.notes).toContain('carcosaOpenedThePathBelow')
    expect(next.log.chaosTokens.filter((t) => t === 'tablet')).toHaveLength(2)
    expect(next.log.chaosTokens.filter((t) => t === 'cultist')).toHaveLength(2)
    expect(next.log.chaosTokens).not.toContain('elderThing')
    expect(next.log.investigators[id]).toBeDefined()
  })

  it('resolution 2 records the path above and adds cultist and elder thing tokens', () => {
    let state = game()
    state = prep(state, [(s) => ({ ...s, victoryDisplay: [ASHLEIGH.code] })], {
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: 2 },
    })
    state = readAll(state)
    expect(state.campaignLog!.notes).toContain('carcosaOpenedThePathAbove')
    expect(state.campaignLog!.notes).toContain('carcosaSlainAshleigh')
    expect(state.campaignLog!.chaosTokens.filter((t) => t === 'elderThing')).toHaveLength(2)
  })

  it('no resolution goes to Resolution 3', () => {
    const state = readAll(
      prep(game(), [], { type: 'EndScenario', outcome: { type: 'noResolution' } }),
    )
    expect(state.campaignLog!.notes).toContain('carcosaRealmsMerged')
  })
})

describe('Black Stars Rise: chaos tokens', () => {
  const token = (state: GameState, t: 'skull' | 'cultist' | 'tablet' | 'elderThing') =>
    behavior().tokenEffect!(state, t, 'a')

  it('skull: highest doom on an agenda (Easy/Standard) or the total (Hard/Expert)', () => {
    expect(token(prep(game(), [withDoom(2, 3)]), 'skull').modifier).toBe(-3)
    expect(token(prep(game(1, { difficulty: 'hard' }), [withDoom(2, 3)]), 'skull').modifier).toBe(
      -5,
    )
  })

  it('cultist: reveal another, or automatic failure against an enemy with doom', () => {
    let state = prep(game(), [], spawn(tidalTerror, CODES.porteDeLAvancee, 'a'))
    const terror = enemyOf(state, CODES.tidalTerror)!
    const fight = (s: GameState): GameState => ({
      ...s,
      skillTest: {
        investigator: 'a',
        kind: { type: 'fight', enemy: terror.id },
      } as GameState['skillTest'],
    })
    expect(token(fight(state), 'cultist')).toMatchObject({ revealAnother: true })
    state = prep(state, [], { type: 'PlaceDoomOnEnemy', enemy: terror.id, amount: 1 })
    expect(token(fight(state), 'cultist')).toMatchObject({ autoFail: true })
  })

  it('tablet: if you fail, 1 doom on each agenda', () => {
    let state = prep(
      game(),
      [
        withBag('tablet', -8),
        update('a', { skills: { willpower: 1, intellect: 1, combat: 1, agility: 1 } }),
      ],
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'willpower',
        difficulty: 3,
        kind: { type: 'effect', source: 'x', onSuccess: [], onFail: [], onFailEach: [] },
      },
    )
    state = readAll(resolveTest(state))
    expect(state.doom).toBe(1)
    expect(state.secondAgenda!.doom).toBe(1)
  })

  it('tablet (Hard): also when succeeding by 0', () => {
    let state = prep(
      game(1, { difficulty: 'hard' }),
      [
        withBag('tablet', 0),
        update('a', { skills: { willpower: 3, intellect: 1, combat: 1, agility: 1 } }),
      ],
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'willpower',
        difficulty: 3,
        kind: { type: 'effect', source: 'x', onSuccess: [], onFail: [], onFailEach: [] },
      },
    )
    state = readAll(resolveTest(state))
    expect(state.doom).toBe(1)
    expect(state.secondAgenda!.doom).toBe(1)
  })

  it('elder thing: if you fail, a Byakhee enemy is drawn from the encounter deck', () => {
    const effect = token(game(), 'elderThing')
    expect(effect.modifier).toBe(-2)
    let state = prep(game(), [], ...effect.onFail!)
    state = readAll(state)
    expect(Object.values(state.enemies).some((e) => (e.traits ?? []).includes('Byakhee'))).toBe(
      true,
    )
  })
})

describe('Black Stars Rise: locations', () => {
  it('Abbey Church: investigators at Broken Steps spend 3 clues per investigator to enter', () => {
    const steps = (s: GameState) =>
      Object.keys(s.locations).find((id) => s.locations[id]!.name === 'Broken Steps')!
    let state = game(1)
    state = prep(state, [placeAt(steps(state))])
    const moves = () =>
      availableActions(state, 'a').flatMap((a) => (a.kind === 'move' ? [a.to] : []))
    expect(moves()).not.toContain(CODES.abbeyChurch)
    state = prep(state, [update('a', { clues: 3 })])
    expect(moves()).toContain(CODES.abbeyChurch)
    state = readAll(
      prep(state, [], { type: 'MoveTo', investigator: 'a', location: CODES.abbeyChurch }),
    )
    expect(getInvestigator(state, 'a').location).toBe(CODES.abbeyChurch)
    expect(getInvestigator(state, 'a').clues).toBe(0)
    // Al revelarse, entra en juego el resto de la abadía.
    expect(Object.keys(state.locations)).toHaveLength(11)
    expect(Object.keys(state.setAsideLocations)).toHaveLength(0)
  })

  it('Abbey Church: +2 shroud while the two agendas have different numbers', () => {
    let state = revealChurch(game())
    const base = shroudOf(state, CODES.abbeyChurch)
    state = prep(state, [atAgendas(1, 0)])
    expect(shroudOf(state, CODES.abbeyChurch)).toBe(base + 2)
  })

  it('Chapel and Abbey Tower cannot be entered until the guide or the key are found', () => {
    let state = revealChurch(game())
    state = prep(state, [placeAt(CODES.abbeyChurch)])
    const moves = (s: GameState) =>
      availableActions(s, 'a').flatMap((a) => (a.kind === 'move' ? [a.to] : []))
    expect(moves(state)).not.toContain(CODES.chapelPathOpen)
    expect(moves(prep(state, [meta('carcosa:foundAGuide')]))).toContain(CODES.chapelPathOpen)
  })

  it('Cloister: parley [willpower] (3) to find a guide', () => {
    let state = revealChurch(game())
    state = prep(state, [
      placeAt(CODES.cloister),
      withBag(0),
      (s) => ({
        ...s,
        locations: {
          ...s.locations,
          [CODES.cloister]: { ...s.locations[CODES.cloister]!, clues: 0, revealed: true },
        },
      }),
    ])
    const parley = availableAbilities(state, 'a').find((a) => a.label === 'ability.bsr.findGuide')!
    state = readAll(resolveTest(choose(state, parley.label, parley.params)))
    expect(state.scenarioMeta?.['carcosa:foundAGuide']).toBe(1)
  })

  it('Knight’s Hall: investigate with [agility] to find the tower key instead of clues', () => {
    let state = revealChurch(game())
    state = prep(state, [
      placeAt(CODES.knightsHall),
      withBag(0),
      (s) => ({
        ...s,
        locations: {
          ...s.locations,
          [CODES.knightsHall]: { ...s.locations[CODES.knightsHall]!, clues: 0, revealed: true },
        },
      }),
    ])
    const ability = availableAbilities(state, 'a').find((a) => a.label === 'ability.bsr.findKey')!
    state = choose(state, ability.label, ability.params)
    expect(state.skillTest!.skill).toBe('agility')
    state = readAll(resolveTest(state))
    expect(state.scenarioMeta?.['carcosa:foundTheTowerKey']).toBe(1)
  })

  it('Chapel (The Path is Open): clues only with 3 or less remaining sanity', () => {
    const state = revealChurch(game())
    const blocked = behavior().cannotDiscoverClues!
    expect(
      blocked(prep(state, [update('a', { sanity: 7, horror: 0 })]), 'a', CODES.chapelPathOpen),
    ).toBe(true)
    expect(
      blocked(prep(state, [update('a', { sanity: 7, horror: 4 })]), 'a', CODES.chapelPathOpen),
    ).toBe(false)
  })

  it('Abbey Tower (The Path is Open): clues only with no cards in hand; discard up to 3', () => {
    let state = revealChurch(game(1, { version: 'vortex' }))
    expect(behavior().cannotDiscoverClues!(state, 'a', CODES.towerPathOpen)).toBe(true)
    expect(
      behavior().cannotDiscoverClues!(
        prep(state, [update('a', { hand: [] })]),
        'a',
        CODES.towerPathOpen,
      ),
    ).toBe(false)
    state = prep(state, [
      placeAt(CODES.towerPathOpen),
      (s) => ({
        ...s,
        locations: {
          ...s.locations,
          [CODES.towerPathOpen]: { ...s.locations[CODES.towerPathOpen]!, revealed: true },
        },
      }),
    ])
    const hand = getInvestigator(state, 'a').hand.length
    const ability = availableAbilities(state, 'a').find(
      (a) => a.label === 'ability.bsr.discardCards',
    )!
    state = choose(state, ability.label, ability.params)
    state = choose(state, 'choice.bsr.amount', { amount: 2 })
    state = readAll(state)
    expect(getInvestigator(state, 'a').hand.length).toBe(hand - 2)
  })

  it("Porte de l'Avancée: [action][action] moves 1 doom to the other agenda and places 2 clues", () => {
    let state = prep(game(), [withDoom(2, 0)])
    const clues = state.locations[CODES.porteDeLAvancee]!.clues
    const ability = availableAbilities(state, 'a').find((a) => a.label === 'ability.bsr.moveDoom')!
    expect(ability.actions).toBe(2)
    state = readAll(choose(state, ability.label, ability.params))
    expect(state.doom).toBe(1)
    expect(state.secondAgenda!.doom).toBe(1)
    expect(state.locations[CODES.porteDeLAvancee]!.clues).toBe(clues + 2)
  })

  it('Grand Rue: succeeding by 1 or less while investigating places 1 doom on the top agenda', () => {
    const forced = behavior().forced!
    const state = prep(game(), [withDoom(1, 2)])
    const messages = forced(state, {
      type: 'afterSkillTest',
      investigator: 'a',
      kind: 'investigate',
      succeeded: true,
      margin: 1,
      location: CODES.grandRue,
    })
    expect(messages).toHaveLength(1)
    const after = readAll(prep(state, [], ...messages))
    expect(after.secondAgenda!.doom).toBe(3)
  })

  it('Outer Wall (03285) and North Tower (03287) hurt after doom on their agenda deck', () => {
    const forced = behavior().forced!
    let state = prep(game(2), [placeAt(CODES.outerWallDamage, CODES.northTowerHorror)])
    expect(forced(state, { type: 'afterDoomPlaced', agenda: 'first' })).toEqual([
      { type: 'TakeDamage', investigator: 'a', damage: 1, horror: 0 },
    ])
    expect(forced(state, { type: 'afterDoomPlaced', agenda: 'second' })).toEqual([
      { type: 'TakeDamage', investigator: 'b', damage: 0, horror: 1 },
    ])
    // Sin el mazo "a" (sustituido por el acto 3a), el único plan es el "c".
    state = prep(state, [], {
      type: 'ScenarioSpecific',
      key: 'bsrToAct',
      data: { letter: 'a' },
    })
    expect(forced(state, { type: 'afterDoomPlaced' })).toEqual([
      { type: 'TakeDamage', investigator: 'b', damage: 0, horror: 1 },
    ])
  })

  it('North Tower (03288) and Outer Wall (03286) depend on which agenda has more doom', () => {
    const state = prep(game(1, { seed: 1 }), [placeAt(CODES.northTowerDifficulty), withDoom(2, 1)])
    const test = { investigator: 'a' } as Parameters<
      NonNullable<ReturnType<typeof behavior>['skillModifier']>
    >[1]
    expect(behavior().skillModifier!(state, test)).toBe(1)
    expect(behavior().skillModifier!(prep(state, [withDoom(1, 2)]), test)).toBe(0)
    const wall = prep(game(1, { seed: 1 }), [placeAt(CODES.outerWallIcons), withDoom(1, 2)])
    expect(behavior().skillDoubling!(wall, test)).toEqual({ icons: true })
  })

  it('Broken Steps (03289): lose 1 action or draw the topmost Omen in the discard pile', () => {
    let state = prep(game(1, { seed: 4 }), [
      placeAt(CODES.brokenStepsOmen),
      (s) => ({ ...s, encounterDiscard: [treacheryOf(CODES.crashingFloods, ['Omen'])] }),
    ])
    state = prep(state, [], {
      type: 'ScenarioSpecific',
      key: 'bsrBrokenSteps',
      data: { investigator: 'a', location: CODES.brokenStepsOmen },
    })
    expect(labels(state)).toEqual(['choice.bsr.loseAction', 'choice.bsr.drawOmen'])
    const actions = getInvestigator(state, 'a').actionsRemaining
    state = readAll(choose(state, 'choice.bsr.loseAction'))
    expect(getInvestigator(state, 'a').actionsRemaining).toBe(actions - 1)
  })

  it('Chœur Gothique: place 1 doom on agenda "a" to heal 2 damage (once per game)', () => {
    let state = revealChurch(game(1, { seed: 3 }))
    const choeur = [CODES.choeurGothiqueDamage, CODES.choeurGothiqueHorror].find(
      (id) => state.locations[id],
    )!
    state = prep(state, [
      placeAt(choeur),
      update('a', { damage: 3, horror: 3 }),
      (s) => ({
        ...s,
        locations: { ...s.locations, [choeur]: { ...s.locations[choeur]!, revealed: true } },
      }),
    ])
    const ability = availableAbilities(state, 'a').find((a) =>
      a.label.startsWith('ability.bsr.heal'),
    )!
    state = readAll(choose(state, ability.label, ability.params))
    if (choeur === CODES.choeurGothiqueDamage) {
      expect(getInvestigator(state, 'a').damage).toBe(1)
      expect(state.doom).toBe(1)
    } else {
      expect(getInvestigator(state, 'a').horror).toBe(1)
      expect(state.secondAgenda!.doom).toBe(1)
    }
  })
})

describe('Black Stars Rise: encounter cards', () => {
  it('Tidal Terror spawns at the Porte (or the Chapel)', () => {
    const state = game()
    expect(enemyBehavior(CODES.tidalTerror)!.spawn!(state, 'a')).toEqual([CODES.porteDeLAvancee])
  })

  it('Rift Seeker: after attacking, extra damage and horror or doom on each agenda', () => {
    const state = prep(game(), [], spawn(riftSeeker, CODES.porteDeLAvancee, 'a'))
    const seeker = enemyOf(state, CODES.riftSeeker)!
    const [ask] = enemyBehavior(CODES.riftSeeker)!.forced!(
      state,
      { type: 'afterEnemyAttack', enemy: seeker.id, investigator: 'a' },
      seeker,
    )
    expect(ask!.type).toBe('Ask')
    const after = readAll(prep(state, [], ask!), (ls) => ls.indexOf('choice.bsr.doomOnEach'))
    expect(after.doom).toBe(1)
    expect(after.secondAgenda!.doom).toBe(1)
  })

  it('Rift Seeker: parley for 1 doom on each agenda and 2 horror to discard it', () => {
    let state = prep(game(), [], spawn(riftSeeker, CODES.porteDeLAvancee))
    const parley = availableAbilities(state, 'a').find((a) => a.label === 'ability.bsr.riftSeeker')!
    state = readAll(choose(state, parley.label, parley.params))
    expect(enemyOf(state, CODES.riftSeeker)).toBeUndefined()
    expect(getInvestigator(state, 'a').horror).toBe(2)
    expect(state.doom + state.secondAgenda!.doom).toBe(2)
  })

  it('Crashing Floods: damage and lost actions by the "a" agenda number', () => {
    let state = prep(
      game(),
      [atAgendas(1, 0), withBag(-8)],
      draw(treacheryOf(CODES.crashingFloods, ['Omen'])),
    )
    state = readAll(resolveTest(state))
    expect(getInvestigator(state, 'a').damage).toBe(2)
  })

  it('Worlds Merge: horror and discards by the "c" agenda number', () => {
    let state = prep(game(), [withBag(-8)], draw(treacheryOf(CODES.worldsMerge, ['Omen'])))
    const hand = getInvestigator(state, 'a').hand.length
    state = readAll(resolveTest(state))
    expect(getInvestigator(state, 'a').horror).toBe(1)
    expect(getInvestigator(state, 'a').hand.length).toBe(hand - 1)
  })

  it('agenda 2a: Ancient Evils gain surge; agenda 2c: Monsters get +1 fight', () => {
    const forced = behavior().forced!
    let state = prep(game(), [], draw(treacheryOf(SETS.ancientEvils, ['Omen'])))
    expect(behavior().enemyStat!(state, { ...tidalTerror, id: 'x' } as never, 'fight')).toBe(0)
    state = prep(game(), [atAgendas(1, 1)])
    expect(behavior().enemyStat!(state, { ...tidalTerror, id: 'x' } as never, 'fight')).toBe(1)
    const withEvils: GameState = {
      ...state,
      treacheries: {
        t: {
          id: 't',
          code: SETS.ancientEvils,
          name: 'Ancient Evils',
          placement: { type: 'limbo' },
        } as never,
      },
    }
    expect(
      forced(withEvils, { type: 'whenTreacheryDrawn', investigator: 'a', treachery: 't' }),
    ).toEqual([{ type: 'GainSurge' }])
    expect(agendaBehavior(CODES.theCityFloods)!.onAdvance!(state)).toEqual([
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 3 } },
    ])
  })
})
