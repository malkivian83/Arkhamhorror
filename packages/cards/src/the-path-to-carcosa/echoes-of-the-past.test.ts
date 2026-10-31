import {
  actBehavior,
  availableAbilities,
  availableActions,
  cardCost,
  createGame,
  effectiveVitals,
  getInvestigator,
  scenarioBehavior,
  shroudOf,
  skillTestValue,
  type Difficulty,
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, keep, labels, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { finishScenario, startScenario } from '../campaign'
import '../index'
import { CARCOSA_CHAOS_BAGS } from './campaign'
import { CLASP_OF_BLACK_ONYX, MR_PEABODY, THE_TATTERED_CLOAK } from './echoes-assets'
import {
  CODES,
  ECHOES_OF_THE_PAST,
  echoesOfThePast,
  FLOORS,
  possessedOathspeaker,
  seekerOfCarcosa,
} from './echoes-of-the-past'
import { afterTheLastKing } from './echoes-playthrough.test'
import { ENCOUNTER_SETS, SETS } from './encounter-sets'
import { carcosaCount } from './log'

const IDS = ['a', 'b', 'c', 'd']
type Mod = (s: GameState) => GameState

function game(players = 1, difficulty: Difficulty = 'standard', seed = 3): GameState {
  let state = throughSetup(
    createGame({
      seed,
      interactive: true,
      difficulty,
      investigators: IDS.slice(0, players).map((id) => testInvestigator(id)),
      scenario: echoesOfThePast({ difficulty, seed, players }),
    }),
  )
  if (state.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    state = choose(state, 'choice.investigator', { name: 'A' })
  return state
}

const placeAt =
  (...where: string[]): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i, n) => ({ ...i, location: where[n] ?? i.location })),
  })
const update =
  (id: string, changes: Partial<GameState['investigators'][number]>): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...changes } : i)),
  })
const withBag =
  (...tokens: GameState['chaosBag']): Mod =>
  (s) => ({ ...s, chaosBag: tokens })
const prep = (state: GameState, mods: Mod[], ...messages: Message[]) =>
  during(state, (s) => mods.reduce((next, mod) => mod(next), s), ...messages)
const resolveTest = (state: GameState) =>
  choose(choose(state, 'choice.revealToken'), 'choice.applyResults')
const reveal = (...locations: string[]): Message[] =>
  locations.map((location) => ({ type: 'RevealLocation', location }))
const inPlay = (state: GameState, floor: keyof typeof FLOORS) =>
  FLOORS[floor].filter((code) => state.locations[code])
const enemyOf = (state: GameState, code: string) =>
  Object.values(state.enemies).find((e) => e.code === code)
const behavior = () => scenarioBehavior(ECHOES_OF_THE_PAST)!
const ALL = Object.values(ENCOUNTER_SETS).flat()
const cardOf = (code: string): EncounterCard => ({ ...ALL.find((c) => c.code === code)! })
const draw = (card: EncounterCard, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card,
})
const spawn = (card: EnemyCard, location: string, engageWith: string | null = null): Message => ({
  type: 'SpawnEnemy',
  card: { ...card },
  location,
  engageWith,
})
/** Mensajes del reverso de un acto (su `onAdvance`). */
const scenarioActOnAdvance = (state: GameState, code: string) =>
  actBehavior(code)?.onAdvance?.(state)

function readAll(state: GameState, pick: (ls: string[]) => number = () => 0): GameState {
  let s = state
  for (let n = 0; n < 40 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    const choice = s.pending.question.choices[pick(labels(s))]!
    s = choose(s, choice.label, choice.params)
  }
  return s
}

// Guía ES p. 10, "Preparación".
describe('Echoes of the Past: setup', () => {
  for (const players of [1, 2, 3, 4])
    for (const difficulty of ['easy', 'standard', 'hard', 'expert'] as const)
      it(`${players} investigator(s), ${difficulty}`, () => {
        const state = game(players, difficulty)
        // Vestíbulo, ambos Pasillos tranquilos y 2 Sociedad Histórica de cada planta.
        expect(Object.keys(state.locations)).toHaveLength(9)
        for (const floor of ['ground', 'second', 'third'] as const)
          expect(inPlay(state, floor)).toHaveLength(2)
        expect(state.investigators.every((i) => i.location === CODES.entryHall)).toBe(true)
        expect(Object.keys(state.setAsideLocations)).toEqual([CODES.hiddenLibrary])
        expect(state.setAside.map((c) => c.code).sort()).toEqual(
          [CODES.possessedOathspeaker, '03068b'].sort(),
        )
        expect(state.chaosBag).toEqual(CARCOSA_CHAOS_BAGS[difficulty])
        expect(state.agendas.map((a) => a.doomThreshold)).toEqual([
          2 * players,
          2 * players,
          3 * players,
        ])
        expect(state.acts.map((a) => a.code)).toEqual([
          CODES.raceForAnswers,
          CODES.mistakesOfThePast,
          CODES.theOath,
        ])
        // Buscadores de Carcosa según los jugadores (1: ninguno; 4: tres).
        const seekers = Object.values(state.enemies).filter((e) => e.code === CODES.seekerOfCarcosa)
        expect(seekers).toHaveLength([0, 1, 2, 3][players - 1]!)
        expect(new Set(seekers.map((e) => e.location)).size).toBe(seekers.length)
        for (const s of seekers) {
          expect(state.locations[s.location]!.revealed).toBe(true)
          if (players < 4) expect(FLOORS.third).toContain(s.location as never)
        }
        // 3 Lealtad... mazo: 33 cartas menos los Buscadores ya en juego.
        expect(state.encounterDeck).toHaveLength(33 - seekers.length)
      })

  it('removes a random Historical Society location of each floor depending on the seed', () => {
    const layouts = new Set(
      [1, 2, 3, 4, 5, 6, 7].map((seed) => Object.keys(game(1, 'standard', seed).locations).join()),
    )
    expect(layouts.size).toBeGreaterThan(1)
  })

  it('Sebastien’s information: 1 clue per investigator on the Entry Hall', () => {
    const plain = readAll(startScenario(afterTheLastKing(2), 5))
    const told = readAll(startScenario(afterTheLastKing(2, ['carcosaInterviewedSebastien']), 5))
    expect(plain.locations[CODES.entryHall]!.clues).toBe(0)
    expect(told.locations[CODES.entryHall]!.clues).toBe(2)
    // Tachado en el registro (R3 de El Último Rey): no cuenta.
    const crossed = afterTheLastKing(2, ['carcosaInterviewedSebastien'])
    crossed.log.crossedOut = ['carcosaInterviewedSebastien']
    expect(readAll(startScenario(crossed, 5)).locations[CODES.entryHall]!.clues).toBe(0)
  })

  it('fled the party: 1 additional action in the first turn', () => {
    expect(behavior().actionsModifier!(game(), 'a')).toBe(0)
    const state = { ...startScenario(afterTheLastKing(1, ['carcosaFledTheParty']), 5), round: 1 }
    expect(behavior().actionsModifier!(state, state.investigators[0]!.id)).toBe(1)
    expect(behavior().actionsModifier!({ ...state, round: 2 }, state.investigators[0]!.id)).toBe(0)
  })

  it('connects each floor hub with its floor, and revealed rooms by their symbols', () => {
    let state = game()
    const of = (id: string) => [...state.locations[id]!.connections].sort()
    expect(of(CODES.entryHall)).toEqual([CODES.quietHallsSecond, ...inPlay(state, 'ground')].sort())
    expect(of(CODES.quietHallsSecond)).toEqual(
      [CODES.entryHall, CODES.quietHallsThird, ...inPlay(state, 'second')].sort(),
    )
    expect(of(CODES.quietHallsThird)).toEqual(
      [CODES.quietHallsSecond, ...inPlay(state, 'third')].sort(),
    )
    for (const code of inPlay(state, 'ground')) expect(of(code)).toContain(CODES.entryHall)
    // Las Bibliotecas históricas reveladas conectan las plantas 2 y 3.
    state = game(1, 'standard', 1)
    const libraries = [CODES.librarySecond, CODES.libraryThird].filter((c) => state.locations[c])
    if (libraries.length === 2) {
      state = prep(state, [], ...reveal(...libraries))
      expect(of(CODES.librarySecond)).toContain(CODES.libraryThird)
    }
  })
})

describe('Echoes of the Past: agendas and acts', () => {
  it('agendas skip the mythos doom and turn clues placed on enemies into doom', () => {
    let state = prep(game(4), [], spawn(seekerOfCarcosa, CODES.entryHall))
    const seeker = enemyOf(state, CODES.seekerOfCarcosa)!
    state = prep(state, [update('a', { clues: 2 })], {
      type: 'MoveClues',
      from: { type: 'investigator', id: 'a' },
      to: { type: 'enemy', id: seeker.id },
      amount: 1,
    })
    expect(state.enemies[seeker.id]).toMatchObject({ doom: 1 })
    expect(state.enemies[seeker.id]!.clues ?? 0).toBe(0)
    // Sin cartas de Encuentro que robar, la fase de Mitos no añade perdición al plan.
    state = during(state, (s) => ({ ...s, encounterDeck: [], encounterDiscard: [] }), {
      type: 'MythosPhase',
    })
    state = readAll(state)
    expect(state.doom).toBe(0)
    expect(state.enemies[seeker.id]!.doom).toBe(2)
  })

  it('Ransacking the Manor: the Oathspeaker and Sebastien spawn in the Entry Hall', () => {
    let state = during(game(), (s) => ({ ...s, agendaIndex: 1 }), { type: 'AdvanceAgenda' })
    state = readAll(state)
    expect(enemyOf(state, CODES.possessedOathspeaker)?.location).toBe(CODES.entryHall)
    expect(enemyOf(state, '03068b')?.location).toBe(CODES.entryHall)
    // Sebastien no vuelve si ya está entre los VIP muertos.
    let slain = during(
      game(),
      (s) => ({
        ...s,
        agendaIndex: 1,
        campaignLog: { ...s.campaignLog!, notes: ['carcosaSlainSebastien'] },
      }),
      { type: 'AdvanceAgenda' },
    )
    slain = readAll(slain)
    expect(enemyOf(slain, '03068b')).toBeUndefined()
  })

  it('the Oathspeaker cannot be damaged during acts 1 and 2; defeating him is R3', () => {
    let state = prep(game(), [], spawn(possessedOathspeaker, CODES.quietHallsSecond))
    const oath = enemyOf(state, CODES.possessedOathspeaker)!
    expect(behavior().enemyImmune!(state, oath)).toBe(true)
    state = during(state, (s) => ({ ...s, actIndex: 2 }))
    expect(behavior().enemyImmune!(state, oath)).toBe(false)
    state = during(state, keep, { type: 'DefeatEnemy', enemy: oath.id, by: 'a' })
    expect(state.pending?.question.prompt).toBe('prompt.story')
  })

  it('the Oathspeaker: at the start of the enemy phase, ready him or place 1 doom', () => {
    let state = prep(game(), [], spawn(possessedOathspeaker, CODES.quietHallsSecond))
    const id = enemyOf(state, CODES.possessedOathspeaker)!.id
    state = during(state, keep, { type: 'Forced', trigger: { type: 'enemyPhaseBegins' } })
    expect(state.enemies[id]!.doom).toBe(1)
    state = during(
      state,
      (s) => ({ ...s, enemies: { ...s.enemies, [id]: { ...s.enemies[id]!, exhausted: true } } }),
      { type: 'Forced', trigger: { type: 'enemyPhaseBegins' } },
    )
    expect(labels(state)).toEqual([
      'choice.echoes.readyOathspeaker',
      'choice.echoes.doomOnOathspeaker',
    ])
    state = choose(state, 'choice.echoes.readyOathspeaker')
    expect(state.enemies[id]!).toMatchObject({ exhausted: false, doom: 1 })
  })

  it('act 1 adds clues to revealed Historical Society locations up to their value', () => {
    let state = game(2)
    const [room] = inPlay(state, 'ground')
    state = prep(state, [], ...reveal(room!))
    const max = state.locations[room!]!.clueValue * 2
    state = during(state, (s) => ({
      ...s,
      locations: { ...s.locations, [room!]: { ...s.locations[room!]!, clues: max - 1 } },
    }))
    state = during(state, keep, ...(scenarioActOnAdvance(state, CODES.raceForAnswers) ?? []))
    expect(state.locations[room!]!.clues).toBe(max)
  })

  it('act 2: Mr. Peabody joins an investigator and the Hidden Library enters play', () => {
    let state = game()
    state = during(state, keep, ...(scenarioActOnAdvance(state, CODES.mistakesOfThePast) ?? []))
    state = readAll(state)
    expect(Object.values(state.assets).some((a) => a.code === MR_PEABODY && a.owner === 'a')).toBe(
      true,
    )
    expect(state.locations[CODES.hiddenLibrary]).toBeDefined()
    expect(state.locations[CODES.hiddenLibrary]!.connections).toEqual([])
  })

  it('act 3: passageways connect; Peabody makes the Hidden Library one; only there can clues advance', () => {
    let state = game(1, 'standard', 1)
    state = prep(
      state,
      [],
      ...reveal(...Object.keys(state.locations)),
      { type: 'PutLocationIntoPlay', location: CODES.hiddenLibrary },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: MR_PEABODY },
    )
    state = during(state, (s) => ({ ...s, actIndex: 1 }), { type: 'ActAdvanced' })
    const passages = [
      CODES.meetingRoom,
      CODES.librarySecond,
      CODES.libraryThird,
      CODES.peabodysOffice,
    ].filter((c) => state.locations[c])
    if (passages.length >= 2)
      expect(state.locations[passages[0]!]!.connections).toContain(passages[1])
    expect(state.locations[CODES.hiddenLibrary]!.connections).toEqual([])
    // El Sr. Peabody convierte la Biblioteca oculta en Pasadizo (y le quita 1 de velo).
    const peabody = availableAbilities(state, 'a').find((a) => a.key.endsWith(':passage'))!
    state = during(state, keep, ...peabody.then)
    expect(state.pending!.question.prompt).toBe('prompt.echoes.peabodyPassage')
    state = choose(state, 'choice.location', { location: 'Hidden Library' })
    expect(shroudOf(state, CODES.hiddenLibrary)).toBe(3)
    if (passages.length)
      expect(state.locations[CODES.hiddenLibrary]!.connections).toContain(passages[0])
    // Al prepararse el Sr. Peabody se pierde el efecto.
    state = during(state, keep, { type: 'ReadyAll' })
    expect(state.locations[CODES.hiddenLibrary]!.connections).toEqual([])
    expect(state.acts[2]!.cluesAtLocation).toBe(CODES.hiddenLibrary)
  })

  it('act 3 back: the investigators choose R1 or R2', () => {
    const state = during(game(), keep, ...(scenarioActOnAdvance(game(), CODES.theOath) ?? []))
    expect(labels(state)).toEqual(['story.echoes.decide1', 'story.echoes.decide2'])
  })

  it('enemies can path through the Hidden Library during act 3', () => {
    let state = game(1, 'standard', 1)
    state = prep(state, [], ...reveal(...Object.keys(state.locations)), {
      type: 'PutLocationIntoPlay',
      location: CODES.hiddenLibrary,
    })
    state = during(state, (s) => ({ ...s, actIndex: 1 }), { type: 'ActAdvanced' })
    const passage = [
      CODES.meetingRoom,
      CODES.librarySecond,
      CODES.libraryThird,
      CODES.peabodysOffice,
    ].find((c) => state.locations[c])!
    expect(behavior().enemyConnections!(state, CODES.hiddenLibrary)).toContain(passage)
    expect(behavior().enemyConnections!(state, passage)).toEqual([CODES.hiddenLibrary])
  })
})

describe('Echoes of the Past: chaos tokens', () => {
  it('skull: the highest doom on an enemy (hard: the total)', () => {
    let state = prep(
      game(4),
      [],
      spawn(seekerOfCarcosa, CODES.entryHall),
      spawn(possessedOathspeaker, CODES.quietHallsSecond),
    )
    const [s, o] = [
      enemyOf(state, CODES.seekerOfCarcosa)!,
      enemyOf(state, CODES.possessedOathspeaker)!,
    ]
    state = during(
      state,
      keep,
      { type: 'PlaceDoomOnEnemy', enemy: s.id, amount: 1 },
      { type: 'PlaceDoomOnEnemy', enemy: o.id, amount: 2 },
    )
    expect(behavior().tokenEffect!(state, 'skull', 'a').modifier).toBe(-2)
    expect(behavior().tokenEffect!({ ...state, difficulty: 'hard' }, 'skull', 'a').modifier).toBe(
      -3,
    )
  })

  it('cultist: doom on the nearest enemy; tablet: random discard; elder thing: horror with an enemy here', () => {
    let state = prep(game(), [], spawn(seekerOfCarcosa, CODES.quietHallsSecond))
    state = during(state, keep, ...behavior().tokenEffect!(state, 'cultist', 'a').onFail!)
    expect(enemyOf(state, CODES.seekerOfCarcosa)!.doom).toBe(1)
    const hand = getInvestigator(state, 'a').hand.length
    state = during(state, keep, ...behavior().tokenEffect!(state, 'tablet', 'a').onFail!)
    expect(getInvestigator(state, 'a').hand.length).toBe(hand - 1)
    state = during(state, keep, ...behavior().tokenEffect!(state, 'elderThing', 'a').onFail!)
    expect(getInvestigator(state, 'a').horror).toBe(0)
    state = prep(state, [placeAt(CODES.quietHallsSecond)])
    state = during(state, keep, ...behavior().tokenEffect!(state, 'elderThing', 'a').onFail!)
    expect(getInvestigator(state, 'a').horror).toBe(1)
    const hard = behavior().tokenEffect!({ ...state, difficulty: 'expert' }, 'cultist', 'a')
    expect(hard).toMatchObject({ modifier: -4 })
    expect(hard.immediate).toHaveLength(1)
  })

  it('cultist: the doom reaching the threshold waits for the Mythos phase (doc 100, F5)', () => {
    let state = prep(game(), [], spawn(seekerOfCarcosa, CODES.quietHallsSecond))
    const threshold = state.agendas[state.agendaIndex]!.doomThreshold!
    state = { ...state, doom: threshold - 1 }
    state = during(state, keep, ...behavior().tokenEffect!(state, 'cultist', 'a').onFail!)
    expect(enemyOf(state, CODES.seekerOfCarcosa)!.doom).toBe(1)
    expect(state.agendaIndex).toBe(0)
  })
})

describe('Echoes of the Past: locations', () => {
  /** Partida con la planta pedida al completo (semilla que la deja en juego). */
  function withRoom(code: string, players = 1): GameState {
    for (let seed = 1; seed < 40; seed++) {
      const state = game(players, 'standard', seed)
      if (state.locations[code]) return prep(state, [placeAt(code)], ...reveal(code))
    }
    throw new Error(`Sin semilla con ${code}`)
  }

  it('an enemy spawning at an unrevealed Historical Society location reveals it', () => {
    let state = game()
    const [room] = inPlay(state, 'second')
    expect(state.locations[room!]!.revealed).toBe(false)
    state = prep(state, [], spawn(seekerOfCarcosa, room!))
    expect(state.locations[room!]!.revealed).toBe(true)
  })

  it('Record Office: enemies there get +1 fight and evade', () => {
    const state = prep(
      withRoom(CODES.recordOfficeGround),
      [],
      spawn(seekerOfCarcosa, CODES.recordOfficeGround),
    )
    expect(behavior().enemyStat!(state, enemyOf(state, CODES.seekerOfCarcosa)!, 'evade')).toBe(1)
  })

  it('Historical Museum: your intellect cannot be modified while investigating it', () => {
    let state = withRoom(CODES.museumGround)
    state = during(state, keep, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 2,
      modifier: 3,
      tags: ['investigate'],
      kind: { type: 'investigate', location: CODES.museumGround },
    })
    expect(skillTestValue(state).total).toBe(3)
  })

  it('Historical Library: after investigating it successfully, 2 horror for 1 more clue', () => {
    let state = prep(withRoom(CODES.librarySecond, 2), [withBag(0)])
    const clues = state.locations[CODES.librarySecond]!.clues
    expect(clues).toBe(4)
    state = during(state, keep, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 3,
      tags: ['investigate'],
      kind: { type: 'investigate', location: CODES.librarySecond },
    })
    state = resolveTest(state)
    expect(getInvestigator(state, 'a').clues).toBe(1)
    expect(labels(state)).toContain('ability.echoes.library')
    state = choose(state, 'ability.echoes.library')
    expect(getInvestigator(state, 'a')).toMatchObject({ clues: 2, horror: 2 })
  })

  it('Reading Room: a successful investigation takes 1 doom from an enemy as a clue', () => {
    let state = prep(
      withRoom(CODES.readingRoom),
      [withBag(0), update('a', { skills: { willpower: 3, intellect: 6, combat: 3, agility: 3 } })],
      spawn(seekerOfCarcosa, CODES.entryHall),
    )
    const seeker = enemyOf(state, CODES.seekerOfCarcosa)!
    state = during(state, keep, { type: 'PlaceDoomOnEnemy', enemy: seeker.id, amount: 1 })
    const ability = availableAbilities(state, 'a').find((a) => a.key.endsWith(':investigate'))!
    expect(ability.limit).toEqual({ per: 'round', group: true })
    state = resolveTest(during(state, keep, ...ability.then))
    expect(getInvestigator(state, 'a').clues).toBe(1)
    expect(state.enemies[seeker.id]!.doom ?? 0).toBe(0)
    expect(state.locations[CODES.readingRoom]!.clues).toBe(1)
  })

  it('Meeting Room: exhaust an Ally to discover a clue', () => {
    let state = prep(withRoom(CODES.meetingRoom), [], {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: MR_PEABODY,
    })
    const ability = availableAbilities(state, 'a').find((a) => a.key.endsWith(':ally'))!
    expect(ability.limit).toEqual({ per: 'round' })
    state = during(state, keep, ...ability.costs!, ...ability.then)
    expect(getInvestigator(state, 'a').clues).toBe(1)
    expect(Object.values(state.assets).find((a) => a.code === MR_PEABODY)!.exhausted).toBe(true)
  })

  it("Peabody's Office: -2 shroud while an investigator there controls Mr. Peabody", () => {
    let state = withRoom(CODES.peabodysOffice)
    expect(shroudOf(state, CODES.peabodysOffice)).toBe(4)
    state = prep(state, [], { type: 'PutAssetIntoPlay', investigator: 'a', code: MR_PEABODY })
    expect(shroudOf(state, CODES.peabodysOffice)).toBe(2)
  })

  it('Quiet Halls: with every location revealed and no clues, place 1 per investigator', () => {
    let state = prep(
      game(2),
      [placeAt(CODES.quietHallsSecond)],
      ...reveal(...Object.keys(game(2).locations)),
    )
    expect(availableAbilities(state, 'a').some((a) => a.key.endsWith(':clues'))).toBe(false)
    state = during(state, (s) => ({
      ...s,
      locations: Object.fromEntries(
        Object.entries(s.locations).map(([id, l]) => [id, { ...l, clues: 0 }]),
      ),
    }))
    const ability = availableAbilities(state, 'a').find((a) => a.key.endsWith(':clues'))!
    state = during(state, keep, ...ability.then)
    expect(state.locations[CODES.quietHallsSecond]!.clues).toBe(2)
  })

  it('Entry Hall: resign', () => {
    expect(availableAbilities(game(), 'a').some((a) => a.label === 'ability.resign')).toBe(true)
  })
})

describe('Echoes of the Past: encounter cards', () => {
  it('Seeker of Carcosa: spawns at an empty Historical Society location; at the end of the mythos phase takes a clue (as doom) or 1 doom', () => {
    let state = game()
    expect(state.investigators[0]!.location).toBe(CODES.entryHall)
    state = readAll(prep(state, [], draw({ ...seekerOfCarcosa })))
    const seeker = enemyOf(state, CODES.seekerOfCarcosa)!
    expect(Object.values(FLOORS).flat()).toContain(seeker.location as never)
    const clues = state.locations[seeker.location]!.clues
    state = during(state, keep, { type: 'Forced', trigger: { type: 'mythosPhaseEnds' } })
    expect(state.enemies[seeker.id]!.doom).toBe(1)
    expect(state.locations[seeker.location]!.clues).toBe(Math.max(0, clues - 1))
  })

  it("Led Astray: a clue on a Cultist (doom) or 1 doom on the agenda; The Cult's Search moves Cultist doom to the agenda", () => {
    let state = prep(
      game(),
      [update('a', { clues: 1 })],
      spawn(seekerOfCarcosa, CODES.quietHallsSecond),
    )
    const ledAstray = game().encounterDeck.find((c) => c.code === CODES.ledAstray)!
    state = during(state, keep, draw({ ...ledAstray }))
    expect(labels(state)).toEqual(['choice.enemy', 'choice.placeDoom'])
    state = choose(state, 'choice.enemy')
    const seeker = enemyOf(state, CODES.seekerOfCarcosa)!
    expect(seeker.doom).toBe(1)
    const search = game().encounterDeck.find((c) => c.code === CODES.theCultsSearch)!
    state = during(state, keep, draw({ ...search }))
    expect(state.enemies[seeker.id]!.doom ?? 0).toBe(0)
    expect(state.doom).toBe(1)
  })

  it("The Cult's Search without doomed Cultists draws a Cultist from the encounter deck", () => {
    let state = game()
    const search = state.encounterDeck.find((c) => c.code === CODES.theCultsSearch)!
    const before = state.encounterDeck.length
    state = readAll(during(state, keep, draw({ ...search })))
    expect(Object.values(state.enemies).some((e) => (e.traits ?? []).includes('Cultist'))).toBe(
      true,
    )
    expect(state.encounterDeck.length).toBe(before - 1)
  })

  it('Acolyte enters with 1 doom; Wizard of the Order gains 1 doom at the end of the mythos phase', () => {
    let state = readAll(prep(game(4), [], draw(cardOf(SETS.acolyte))))
    state = readAll(prep(state, [], draw(cardOf(SETS.wizardOfTheOrder))))
    expect(enemyOf(state, SETS.acolyte)!.doom).toBe(1)
    state = during(state, keep, { type: 'Forced', trigger: { type: 'mythosPhaseEnds' } })
    expect(enemyOf(state, SETS.wizardOfTheOrder)!.doom).toBe(1)
  })

  it('Mysterious Chanting: 2 doom on the nearest Cultist', () => {
    let state = readAll(prep(game(4), [], draw(cardOf(SETS.acolyte))))
    state = readAll(prep(state, [], draw(cardOf(SETS.mysteriousChanting))))
    expect(enemyOf(state, SETS.acolyte)!.doom).toBe(3)
  })

  it('Hunting Shadow: spend 1 clue or take 2 damage; False Lead: surge without clues', () => {
    let state = during(game(), keep, draw(cardOf(SETS.huntingShadow)))
    expect(getInvestigator(state, 'a').damage).toBe(2)
    state = prep(state, [update('a', { clues: 1 })], draw(cardOf(SETS.huntingShadow)))
    state = choose(state, 'choice.spendClue')
    expect(getInvestigator(state, 'a').clues).toBe(0)
    const deck = state.encounterDeck.length
    state = readAll(during(state, keep, draw(cardOf(SETS.falseLead))))
    expect(state.encounterDeck.length).toBe(deck - 1)
  })

  it('Locked Door: attaches to the location with most clues, blocks investigating; combat or agility (4) opens it', () => {
    let state = prep(game(), [placeAt(CODES.quietHallsSecond)], ...reveal(CODES.quietHallsSecond), {
      type: 'PlaceCluesOnLocationFromPool',
      location: CODES.quietHallsSecond,
      amount: 3,
    })
    state = during(state, keep, draw(cardOf(SETS.lockedDoor)))
    expect(Object.values(state.treacheries)[0]!.placement).toEqual({
      type: 'location',
      location: CODES.quietHallsSecond,
    })
    expect(availableActions(state, 'a').some((a) => a.kind === 'investigate')).toBe(false)
    const open = availableAbilities(state, 'a').find((a) => a.key.endsWith(':open'))!
    state = prep(
      state,
      [withBag(0), update('a', { skills: { willpower: 3, intellect: 3, combat: 5, agility: 3 } })],
      ...open.then,
    )
    state = choose(state, 'choice.test.combat', { difficulty: 4 })
    state = resolveTest(state)
    expect(Object.keys(state.treacheries)).toHaveLength(0)
  })
})

describe('Echoes of the Past: rewards', () => {
  it('Clasp of Black Onyx in hand raises the cost of each other card in hand by 1', () => {
    let state = prep(game(), [update('a', { hand: ['12115'] })])
    expect(cardCost(state, 'a', '12115')).toBe(3)
    state = prep(state, [update('a', { hand: ['12115', CLASP_OF_BLACK_ONYX] })])
    expect(cardCost(state, 'a', '12115')).toBe(4)
    expect(cardCost(state, 'a', CLASP_OF_BLACK_ONYX)).toBe(1)
  })

  it('The Tattered Cloak: -1 sanity; +1 willpower/combat/agility with 3 or fewer sanity left', () => {
    let state = prep(game(), [], {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: THE_TATTERED_CLOAK,
    })
    expect(effectiveVitals(state, getInvestigator(state, 'a')).sanity).toBe(7)
    const combat = (s: GameState) =>
      skillTestValue(
        during(s, keep, {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill: 'combat',
          difficulty: 2,
          kind: { type: 'effect', source: 'x', onSuccess: [], onFail: [], onFailEach: [] },
        }),
      ).total
    expect(combat(state)).toBe(3)
    state = prep(state, [update('a', { horror: 4 })])
    expect(combat(state)).toBe(4)
  })
})

describe('Echoes of the Past: resolutions', () => {
  const campaignGame = (players = 2) => {
    const campaign = afterTheLastKing(players)
    return { campaign, state: readAll(startScenario(campaign, 41)) }
  }
  const end = (state: GameState, outcome: GameState['outcome'], mod: Mod = (s) => s) =>
    during(state, mod, { type: 'EndScenario', outcome: outcome! })

  it('no resolution is R4: 1 XP bonus and 1 cultist, tablet and elder thing', () => {
    const { campaign, state } = campaignGame()
    const done = readAll(end(state, { type: 'noResolution' }))
    expect(done.outcome).toEqual({ type: 'resolution', resolution: 4 })
    const next = finishScenario(campaign, done)
    expect(next.log.notes).toContain('carcosaFollowersFoundTheWay')
    expect(next.log.chaosTokens).toEqual(['cultist', 'tablet', 'elderThing'])
    expect(Object.values(next.log.investigators).every((r) => r.xp === 1)).toBe(true)
  })

  it('R1: Conviction, 2 cultist tokens, an investigator must take the Clasp; Sebastien slain is recorded', () => {
    const { campaign, state } = campaignGame()
    const second = state.investigators[1]!
    const done = readAll(
      end(state, { type: 'resolution', resolution: 1 }, (s) => ({
        ...s,
        victoryDisplay: ['03068b'],
      })),
      (ls) => (ls.includes('choice.investigator') ? 1 : 0),
    )
    const next = finishScenario(campaign, done)
    expect(carcosaCount(next.log, 'conviction')).toBe(1)
    expect(next.log.chaosTokens).toEqual(['cultist', 'cultist'])
    expect(next.log.investigators[second.id]!.storyAssets).toContain(CLASP_OF_BLACK_ONYX)
    expect(next.log.notes).toEqual(
      expect.arrayContaining(['carcosaTookTheOnyxClasp', 'carcosaSlainSebastien']),
    )
  })

  it('R2: Doubt and 2 tablets; R3: 2 tablets and the Tattered Cloak is optional', () => {
    const r2 = campaignGame()
    const next2 = finishScenario(
      r2.campaign,
      readAll(end(r2.state, { type: 'resolution', resolution: 2 })),
    )
    expect(carcosaCount(next2.log, 'doubt')).toBe(1)
    expect(next2.log.chaosTokens).toEqual(['tablet', 'tablet'])
    const r3 = campaignGame()
    let done = end(r3.state, { type: 'resolution', resolution: 3 })
    done = readAll(done, (ls) => Math.max(0, ls.indexOf('choice.echoes.nobody')))
    const next3 = finishScenario(r3.campaign, done)
    expect(next3.log.notes).toContain('carcosaDestroyedTheOathspeaker')
    expect(
      Object.values(next3.log.investigators).some((r) =>
        r.storyAssets.includes(THE_TATTERED_CLOAK),
      ),
    ).toBe(false)
    expect(next3.log.chaosTokens).toEqual(['tablet', 'tablet'])
  })
})
