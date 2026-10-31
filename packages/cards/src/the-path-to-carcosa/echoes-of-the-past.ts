/**
 * Escenario III de El camino a Carcosa: "Ecos del pasado" (03120–03146).
 * Guía de campaña revisada ES, pp. 10–12.
 *
 * Los códigos son los de la expansión. El texto de las cartas está en el catálogo
 * EN/ES; aquí solo su comportamiento.
 */
import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  investigationBlocked,
  leadInvestigator,
  playerCardDef,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerScenario,
  registerTreachery,
  seedRng,
  shroudOf,
  shuffle,
  type AbilityOption,
  type Choice,
  type Enemy,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type LocationId,
  type Message,
  type ScenarioDefinition,
  type ScenarioOutcome,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import {
  copies,
  damage,
  earnExperience,
  endScenario,
  enemy,
  noteEffect,
  recordNote,
  resignAbility,
  resolution,
  storyEntries,
  treachery,
} from '../scenario-helpers'
import { CARCOSA_CHAOS_BAGS } from './campaign'
import {
  CLASP_OF_BLACK_ONYX,
  MR_PEABODY,
  PEABODY_LOCATION,
  THE_TATTERED_CLOAK,
} from './echoes-assets'
import {
  emptyLocations,
  ENCOUNTER_SETS,
  encounterSpecific,
  findCultist,
  kingsEdictFight,
} from './encounter-sets'
import { carcosaSpecific, hasNote, markCarcosa, replaceSymbolTokens } from './log'
import { VIPS } from './the-last-king'

export const ECHOES_OF_THE_PAST = 'echoes-of-the-past'

export const CODES = {
  scenario: '03120',
  theTruthIsHidden: '03121',
  ransackingTheManor: '03122',
  secretsBetterLeftHidden: '03123',
  raceForAnswers: '03124',
  mistakesOfThePast: '03125',
  theOath: '03126',
  entryHall: '03127',
  meetingRoom: '03128',
  recordOfficeGround: '03129',
  museumGround: '03130',
  quietHallsSecond: '03131',
  museumSecond: '03132',
  librarySecond: '03133',
  readingRoom: '03134',
  quietHallsThird: '03135',
  libraryThird: '03136',
  peabodysOffice: '03137',
  recordOfficeThird: '03138',
  hiddenLibrary: '03139',
  possessedOathspeaker: '03140',
  seekerOfCarcosa: '03144',
  ledAstray: '03145',
  theCultsSearch: '03146',
} as const

/** Lugares "Sociedad Histórica" de cada planta (se juegan 2 de cada 3, al azar). */
export const FLOORS = {
  ground: [CODES.meetingRoom, CODES.recordOfficeGround, CODES.museumGround],
  second: [CODES.museumSecond, CODES.librarySecond, CODES.readingRoom],
  third: [CODES.libraryThird, CODES.peabodysOffice, CODES.recordOfficeThird],
} as const
const HUBS = {
  ground: CODES.entryHall,
  second: CODES.quietHallsSecond,
  third: CODES.quietHallsThird,
} as const
const HISTORICAL_SOCIETY: string[] = Object.values(FLOORS).flat()
/** Pasadizos (rasgo de la cara revelada). */
const PASSAGEWAYS: string[] = [
  CODES.meetingRoom,
  CODES.librarySecond,
  CODES.libraryThird,
  CODES.peabodysOffice,
]
const MUSEUMS: string[] = [CODES.museumGround, CODES.museumSecond]
const RECORD_OFFICES: string[] = [CODES.recordOfficeGround, CODES.recordOfficeThird]
const LIBRARIES: string[] = [CODES.librarySecond, CODES.libraryThird]

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

export const possessedOathspeaker: EnemyCard = enemy({
  code: CODES.possessedOathspeaker,
  name: 'Possessed Oathspeaker',
  traits: ['Monster', 'Servitor', 'Elite'],
  fight: 4,
  health: 5,
  healthPerInvestigator: true,
  evade: 3,
  damage: 2,
  horror: 2,
  keywords: ['hunter', 'retaliate'],
  victory: 2,
})

export const seekerOfCarcosa: EnemyCard = enemy({
  code: CODES.seekerOfCarcosa,
  name: 'Seeker of Carcosa',
  traits: ['Humanoid', 'Cultist'],
  fight: 2,
  health: 3,
  evade: 2,
  damage: 0,
  horror: 1,
  keywords: ['aloof'],
})

const sebastien = VIPS.find((v) => v.key === 'Sebastien')!.enemy

type Place = Omit<LocationCard, 'connections' | 'clueValue' | 'cluesPerInvestigator'> & {
  clues?: number
  fixed?: boolean
}
const location = ({ clues = 0, fixed = false, ...card }: Place): LocationCard => ({
  ...card,
  clueValue: clues,
  cluesPerInvestigator: clues > 0 && !fixed,
  connections: [],
})
/** Cara sin revelar de la Sociedad Histórica: sin símbolo, conecta con el centro de su planta. */
const society = (card: Place, hub: string): LocationCard =>
  location({
    ...card,
    unrevealed: { symbol: 'none', connectsTo: [hub] },
    unrevealedName: 'Historical Society',
  })

/** Símbolos de las cartas y posiciones de la distribución sugerida (p. 11). */
export const locationCards: Record<string, LocationCard> = {
  [CODES.entryHall]: location({
    id: CODES.entryHall,
    name: 'Entry Hall',
    symbol: 'square',
    connectsTo: ['circle'],
    shroud: 2,
  }),
  [CODES.quietHallsSecond]: location({
    id: CODES.quietHallsSecond,
    name: 'Quiet Halls',
    symbol: 'circle',
    connectsTo: ['square', 'star'],
    shroud: 3,
  }),
  [CODES.quietHallsThird]: location({
    id: CODES.quietHallsThird,
    name: 'Quiet Halls',
    symbol: 'star',
    connectsTo: ['circle'],
    shroud: 3,
  }),
  [CODES.meetingRoom]: society(
    {
      id: CODES.meetingRoom,
      name: 'Meeting Room',
      symbol: 'diamond',
      connectsTo: ['square'],
      shroud: 4,
      clues: 1,
    },
    'square',
  ),
  [CODES.recordOfficeGround]: society(
    {
      id: CODES.recordOfficeGround,
      name: 'Record Office',
      symbol: 'plus',
      connectsTo: ['square'],
      shroud: 2,
      clues: 1,
    },
    'square',
  ),
  [CODES.museumGround]: society(
    {
      id: CODES.museumGround,
      name: 'Historical Museum',
      symbol: 'heart',
      connectsTo: ['square', 'hourglass'],
      shroud: 2,
      clues: 1,
    },
    'square',
  ),
  [CODES.museumSecond]: society(
    {
      id: CODES.museumSecond,
      name: 'Historical Museum',
      symbol: 'hourglass',
      connectsTo: ['circle', 'heart'],
      shroud: 2,
      clues: 1,
    },
    'circle',
  ),
  [CODES.librarySecond]: society(
    {
      id: CODES.librarySecond,
      name: 'Historical Library',
      symbol: 'triangle',
      connectsTo: ['circle', 'squiggle'],
      shroud: 3,
      clues: 2,
    },
    'circle',
  ),
  [CODES.readingRoom]: society(
    {
      id: CODES.readingRoom,
      name: 'Reading Room',
      symbol: 't',
      connectsTo: ['circle'],
      shroud: 5,
      clues: 1,
      fixed: true,
    },
    'circle',
  ),
  [CODES.libraryThird]: society(
    {
      id: CODES.libraryThird,
      name: 'Historical Library',
      symbol: 'squiggle',
      connectsTo: ['star', 'triangle'],
      shroud: 3,
      clues: 2,
    },
    'star',
  ),
  [CODES.peabodysOffice]: society(
    {
      id: CODES.peabodysOffice,
      name: "Peabody's Office",
      symbol: 'moon',
      connectsTo: ['star'],
      shroud: 4,
      clues: 2,
    },
    'star',
  ),
  [CODES.recordOfficeThird]: society(
    {
      id: CODES.recordOfficeThird,
      name: 'Record Office',
      symbol: 'equals',
      connectsTo: ['star'],
      shroud: 2,
      clues: 1,
    },
    'star',
  ),
  [CODES.hiddenLibrary]: location({
    id: CODES.hiddenLibrary,
    name: 'Hidden Library',
    symbol: 'none',
    connectsTo: [],
    position: [3, 1],
    shroud: 4,
    clues: 3,
    victory: 2,
  }),
}

const card = (code: string, name: string, traits: string[], keywords: 'peril'[] = []) =>
  treachery({ code, name, traits, keywords })

/** Conjunto Ecos del pasado: sus cartas de Encuentro (los Buscadores, aparte). */
const echoesSet = [
  ...copies(card(CODES.ledAstray, 'Led Astray', ['Scheme'], ['peril']), 3),
  ...copies(card(CODES.theCultsSearch, "The Cult's Search", ['Scheme']), 2),
]

const ROW = { third: 0, second: 1, ground: 2 } as const

/** Guía ES p. 10, "Preparación". */
export function echoesOfThePast({
  difficulty,
  seed = 0,
  players = 1,
  log,
}: Pick<ScenarioContext, 'difficulty'> & {
  seed?: number
  players?: number
  log?: ScenarioContext['log']
}): ScenarioDefinition {
  // Se retira al azar 1 Lugar "Sociedad Histórica" de cada planta, sin mirarlo.
  let rng = seedRng(seed)
  const floors = {} as Record<keyof typeof FLOORS, string[]>
  for (const floor of Object.keys(FLOORS) as (keyof typeof FLOORS)[]) {
    const [kept, next] = shuffle([...FLOORS[floor]], rng)
    rng = next
    floors[floor] = kept.slice(0, 2)
  }
  const placed = (Object.keys(floors) as (keyof typeof FLOORS)[]).flatMap((floor) =>
    floors[floor].map((code, n): LocationCard => ({
      ...locationCards[code]!,
      position: [n * 2, ROW[floor]],
    })),
  )
  // Buscadores de Carcosa según el número de jugadores, en Lugares distintos.
  const [upper] = shuffle([...floors.second, ...floors.third], rng)
  const seekersAt =
    players === 2
      ? floors.third.slice(0, 1)
      : players === 3
        ? floors.third
        : players === 4
          ? upper.slice(0, 3)
          : []
  const hubs = [
    { ...locationCards[CODES.entryHall]!, position: [1, ROW.ground] as [number, number] },
    { ...locationCards[CODES.quietHallsSecond]!, position: [1, ROW.second] as [number, number] },
    { ...locationCards[CODES.quietHallsThird]!, position: [1, ROW.third] as [number, number] },
  ]
  const seekers = copies(seekerOfCarcosa, 3)
  return {
    id: ECHOES_OF_THE_PAST,
    intro: [
      { title: 'story.echoes.introTitle', body: 'story.echoes.intro' },
      // Información de Sebastien, si se le interrogó en El Último Rey.
      ...(hasNote(log, 'carcosaInterviewedSebastien')
        ? [{ title: 'story.echoes.sebastienTitle', body: 'story.echoes.sebastien' }]
        : []),
    ],
    setupInstructions: { title: 'story.echoes.setupTitle', body: 'story.echoes.setup' },
    locations: [...hubs, ...placed],
    setAsideLocations: [locationCards[CODES.hiddenLibrary]!],
    startingLocation: CODES.entryHall,
    agendas: [
      { code: CODES.theTruthIsHidden, name: 'The Truth is Hidden', doomThreshold: 2 * players },
      {
        code: CODES.ransackingTheManor,
        name: 'Ransacking the Manor',
        doomThreshold: 2 * players,
      },
      {
        code: CODES.secretsBetterLeftHidden,
        name: 'Secrets Better Left Hidden',
        doomThreshold: 3 * players,
      },
    ],
    acts: [
      {
        code: CODES.raceForAnswers,
        name: 'Race for Answers',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      {
        code: CODES.mistakesOfThePast,
        name: 'Mistakes of the Past',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      {
        code: CODES.theOath,
        name: 'The Oath',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
        cluesAtLocation: CODES.hiddenLibrary,
      },
    ],
    encounterDeck: [
      ...seekers.slice(seekersAt.length),
      ...echoesSet,
      ...ENCOUNTER_SETS.cultOfTheYellowSign,
      ...ENCOUNTER_SETS.delusions,
      ...ENCOUNTER_SETS.midnightMasksTreacheries,
      ...ENCOUNTER_SETS.lockedDoors,
      ...ENCOUNTER_SETS.darkCult,
    ],
    setAside: [{ ...possessedOathspeaker }, { ...sebastien }],
    chaosBag: [...CARCOSA_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      // Información de Sebastien: 1 pista por investigador en el Vestíbulo de entrada.
      ...(hasNote(log, 'carcosaInterviewedSebastien')
        ? [
            {
              type: 'PlaceCluesOnLocationFromPool',
              location: CODES.entryHall,
              amount: players,
            } as Message,
          ]
        : []),
      ...seekersAt.map((where, n): Message => ({
        type: 'SpawnEnemy',
        card: seekers[n]!,
        location: where,
        engageWith: null,
      })),
    ],
  }
}

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

const specific = (key: string, data: Record<string, string | number | boolean> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})

const entry = storyEntries('echoes')
const hard = (state: GameState) => state.difficulty === 'hard' || state.difficulty === 'expert'
const inPlay = (state: GameState, code: string) => !!state.locations[code]

/** Lugar elegido por el Sr. Peabody, mientras siga agotado. */
function peabodyLocation(state: GameState): LocationId | null {
  const where = state.scenarioMeta?.[PEABODY_LOCATION]
  const peabody = Object.values(state.assets).find((a) => a.code === MR_PEABODY)
  return typeof where === 'string' && peabody?.exhausted && state.locations[where] ? where : null
}

/** Lugares con el rasgo Pasadizo ahora mismo (para investigadores). */
function passageways(state: GameState): LocationId[] {
  const printed = PASSAGEWAYS.filter((code) => state.locations[code]?.revealed)
  const peabody = peabodyLocation(state)
  return [...new Set([...printed, ...(peabody ? [peabody] : [])])]
}

const theOath = (state: GameState) => state.acts[state.actIndex]?.code === CODES.theOath

/** El jefe elige entre varias opciones; con una sola, se resuelve sin preguntar. */
function leadChooses(state: GameState, prompt: string, choices: Choice[]): Message[] {
  if (choices.length === 0) return []
  if (choices.length === 1) return choices[0]!.then
  const lead = leadInvestigator(state) ?? state.investigators[0]
  if (!lead) return []
  return [{ type: 'Ask', investigator: lead.id, question: { kind: 'chooseOne', prompt, choices } }]
}

/** Enemigos más cercanos a un investigador (todos, si no hay ninguno alcanzable). */
function nearestEnemies(state: GameState, investigator: InvestigatorId): Enemy[] {
  const all = Object.values(state.enemies)
  const here = getInvestigator(state, investigator).location
  if (here === null || !all.length) return all
  const distances = distancesFrom(state, here)
  const distance = (e: Enemy) => distances.get(e.location) ?? Infinity
  const best = Math.min(...all.map(distance))
  return all.filter((e) => distance(e) === best)
}

const enemyChoice = (e: Enemy, then: Message[]): Choice => ({
  label: 'choice.enemy',
  params: { enemy: e.name },
  target: { type: 'enemy', id: e.id },
  then,
})

/** Añade 1 pista por investigador a cada Lugar Sociedad Histórica revelado (hasta su valor). */
function lateNightStudies(state: GameState): Message[] {
  const players = state.investigators.length
  return Object.values(state.locations)
    .filter((l) => HISTORICAL_SOCIETY.includes(l.id) && l.revealed)
    .flatMap((l) => {
      const max = l.clueValue * (l.cluesPerInvestigator ? players : 1)
      const amount = Math.min(players, max - l.clues)
      return amount > 0
        ? [{ type: 'PlaceCluesOnLocationFromPool', location: l.id, amount } as Message]
        : []
    })
}

// ---------------------------------------------------------------------------
// Resoluciones (guía ES pp. 11–12)
// ---------------------------------------------------------------------------

const ECHOES_NEXT = 'story.carcosa.theUnspeakableOath'

function resolutionMessages(state: GameState, outcome: ScenarioOutcome): Message[] {
  // Sin resolución (todos retirados o derrotados): R4.
  const number = outcome.type === 'resolution' ? outcome.resolution : 4
  if (![1, 2, 3, 4].includes(number)) throw new Error('Invalid Echoes of the Past resolution')
  const final = resolution(number)
  const slain = state.victoryDisplay.includes(sebastien.code)
  const steps: Record<number, { note: string; tokens: string[]; mark?: 'doubt' | 'conviction' }> = {
    1: { note: 'carcosaTookTheOnyxClasp', tokens: ['cultist', 'cultist'], mark: 'conviction' },
    2: { note: 'carcosaLeftTheOnyxClasp', tokens: ['tablet', 'tablet'], mark: 'doubt' },
    3: { note: 'carcosaDestroyedTheOathspeaker', tokens: ['tablet', 'tablet'] },
    4: { note: 'carcosaFollowersFoundTheWay', tokens: ['cultist', 'tablet', 'elderThing'] },
  }
  const { note, tokens, mark } = steps[number]!
  const bonus = number === 4 ? 1 : 0
  const investigators = state.investigators
  // R1: el Broche de ónice negro es obligatorio para un investigador; R3: El Manto
  // Andrajoso es opcional.
  const reward = (code: string, optional: boolean): Message[] =>
    leadChooses(state, optional ? 'prompt.echoes.cloak' : 'prompt.echoes.clasp', [
      ...investigators.map((i): Choice => ({
        label: 'choice.investigator',
        params: { name: i.name },
        then: [{ type: 'AddStoryAsset', investigator: i.id, code }],
      })),
      ...(optional ? [{ label: 'choice.echoes.nobody', then: [] }] : []),
    ])
  return [
    ...(outcome.type === 'noResolution'
      ? [{ type: 'Story', entry: entry('noResolution') } as Message]
      : []),
    {
      type: 'Story',
      entry: entry(`resolution${number}`, [
        noteEffect(note),
        ...(mark
          ? [{ key: mark === 'doubt' ? 'story.carcosa.markDoubt' : 'story.carcosa.markConviction' }]
          : []),
        ...(number === 1 ? [{ key: 'story.echoes.claspEffect' }] : []),
        ...(number === 3 ? [{ key: 'story.echoes.cloakEffect' }] : []),
        ...(slain ? [noteEffect('carcosaSlainSebastien')] : []),
        { key: 'story.effect.experience', params: { bonus } },
        { key: `story.echoes.tokens${number}` },
        { key: 'story.effect.proceed', params: { scenario: ECHOES_NEXT } },
      ]),
    },
    recordNote(note),
    ...(mark ? [markCarcosa(mark)] : []),
    ...(number === 1 ? reward(CLASP_OF_BLACK_ONYX, false) : []),
    ...(number === 3 ? reward(THE_TATTERED_CLOAK, true) : []),
    ...(slain ? [recordNote('carcosaSlainSebastien')] : []),
    earnExperience(bonus, true),
    replaceSymbolTokens(...(tokens as ('cultist' | 'tablet' | 'elderThing')[])),
    endScenario(final),
  ]
}

// ---------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------

registerScenario({
  id: ECHOES_OF_THE_PAST,
  resolution: resolutionMessages,
  tokenEffect: (state, token, investigator) => {
    const doom = Object.values(state.enemies).map((e) => e.doom ?? 0)
    switch (token) {
      case 'skull':
        // -X: la perdición más alta sobre un enemigo (difícil: el total sobre enemigos).
        return {
          modifier: -(hard(state) ? doom.reduce((a, b) => a + b, 0) : Math.max(0, ...doom)),
        }
      case 'cultist': {
        const effect = [specific('echoesCultist', { investigator })]
        return hard(state) ? { modifier: -4, immediate: effect } : { modifier: -2, onFail: effect }
      }
      case 'tablet': {
        const effect: Message[] = [{ type: 'DiscardRandomFromHand', investigator, amount: 1 }]
        return hard(state) ? { modifier: -4, immediate: effect } : { modifier: -2, onFail: effect }
      }
      case 'elderThing': {
        const effect = [specific('echoesElderThing', { investigator })]
        return hard(state) ? { modifier: -4, immediate: effect } : { modifier: -2, onFail: effect }
      }
    }
    return { modifier: 0 }
  },
  // Pasadizos conectados entre sí en El juramento; los centros de planta, con su planta.
  connections: (state, l) => {
    const floorHub = (Object.keys(HUBS) as (keyof typeof HUBS)[]).find((f) => HUBS[f] === l.id)
    const own = floorHub ? FLOORS[floorHub].filter((code) => inPlay(state, code)) : []
    const passages = theOath(state) ? passageways(state) : []
    return [...own, ...(passages.includes(l.id) ? passages : [])]
  },
  // Mientras un enemigo se mueve, la Biblioteca oculta es un Pasadizo.
  enemyConnections: (state, location) => {
    if (!theOath(state) || !inPlay(state, CODES.hiddenLibrary)) return []
    const passages = passageways(state)
    if (location === CODES.hiddenLibrary) return passages
    return passages.includes(location) ? [CODES.hiddenLibrary] : []
  },
  shroudModifier: (state, l) =>
    (peabodyLocation(state) === l.id ? -1 : 0) +
    // Despacho de Peabody: -2 mientras un investigador de aquí controle al Sr. Peabody.
    (l.id === CODES.peabodysOffice &&
    Object.values(state.assets).some(
      (a) =>
        a.code === MR_PEABODY && getInvestigator(state, a.owner).location === CODES.peabodysOffice,
    )
      ? -2
      : 0),
  // Oficina de registros: los enemigos de aquí tienen +1 de combate y de evasión.
  enemyStat: (state, e, stat) =>
    (RECORD_OFFICES.includes(e.location) ? 1 : 0) +
    // El edicto del Rey (Secta del Signo Amarillo).
    kingsEdictFight(state, e, stat),
  // Museo histórico: al investigarlo, tu [intellect] no puede modificarse.
  skillUnmodified: (_state, test) =>
    test.skill === 'intellect' &&
    test.kind.type === 'investigate' &&
    MUSEUMS.includes(test.kind.location),
  // Juramentado poseído: no puede recibir daño durante los actos 1 y 2.
  enemyImmune: (state, e) => e.code === CODES.possessedOathspeaker && state.actIndex < 2,
  // Si huisteis de la fiesta: 1 acción adicional en el primer turno.
  actionsModifier: (state) =>
    state.round === 1 && hasNote(state.campaignLog, 'carcosaFledTheParty') ? 1 : 0,
  forced: (state, trigger) => {
    // Sociedad Histórica sin revelar: cuando aparece un enemigo aquí, se revela.
    if (
      trigger.type === 'enemySpawned' &&
      HISTORICAL_SOCIETY.includes(trigger.location) &&
      state.locations[trigger.location]?.revealed === false
    )
      return [{ type: 'RevealLocation', location: trigger.location }]
    return []
  },
  // Biblioteca histórica: tras investigarla con éxito (al terminar la prueba), 2 horror para
  // descubrir 1 pista más.
  reactions: (state, trigger) => {
    if (
      trigger.type !== 'skillTestEnded' ||
      trigger.kind !== 'investigate' ||
      !trigger.succeeded ||
      !trigger.location ||
      !LIBRARIES.includes(trigger.location) ||
      getInvestigator(state, trigger.investigator).location !== trigger.location
    )
      return []
    const who = trigger.investigator
    return [
      {
        key: `${trigger.location}:library`,
        investigator: who,
        label: 'ability.echoes.library',
        limit: { per: 'round' },
        then: [
          damage(who, 0, 2),
          { type: 'DiscoverClues', investigator: who, amount: 1, location: trigger.location },
        ],
      },
    ]
  },
  specific: (state, key, data) => {
    const common = carcosaSpecific(state, key, data) ?? encounterSpecific(state, key, data)
    if (common) return common
    const push = (...messages: Message[]): GameState => ({
      ...state,
      queue: [...messages, ...state.queue],
    })
    const investigator = typeof data.investigator === 'string' ? data.investigator : null
    switch (key) {
      case 'echoesConnections':
        // Ya revelada, solo recalcula las conexiones.
        return push({ type: 'RevealLocation', location: CODES.entryHall })
      case 'echoesCultist': {
        // 1 perdición en el enemigo más cercano. Como la carta no dice que pueda hacer
        // avanzar el plan, el umbral se comprueba en la fase de Mitos (RR p. 17).
        if (investigator === null) return state
        const targets = nearestEnemies(state, investigator)
        const doom = (e: Enemy): Message[] => [{ type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 1 }]
        if (targets.length <= 1) return push(...(targets[0] ? doom(targets[0]) : []))
        return push({
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEnemy',
            choices: targets.map((e) => enemyChoice(e, doom(e))),
          },
        })
      }
      case 'echoesElderThing': {
        // Con un enemigo en tu Lugar, 1 horror.
        if (investigator === null) return state
        const here = getInvestigator(state, investigator).location
        return Object.values(state.enemies).some((e) => e.location === here)
          ? push(damage(investigator, 0, 1))
          : state
      }
      case 'echoesReadingRoom': {
        // Toma 1 perdición de un enemigo, dale la vuelta y colócala sobre ti (pista).
        if (investigator === null) return state
        const withDoom = Object.values(state.enemies).filter((e) => (e.doom ?? 0) > 0)
        const take = (e: Enemy): Message[] => [
          { type: 'RemoveDoom', target: { type: 'enemy', id: e.id }, amount: 1 },
          { type: 'GainClues', investigator, amount: 1 },
        ]
        if (withDoom.length <= 1) return push(...(withDoom[0] ? take(withDoom[0]) : []))
        return push({
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEnemy',
            choices: withDoom.map((e) => enemyChoice(e, take(e))),
          },
        })
      }
      case 'echoesOathspeaker': {
        // Los investigadores preparan al Juramentado poseído o le colocan 1 perdición.
        const oath = state.enemies[String(data.enemy)]
        if (!oath) return state
        const doom: Message[] = [{ type: 'PlaceDoomOnEnemy', enemy: oath.id, amount: 1 }]
        if (!oath.exhausted) return push(...doom)
        return push(
          ...leadChooses(state, 'prompt.echoes.oathspeaker', [
            {
              label: 'choice.echoes.readyOathspeaker',
              then: [{ type: 'ReadyEnemy', enemy: oath.id }],
            },
            { label: 'choice.echoes.doomOnOathspeaker', then: doom },
          ]),
        )
      }
      case 'echoesSeeker': {
        // Mueve 1 pista de su Lugar al Buscador (perdición); si no puede, 1 perdición.
        const seeker = state.enemies[String(data.enemy)]
        if (!seeker) return state
        const clues = state.locations[seeker.location]?.clues ?? 0
        return push(
          clues > 0
            ? {
                type: 'MoveClues',
                from: { type: 'location', id: seeker.location },
                to: { type: 'enemy', id: seeker.id },
                amount: 1,
              }
            : { type: 'PlaceDoomOnEnemy', enemy: seeker.id, amount: 1 },
        )
      }
      case 'echoesPeabody': {
        // Reverso del acto 2: un investigador toma el control del Sr. Peabody.
        return push(
          ...leadChooses(
            state,
            'prompt.echoes.peabody',
            activeInvestigators(state).map((i) => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [{ type: 'PutAssetIntoPlay', investigator: i.id, code: MR_PEABODY }],
            })),
          ),
        )
      }
      case 'echoesFindCultist':
        return investigator ? findCultist(state, investigator) : state
      case 'echoesShuffleDiscard': {
        // Reverso del plan 1: la pila de descartes de Encuentros vuelve al mazo, barajada.
        const [deck, rng] = shuffle([...state.encounterDeck, ...state.encounterDiscard], state.rng)
        return { ...state, rng, encounterDeck: deck, encounterDiscard: [] }
      }
    }
    return state
  },
})

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

for (const code of [
  CODES.theTruthIsHidden,
  CODES.ransackingTheManor,
  CODES.secretsBetterLeftHidden,
])
  registerAgenda({
    code,
    // No se añade perdición en la fase de Mitos; las pistas sobre enemigos son perdición.
    skipsMythosDoom: true,
    enemyCluesBecomeDoom: true,
    onAdvance: (state) => {
      if (code === CODES.theTruthIsHidden) return [specific('echoesShuffleDiscard')]
      if (code === CODES.secretsBetterLeftHidden)
        return [{ type: 'EndScenario', outcome: resolution(4) }]
      // Reverso del plan 2: el Juramentado poseído (y Sebastien Moreau, si no murió) aparece
      // en el Vestíbulo de entrada.
      return [
        { type: 'SpawnSetAsideEnemy', code: CODES.possessedOathspeaker, location: CODES.entryHall },
        ...(hasNote(state.campaignLog, 'carcosaSlainSebastien')
          ? []
          : [
              {
                type: 'SpawnSetAsideEnemy',
                code: sebastien.code,
                location: CODES.entryHall,
              } as Message,
            ]),
      ]
    },
  })

// ---------------------------------------------------------------------------
// Actos
// ---------------------------------------------------------------------------

registerAct({
  code: CODES.raceForAnswers,
  onAdvance: (state) => lateNightStudies(state),
})

registerAct({
  code: CODES.mistakesOfThePast,
  // Reverso: más pistas, el Sr. Peabody y la Biblioteca oculta.
  onAdvance: (state) => [
    ...lateNightStudies(state),
    specific('echoesPeabody'),
    { type: 'PutLocationIntoPlay', location: CODES.hiddenLibrary },
  ],
})

registerAct({
  code: CODES.theOath,
  // Reverso "El broche": los investigadores deciden (→R1) o (→R2).
  onAdvance: () => [
    {
      type: 'Story',
      entry: entry('theClasp'),
      choices: [1, 2].map((n) => ({
        label: `story.echoes.decide${n}`,
        then: [{ type: 'EndScenario', outcome: resolution(n) } as Message],
      })),
    },
  ],
})

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.entryHall,
  abilities: (_state, self, investigator) => [resignAbility(investigator, `${self.id}:resign`)],
})

registerLocation({
  code: CODES.meetingRoom,
  // [action] Agota un Aliado: descubre 1 pista aquí (límite una vez por ronda).
  abilities: (state, self, investigator) =>
    Object.values(state.assets)
      .filter(
        (a) =>
          a.owner === investigator &&
          !a.exhausted &&
          (playerCardDef(a.code)?.traits ?? []).includes('Ally'),
      )
      .map((a): AbilityOption => ({
        key: `${self.id}:ally`,
        label: 'ability.echoes.meetingRoom',
        params: { card: playerCardDef(a.code)?.name ?? a.code },
        actions: 1,
        provokes: true,
        limit: { per: 'round' },
        target: { type: 'asset', id: a.id },
        costs: [{ type: 'ExhaustAsset', asset: a.id }],
        then: [{ type: 'DiscoverClues', investigator, amount: 1, location: self.id }],
      })),
})

for (const code of [CODES.quietHallsSecond, CODES.quietHallsThird])
  registerLocation({
    code,
    // [action] Si todos los Lugares están revelados y no quedan pistas en ellos: 1 pista por
    // investigador en los Pasillos tranquilos.
    abilities: (state, self) =>
      Object.values(state.locations).every((l) => l.revealed && l.clues === 0)
        ? [
            {
              key: `${self.id}:clues`,
              label: 'ability.echoes.quietHalls',
              actions: 1,
              provokes: true,
              then: [
                {
                  type: 'PlaceCluesOnLocationFromPool',
                  location: self.id,
                  amount: state.investigators.length,
                },
              ],
            },
          ]
        : [],
  })

registerLocation({
  code: CODES.readingRoom,
  // [action] Investigar: si tienes éxito, en vez de descubrir pistas, tomas 1 perdición de un
  // enemigo como pista (límite de grupo una vez por ronda).
  abilities: (state, self, investigator) =>
    investigationBlocked(state, self.id)
      ? []
      : [
          {
            key: `${self.id}:investigate`,
            label: 'ability.echoes.readingRoom',
            actions: 1,
            provokes: true,
            limit: { per: 'round', group: true },
            then: [
              {
                type: 'BeginSkillTest',
                investigator,
                skill: 'intellect',
                difficulty: shroudOf(state, self.id),
                tags: ['investigate'],
                kind: {
                  type: 'investigate',
                  location: self.id,
                  replaceClue: true,
                  onSuccess: [specific('echoesReadingRoom', { investigator })],
                },
              },
            ],
          },
        ],
})

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.possessedOathspeaker,
  forced: (_state, trigger, self) => {
    if (trigger.type === 'enemyPhaseBegins')
      return [specific('echoesOathspeaker', { enemy: self.id })]
    // Objetivo: si es derrotado, (→R3).
    if (trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id)
      return [{ type: 'EndScenario', outcome: resolution(3) }]
    return []
  },
})

registerEnemy({
  code: CODES.seekerOfCarcosa,
  // Aparición: cualquier Lugar Sociedad Histórica vacío.
  spawn: (state) => emptyLocations(state).filter((id) => HISTORICAL_SOCIETY.includes(id)),
  forced: (_state, trigger, self) =>
    trigger.type === 'mythosPhaseEnds' ? [specific('echoesSeeker', { enemy: self.id })] : [],
})

// ---------------------------------------------------------------------------
// Traiciones de Ecos del pasado
// ---------------------------------------------------------------------------

const cultists = (state: GameState) =>
  Object.values(state.enemies).filter((e) => (e.traits ?? []).includes('Cultist'))

registerTreachery({
  code: CODES.ledAstray,
  // Peligro. Colocas 1 de tus pistas sobre un Sectario o 1 perdición en el plan.
  revelation: (state, investigator) => {
    const doom: Choice = {
      label: 'choice.placeDoom',
      then: [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }],
    }
    const clues: Choice[] =
      getInvestigator(state, investigator).clues > 0
        ? cultists(state).map((e) =>
            enemyChoice(e, [
              {
                type: 'MoveClues',
                from: { type: 'investigator', id: investigator },
                to: { type: 'enemy', id: e.id },
                amount: 1,
              },
              { type: 'CheckAgenda' },
            ]),
          )
        : []
    if (!clues.length) return doom.then
    return [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.echoes.ledAstray',
          choices: [...clues, doom],
        },
      },
    ]
  },
})

registerTreachery({
  code: CODES.theCultsSearch,
  // Con perdición sobre algún Sectario: toda la perdición de los Sectarios pasa al plan. Si
  // no, busca un Sectario en el mazo y los descartes de Encuentros y róbalo.
  revelation: (state, investigator) => {
    const withDoom = cultists(state).filter((e) => (e.doom ?? 0) > 0)
    if (!withDoom.length) return [specific('echoesFindCultist', { investigator })]
    return [
      ...withDoom.flatMap((e): Message[] => [
        { type: 'RemoveDoom', target: { type: 'enemy', id: e.id }, amount: e.doom ?? 0 },
        { type: 'PlaceDoom', amount: e.doom ?? 0 },
      ]),
      { type: 'CheckAgenda' },
    ]
  },
})
