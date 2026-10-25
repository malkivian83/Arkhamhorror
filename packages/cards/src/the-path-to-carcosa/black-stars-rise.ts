/**
 * Escenario VII de El camino a Carcosa: "Surgen estrellas negras" (03274–03303).
 * Guía de campaña revisada ES, pp. 25–27.
 *
 * Planes dobles: el mazo "a" (03275–03277) es el primer mazo de Plan del motor y el "c"
 * (03278–03280) el segundo. Uno de los planes 2 sustituye su mazo por un acto (el camino
 * que deben abrir los investigadores); el otro lleva al plan 3 y a la Resolución 3.
 */
import {
  activeInvestigators,
  allPlayerCardDefs,
  getInvestigator,
  leadInvestigator,
  nextInt,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerScenario,
  registerTreachery,
  seedRng,
  shroudOf,
  shuffle,
  type Agenda,
  type AgendaDeck,
  type Choice,
  type EncounterCard,
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
  chooseAssetToDiscard,
  copies,
  damage,
  earnExperience,
  effectTest,
  endScenario,
  enemy,
  noteEffect,
  recordNote,
  resolution,
  storyEntries,
  treachery,
} from '../scenario-helpers'
import { CARCOSA_CHAOS_BAGS } from './campaign'
import { ENCOUNTER_SETS, encounterSpecific, SETS } from './encounter-sets'
import { carcosaSpecific, hasNote, markCarcosa, replaceSymbolTokens } from './log'
import { VIPS } from './the-last-king'

export const BLACK_STARS_RISE = 'black-stars-rise'

export const CODES = {
  scenario: '03274',
  theTideRises: '03275',
  letTheStormRageVortex: '03276a',
  letTheStormRageFlood: '03276b',
  theCityFloods: '03277',
  theRitualBegins: '03278',
  theEntityAboveFlood: '03279a',
  theEntityAboveVortex: '03279b',
  swallowedSky: '03280',
  openThePathBelow: '03281',
  openThePathAbove: '03282',
  porteDeLAvancee: '03283',
  grandRue: '03284',
  outerWallDamage: '03285',
  outerWallIcons: '03286',
  northTowerHorror: '03287',
  northTowerDifficulty: '03288',
  brokenStepsOmen: '03289',
  brokenStepsCultist: '03290',
  abbeyChurch: '03291',
  choeurGothiqueDamage: '03292',
  choeurGothiqueHorror: '03293',
  cloister: '03294',
  knightsHall: '03295',
  chapelPathOpen: '03296',
  chapelWatersForbidden: '03297',
  towerPathOpen: '03298',
  towerSpiresForbidden: '03299',
  tidalTerror: '03300',
  riftSeeker: '03301',
  crashingFloods: '03302',
  worldsMerge: '03303',
} as const

/** Las dos versiones (por el icono del reverso): La inundación de abajo y El vórtice de arriba. */
export type BlackStarsVersion = 'flood' | 'vortex'
export const VERSIONS: Record<
  BlackStarsVersion,
  { agendaA: string; agendaC: string; chapel: string; tower: string }
> = {
  flood: {
    agendaA: CODES.letTheStormRageFlood,
    agendaC: CODES.theEntityAboveFlood,
    chapel: CODES.chapelPathOpen,
    tower: CODES.towerSpiresForbidden,
  },
  vortex: {
    agendaA: CODES.letTheStormRageVortex,
    agendaC: CODES.theEntityAboveVortex,
    chapel: CODES.chapelWatersForbidden,
    tower: CODES.towerPathOpen,
  },
}

const A_DECK = [
  CODES.theTideRises,
  CODES.letTheStormRageVortex,
  CODES.letTheStormRageFlood,
  CODES.theCityFloods,
] as string[]
const C_DECK = [
  CODES.theRitualBegins,
  CODES.theEntityAboveFlood,
  CODES.theEntityAboveVortex,
  CODES.swallowedSky,
] as string[]
/** Número de cada plan (para Iglesia de la abadía y las traiciones). */
const NUMBER: Record<string, number> = {
  [CODES.theTideRises]: 1,
  [CODES.letTheStormRageVortex]: 2,
  [CODES.letTheStormRageFlood]: 2,
  [CODES.theCityFloods]: 3,
  [CODES.theRitualBegins]: 1,
  [CODES.theEntityAboveFlood]: 2,
  [CODES.theEntityAboveVortex]: 2,
  [CODES.swallowedSky]: 3,
}

const FOUND_GUIDE = 'carcosa:foundAGuide'
const TOWER_KEY = 'carcosa:foundTheTowerKey'
const VERSION = 'carcosa:blackStarsVersion'

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

type Place = Omit<LocationCard, 'connections' | 'clueValue' | 'cluesPerInvestigator'> & {
  clues?: number
}
const place = ({ clues = 0, ...card }: Place): LocationCard => ({
  ...card,
  clueValue: clues,
  cluesPerInvestigator: clues > 0,
  connections: [],
})

// Símbolos de la referencia: círculo, ondas, triángulo, rombo, igual, cuadrado, T,
// corazón, reloj de arena, luna y estrella.
export const locationCards: Record<string, LocationCard> = {
  [CODES.porteDeLAvancee]: place({
    id: CODES.porteDeLAvancee,
    name: "Porte de l'Avancée",
    shroud: 3,
    clues: 1,
    symbol: 'circle',
    connectsTo: ['squiggle'],
  }),
  [CODES.grandRue]: place({
    id: CODES.grandRue,
    name: 'Grand Rue',
    shroud: 1,
    clues: 1,
    symbol: 'squiggle',
    connectsTo: ['circle', 'triangle', 'diamond', 'equals'],
  }),
  ...Object.fromEntries(
    (
      [
        [CODES.outerWallDamage, 2, 2],
        [CODES.outerWallIcons, 4, 1],
      ] as const
    ).map(([id, shroud, clues]) => [
      id,
      place({
        id,
        name: 'Outer Wall',
        shroud,
        clues,
        victory: 1,
        symbol: 'triangle',
        connectsTo: ['squiggle', 'diamond', 'equals'],
      }),
    ]),
  ),
  ...Object.fromEntries(
    (
      [
        [CODES.northTowerHorror, 2, 2],
        [CODES.northTowerDifficulty, 4, 1],
      ] as const
    ).map(([id, shroud, clues]) => [
      id,
      place({
        id,
        name: 'North Tower',
        shroud,
        clues,
        victory: 1,
        symbol: 'diamond',
        connectsTo: ['squiggle', 'triangle', 'equals'],
      }),
    ]),
  ),
  ...Object.fromEntries(
    (
      [
        [CODES.brokenStepsOmen, 4],
        [CODES.brokenStepsCultist, 3],
      ] as const
    ).map(([id, shroud]) => [
      id,
      place({
        id,
        name: 'Broken Steps',
        shroud,
        symbol: 'equals',
        connectsTo: ['squiggle', 'triangle', 'diamond', 'square'],
      }),
    ]),
  ),
  [CODES.abbeyChurch]: place({
    id: CODES.abbeyChurch,
    name: 'Abbey Church',
    shroud: 3,
    clues: 1,
    victory: 1,
    symbol: 'square',
    connectsTo: ['equals', 't', 'heart', 'hourglass', 'moon'],
  }),
  ...Object.fromEntries(
    [CODES.choeurGothiqueDamage, CODES.choeurGothiqueHorror].map((id) => [
      id,
      place({
        id,
        name: 'Chœur Gothique',
        shroud: 3,
        clues: 1,
        symbol: 't',
        connectsTo: ['square', 'star'],
      }),
    ]),
  ),
  [CODES.cloister]: place({
    id: CODES.cloister,
    name: 'Cloister',
    shroud: 2,
    clues: 1,
    symbol: 'heart',
    connectsTo: ['square', 'hourglass'],
  }),
  [CODES.knightsHall]: place({
    id: CODES.knightsHall,
    name: "Knight's Hall",
    shroud: 2,
    clues: 1,
    symbol: 'hourglass',
    connectsTo: ['square', 'heart'],
  }),
  [CODES.chapelPathOpen]: place({
    id: CODES.chapelPathOpen,
    name: 'Chapel of St. Aubert',
    shroud: 3,
    clues: 2,
    symbol: 'moon',
    connectsTo: ['square'],
  }),
  [CODES.chapelWatersForbidden]: place({
    id: CODES.chapelWatersForbidden,
    name: 'Chapel of St. Aubert',
    shroud: 2,
    clues: 3,
    victory: 2,
    symbol: 'moon',
    connectsTo: ['square'],
  }),
  [CODES.towerPathOpen]: place({
    id: CODES.towerPathOpen,
    name: 'Abbey Tower',
    shroud: 3,
    clues: 2,
    symbol: 'star',
    connectsTo: ['t'],
  }),
  [CODES.towerSpiresForbidden]: place({
    id: CODES.towerSpiresForbidden,
    name: 'Abbey Tower',
    shroud: 2,
    clues: 3,
    victory: 2,
    symbol: 'star',
    connectsTo: ['t'],
  }),
}

/** Disposición sugerida (guía ES p. 26). */
const POSITIONS: Record<string, [number, number]> = {
  [CODES.cloister]: [1, 0],
  northTower: [3, 0],
  [CODES.knightsHall]: [0, 1],
  [CODES.abbeyChurch]: [1, 2],
  brokenSteps: [2, 2],
  outerWall: [4, 2],
  chapel: [0, 3],
  choeur: [1, 4],
  [CODES.grandRue]: [3, 4],
  tower: [1, 5],
  [CODES.porteDeLAvancee]: [3, 5],
}
const at = (card: LocationCard, key: string): LocationCard => ({
  ...card,
  position: POSITIONS[key] ?? POSITIONS[card.id]!,
})

export const tidalTerror: EnemyCard = enemy({
  code: CODES.tidalTerror,
  name: 'Tidal Terror',
  traits: ['Monster'],
  fight: 4,
  health: 4,
  evade: 2,
  damage: 1,
  horror: 2,
  keywords: ['hunter'],
})

export const riftSeeker: EnemyCard = enemy({
  code: CODES.riftSeeker,
  name: 'Rift Seeker',
  traits: ['Monster', 'Byakhee', 'Cultist'],
  fight: 3,
  health: 3,
  evade: 4,
  damage: 1,
  horror: 1,
  keywords: [],
})

const card = (code: string, name: string, traits: string[]) =>
  treachery({ code, name, traits, keywords: [] })

/** Conjunto Surgen estrellas negras: sus cartas de Encuentro (los enemigos van aparte). */
const blackStarsSet: EncounterCard[] = [
  ...copies(card(CODES.crashingFloods, 'Crashing Floods', ['Omen']), 3),
  ...copies(card(CODES.worldsMerge, 'Worlds Merge', ['Omen']), 3),
]

const ashleigh = VIPS.find((v) => v.key === 'Ashleigh')!.enemy

const AGENDA_NAMES: Record<string, string> = {
  [CODES.theTideRises]: 'The Tide Rises',
  [CODES.letTheStormRageVortex]: 'Let The Storm Rage',
  [CODES.letTheStormRageFlood]: 'Let The Storm Rage',
  [CODES.theCityFloods]: 'The City Floods',
  [CODES.theRitualBegins]: 'The Ritual Begins',
  [CODES.theEntityAboveFlood]: 'The Entity Above',
  [CODES.theEntityAboveVortex]: 'The Entity Above',
  [CODES.swallowedSky]: 'Swallowed Sky',
}
const agenda = (code: string, doomThreshold: number): Agenda => ({
  code,
  name: AGENDA_NAMES[code]!,
  doomThreshold,
})

/** Guía ES p. 25, "Preparación". */
export function blackStarsRise({
  difficulty,
  seed = 0,
  log,
  version: fixed,
}: Pick<ScenarioContext, 'difficulty'> & {
  seed?: number
  log?: ScenarioContext['log']
  /** Solo para pruebas: fija el montón elegido. */
  version?: BlackStarsVersion
}): ScenarioDefinition {
  let rng = seedRng(seed)
  const pick = <T>(items: readonly T[]): T => {
    const [n, next] = nextInt(rng, items.length)
    rng = next
    return items[n]!
  }
  // Se elige al azar uno de los dos montones (sin mirar los reversos).
  const random = pick(['flood', 'vortex'] as const)
  const version = fixed ?? random
  const chosen = VERSIONS[version]
  const choeur = pick([CODES.choeurGothiqueDamage, CODES.choeurGothiqueHorror])
  const northTower = pick([CODES.northTowerHorror, CODES.northTowerDifficulty])
  const outerWall = pick([CODES.outerWallDamage, CODES.outerWallIcons])
  const brokenSteps = pick([CODES.brokenStepsOmen, CODES.brokenStepsCultist])
  const ashleighInfo = hasNote(log, 'carcosaInterviewedAshleigh')
  return {
    id: BLACK_STARS_RISE,
    intro: [
      { title: 'story.bsr.introTitle', body: 'story.bsr.intro' },
      ...(ashleighInfo
        ? [
            {
              title: 'story.bsr.ashleighTitle',
              body: 'story.bsr.ashleigh',
              effects: [{ key: 'story.bsr.ashleighEffect' }],
            },
          ]
        : []),
    ],
    setupInstructions: { title: 'story.bsr.setupTitle', body: 'story.bsr.setup' },
    locations: [
      at(locationCards[CODES.porteDeLAvancee]!, CODES.porteDeLAvancee),
      at(locationCards[CODES.grandRue]!, CODES.grandRue),
      at(locationCards[outerWall]!, 'outerWall'),
      at(locationCards[northTower]!, 'northTower'),
      at(locationCards[brokenSteps]!, 'brokenSteps'),
      at(locationCards[CODES.abbeyChurch]!, CODES.abbeyChurch),
    ],
    setAsideLocations: [
      at(locationCards[choeur]!, 'choeur'),
      at(locationCards[CODES.cloister]!, CODES.cloister),
      at(locationCards[CODES.knightsHall]!, CODES.knightsHall),
      at(locationCards[chosen.chapel]!, 'chapel'),
      at(locationCards[chosen.tower]!, 'tower'),
    ],
    startingLocation: CODES.porteDeLAvancee,
    // Este escenario no tiene mazo de Acto: dos mazos de Plan.
    agendas: [
      agenda(CODES.theTideRises, 5),
      agenda(chosen.agendaA, 6),
      agenda(CODES.theCityFloods, 8),
    ],
    secondAgendas: [
      agenda(CODES.theRitualBegins, 5),
      agenda(chosen.agendaC, 6),
      agenda(CODES.swallowedSky, 8),
    ],
    acts: [],
    encounterDeck: [
      ...blackStarsSet,
      ...ENCOUNTER_SETS.evilPortents,
      ...ENCOUNTER_SETS.byakhee,
      // Habitantes de Carcosa sin la Bestia de Aldebarán, que se aparta.
      ...ENCOUNTER_SETS.inhabitantsOfCarcosa.filter((c) => c.code !== SETS.beastOfAldebaran),
      ...ENCOUNTER_SETS.theStranger,
      ...ENCOUNTER_SETS.darkCult,
      ...ENCOUNTER_SETS.ancientEvils,
    ],
    setAside: [
      ...copies(tidalTerror, 2),
      ...copies(riftSeeker, 2),
      ...ENCOUNTER_SETS.inhabitantsOfCarcosa.filter((c) => c.code === SETS.beastOfAldebaran),
    ],
    chaosBag: [...CARCOSA_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      { type: 'SetScenarioMeta', key: VERSION, value: version },
      // Ficha de Caos para el resto de la campaña según la dificultad.
      {
        type: 'AddChaosTokens',
        tokens: [{ easy: -3, standard: -5, hard: -6, expert: -7 }[difficulty]],
      },
      specific('bsrWeaknesses'),
    ],
  }
}

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

function specific(key: string, data: Record<string, string | number | boolean> = {}): Message {
  return { type: 'ScenarioSpecific', key, data }
}

const entry = storyEntries('bsr')
const hard = (state: GameState) => state.difficulty === 'hard' || state.difficulty === 'expert'
const push = (state: GameState, ...messages: Message[]): GameState => ({
  ...state,
  queue: [...messages, ...state.queue],
})
const players = (state: GameState) => state.startingInvestigatorCount
const findLocation = (state: GameState, ...codes: string[]) =>
  Object.keys(state.locations).find((id) => codes.includes(id)) ?? null
const isAt = (state: GameState, investigator: InvestigatorId, ...codes: string[]) => {
  const here = getInvestigator(state, investigator).location
  return here !== null && codes.includes(here)
}
const remembered = (state: GameState, key: string) => state.scenarioMeta?.[key] === 1

/** Plan en curso de cada mazo ("a" o "c"), con su mazo del motor y su perdición. */
interface CurrentAgenda {
  code: string
  deck: AgendaDeck
  doom: number
}
function current(state: GameState, letter: 'a' | 'c'): CurrentAgenda | null {
  const codes = letter === 'a' ? A_DECK : C_DECK
  const first = state.agendas[state.agendaIndex]
  if (first?.code && codes.includes(first.code))
    return { code: first.code, deck: 'first', doom: state.doom }
  const second = state.secondAgenda
  const other = second?.agendas[second.index]
  if (second && other?.code && codes.includes(other.code))
    return { code: other.code, deck: 'second', doom: second.doom }
  return null
}
const agendasInPlay = (state: GameState) =>
  [current(state, 'a'), current(state, 'c')].filter((a): a is CurrentAgenda => !!a)
const letterOf = (state: GameState, deck: AgendaDeck | undefined): 'a' | 'c' | null => {
  const found = agendasInPlay(state).find((a) => a.deck === (deck ?? 'first'))
  return found ? (A_DECK.includes(found.code) ? 'a' : 'c') : null
}
const doomOnEach = (state: GameState, amount = 1): Message[] =>
  agendasInPlay(state).map((a): Message => ({ type: 'PlaceDoom', amount, agenda: a.deck }))

/** Paso del mazo "a" o "c" (1–3): el acto 3 cuenta como 3. */
function step(state: GameState, letter: 'a' | 'c'): number {
  const agenda = current(state, letter)
  if (agenda) return NUMBER[agenda.code] ?? 1
  return 3
}

/** El jefe elige entre varias opciones; con una sola, se resuelve sin preguntar. */
function leadChooses(state: GameState, prompt: string, choices: Choice[]): Message[] {
  if (choices.length === 0) return []
  if (choices.length === 1) return choices[0]!.then
  const lead = leadInvestigator(state) ?? state.investigators[0]
  if (!lead) return []
  return [{ type: 'Ask', investigator: lead.id, question: { kind: 'chooseOne', prompt, choices } }]
}

/** Busca un enemigo en el mazo de Encuentros (y si no, en los descartes) y lo roba. */
function findAndDraw(
  state: GameState,
  investigator: InvestigatorId,
  matches: (c: EncounterCard) => boolean,
): GameState {
  const inDeck = state.encounterDeck.findIndex(matches)
  if (inDeck >= 0) {
    const found = state.encounterDeck[inDeck]!
    const [encounterDeck, rng] = shuffle(
      state.encounterDeck.filter((_, n) => n !== inDeck),
      state.rng,
    )
    return push(
      { ...state, encounterDeck, rng },
      { type: 'ResolveEncounterCard', investigator, card: found },
    )
  }
  return drawFromDiscard(state, investigator, matches)
}

/** Roba la carta superior de los descartes de Encuentros que cumpla la condición. */
function drawFromDiscard(
  state: GameState,
  investigator: InvestigatorId,
  matches: (c: EncounterCard) => boolean,
): GameState {
  const index = state.encounterDiscard.findLastIndex(matches)
  if (index < 0) return state
  return push(
    { ...state, encounterDiscard: state.encounterDiscard.filter((_, n) => n !== index) },
    { type: 'ResolveEncounterCard', investigator, card: state.encounterDiscard[index]! },
  )
}
const omen = (c: EncounterCard) => c.kind === 'treachery' && (c.traits ?? []).includes('Omen')
const cultist = (c: EncounterCard) => c.kind === 'enemy' && (c.traits ?? []).includes('Cultist')
const byakhee = (c: EncounterCard) => c.kind === 'enemy' && (c.traits ?? []).includes('Byakhee')

/** Debilidades básicas Locura, Pacto, Sectario o Detective del catálogo. */
const setupWeaknesses = () =>
  allPlayerCardDefs()
    .filter(
      (d) =>
        d.weakness === 'basicweakness' &&
        d.traits.some((t) => ['Madness', 'Pact', 'Cultist', 'Detective'].includes(t)),
    )
    .map((d) => d.code)
    .sort()

// ---------------------------------------------------------------------------
// Resoluciones (guía ES p. 27)
// ---------------------------------------------------------------------------

const NEXT = 'story.carcosa.dimCarcosa'

function resolutionMessages(state: GameState, outcome: ScenarioOutcome): Message[] {
  const number = outcome.type === 'resolution' ? outcome.resolution : 3
  if (![1, 2, 3].includes(number)) throw new Error('Invalid Black Stars Rise resolution')
  if (number === 3)
    return [
      {
        type: 'Story',
        entry: entry('resolution3', [
          noteEffect('carcosaRealmsMerged'),
          { key: 'story.bsr.allInsane' },
        ]),
      },
      recordNote('carcosaRealmsMerged'),
      // Guía ES p. 27: los investigadores pierden la campaña (no caben sustitutos).
      recordNote('campaignLost'),
      { type: 'DriveDefeatedInsane', all: true },
      endScenario(resolution(3)),
    ]
  const note = number === 1 ? 'carcosaOpenedThePathBelow' : 'carcosaOpenedThePathAbove'
  const second = number === 1 ? 'tablet' : 'elderThing'
  const slain = state.victoryDisplay.includes(ashleigh.code)
  return [
    {
      type: 'Story',
      entry: entry(`resolution${number}`, [
        noteEffect(note),
        { key: `story.bsr.tokens${number}` },
        ...(slain ? [noteEffect('carcosaSlainAshleigh')] : []),
        { key: 'story.effect.experience', params: { bonus: 0 } },
        { key: 'story.effect.proceed', params: { scenario: NEXT } },
      ]),
    },
    recordNote(note),
    replaceSymbolTokens('cultist', 'cultist', second, second),
    ...(slain ? [recordNote('carcosaSlainAshleigh')] : []),
    earnExperience(0, true),
    endScenario(resolution(number)),
  ]
}

// ---------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------

/** Habilidad de la Información de Ashleigh: retirar 1 perdición de un plan (una vez). */
function ashleighAbility(state: GameState, investigator: InvestigatorId) {
  if (!hasNote(state.campaignLog, 'carcosaInterviewedAshleigh')) return []
  const withDoom = agendasInPlay(state).filter((a) => a.doom > 0)
  if (!withDoom.length) return []
  return [
    {
      key: `${CODES.scenario}:ashleigh`,
      label: 'ability.bsr.ashleigh',
      actions: 0,
      provokes: false,
      limit: { per: 'game' as const, group: true },
      then: leadChooses(
        state,
        'prompt.bsr.removeDoom',
        withDoom.map((a) => ({
          label: 'choice.bsr.agenda',
          params: { name: AGENDA_NAMES[a.code]! },
          then: [{ type: 'RemoveDoom', target: { type: 'agenda', deck: a.deck }, amount: 1 }],
        })),
      ).map((m) => (m.type === 'Ask' ? { ...m, investigator } : m)),
    },
  ]
}

registerScenario({
  id: BLACK_STARS_RISE,
  resolution: resolutionMessages,
  abilities: (state, _self, investigator) => ashleighAbility(state, investigator),
  tokenEffect: (state, token, investigator) => {
    const test = state.skillTest
    switch (token) {
      case 'skull': {
        // Fácil/Normal: la mayor perdición sobre un plan; Difícil/Experto: la total.
        const doom = agendasInPlay(state).map((a) => a.doom)
        return {
          modifier: -(hard(state) ? doom.reduce((sum, n) => sum + n, 0) : Math.max(0, ...doom)),
        }
      }
      case 'cultist': {
        // Revela otra; falla automáticamente contra (o junto a) un enemigo con perdición.
        const here = getInvestigator(state, investigator).location
        const target =
          test?.kind.type === 'fight' || test?.kind.type === 'evade'
            ? state.enemies[test.kind.enemy]
            : undefined
        const fails = hard(state)
          ? Object.values(state.enemies).some((e) => e.location === here && (e.doom ?? 0) > 0)
          : (target?.doom ?? 0) > 0
        return fails ? { modifier: 0, autoFail: true } : { modifier: 0, revealAnother: true }
      }
      case 'tablet':
        // Revela otra; si fallas (Difícil: si no superas por al menos 1), 1 perdición en
        // cada plan.
        return {
          modifier: 0,
          revealAnother: true,
          ...(hard(state)
            ? { onSuccessBelow: { margin: 1, then: doomOnEach(state) } }
            : { onFail: doomOnEach(state) }),
        }
      case 'elderThing':
        return {
          modifier: hard(state) ? -3 : -2,
          onFail: [specific('bsrFindByakhee', { investigator })],
        }
    }
    return { modifier: 0 }
  },
  // Iglesia de la abadía: +2 velo con dos planes de distinto número.
  shroudModifier: (state, location) => {
    if (location.id !== CODES.abbeyChurch || !location.revealed) return 0
    const numbers = agendasInPlay(state).map((a) => NUMBER[a.code])
    return numbers.length === 2 && numbers[0] !== numbers[1] ? 2 : 0
  },
  // Torre norte (03288): -1 a la dificultad si el plan "a" tiene más perdición que el "c".
  skillModifier: (state, test) => {
    if (!isAt(state, test.investigator, CODES.northTowerDifficulty)) return 0
    const a = current(state, 'a')
    const c = current(state, 'c')
    return a && c && a.doom > c.doom ? 1 : 0
  },
  // Muro exterior (03286): iconos dobles si el plan "c" tiene más perdición que el "a".
  skillDoubling: (state, test) => {
    if (!isAt(state, test.investigator, CODES.outerWallIcons)) return {}
    const a = current(state, 'a')
    const c = current(state, 'c')
    return a && c && c.doom > a.doom ? { icons: true } : {}
  },
  // Capilla de san Auberto (03296) y Torre de la abadía (03298).
  cannotDiscoverClues: (state, investigator, location) => {
    const me = getInvestigator(state, investigator)
    if (location === CODES.chapelPathOpen) return me.sanity - me.horror > 3
    if (location === CODES.towerPathOpen) return me.hand.length > 0
    return false
  },
  // Plan 2c/3c: cada Monstruo +1 de combate.
  enemyStat: (state, enemy, stat) => {
    const c = current(state, 'c')
    return stat === 'fight' && c && NUMBER[c.code]! >= 2 && (enemy.traits ?? []).includes('Monster')
      ? 1
      : 0
  },
  // Ashleigh Clarke: quien está en su Lugar no roba en la fase de Mantenimiento.
  skipsUpkeepDraw: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return Object.values(state.enemies).some((e) => e.code === ashleigh.code && e.location === here)
  },
  canEnter: (state, _investigator, from, to) => {
    const target = state.locations[to]
    if (from === null || !target || target.revealed) return true
    // Capilla y Torre: ocultas o cerradas hasta recordar el guía o la llave.
    if (to === CODES.chapelPathOpen || to === CODES.chapelWatersForbidden)
      return remembered(state, FOUND_GUIDE)
    if (to === CODES.towerPathOpen || to === CODES.towerSpiresForbidden)
      return remembered(state, TOWER_KEY)
    // Iglesia de la abadía: los investigadores de los Escalones rotos gastan 3 pistas por
    // investigador, en grupo.
    if (to === CODES.abbeyChurch) return cluesAt(state, from) >= 3 * players(state)
    return true
  },
  beforeMove: (state, move) => {
    const mover = getInvestigator(state, move.investigator)
    const target = state.locations[move.location]
    if (!target || target.revealed || mover.location === null) return null
    if (move.location !== CODES.abbeyChurch) return null
    return [
      { ...move, checked: true },
      {
        type: 'PayGroupClues',
        amount: 3 * players(state),
        from: activeInvestigators(state)
          .filter((i) => i.location === mover.location)
          .map((i) => i.id),
      },
    ]
  },
  forced: (state, trigger) => {
    // Plan 2a/3a: cada copia de Antiguos males gana oleada.
    if (trigger.type === 'whenTreacheryDrawn') {
      const a = current(state, 'a')
      return state.treacheries[trigger.treachery]?.code === SETS.ancientEvils &&
        a &&
        NUMBER[a.code]! >= 2
        ? [{ type: 'GainSurge' }]
        : []
    }
    // Muro exterior (03285) y Torre norte (03287): tras colocar perdición en un mazo.
    if (trigger.type === 'afterDoomPlaced') {
      const letter = letterOf(state, trigger.agenda)
      const hit = (code: string, amount: number, horror: number) =>
        activeInvestigators(state)
          .filter((i) => i.location === code)
          .map((i) => damage(i.id, amount, horror))
      if (letter === 'a') return hit(CODES.outerWallDamage, 1, 0)
      if (letter === 'c') return hit(CODES.northTowerHorror, 0, 1)
      return []
    }
    // Grand Rue: tras superar por 1 o menos una prueba al investigarla.
    if (
      trigger.type === 'afterSkillTest' &&
      trigger.kind === 'investigate' &&
      trigger.succeeded &&
      trigger.margin <= 1 &&
      trigger.location === CODES.grandRue
    )
      return [specific('bsrMostDoom')]
    // Escalones rotos: tras entrar.
    if (trigger.type === 'afterMove') {
      const here = getInvestigator(state, trigger.investigator).location
      if (here === CODES.brokenStepsOmen || here === CODES.brokenStepsCultist)
        return [specific('bsrBrokenSteps', { investigator: trigger.investigator, location: here })]
    }
    return []
  },
  specific: (state, key, data) => {
    const common = carcosaSpecific(state, key, data) ?? encounterSpecific(state, key, data)
    if (common) return common
    const investigator = typeof data.investigator === 'string' ? data.investigator : null
    switch (key) {
      case 'bsrWeaknesses': {
        // Cada investigador añade a su mazo una Debilidad básica aleatoria Locura, Pacto,
        // Sectario o Detective.
        const pool = setupWeaknesses()
        if (!pool.length) return state
        let rng = state.rng
        const messages = state.investigators.flatMap((i): Message[] => {
          const [n, next] = nextInt(rng, pool.length)
          rng = next
          return [
            { type: 'AddStoryAsset', investigator: i.id, code: pool[n]! },
            { type: 'PlaceOnDeck', investigator: i.id, code: pool[n]!, where: 'top' },
            { type: 'ShuffleDeck', investigator: i.id },
          ]
        })
        return push({ ...state, rng }, ...messages)
      }
      case 'bsrFindByakhee':
        return investigator ? findAndDraw(state, investigator, byakhee) : state
      case 'bsrMostDoom': {
        // 1 perdición en el plan con más perdición (si empatan, se elige).
        const agendas = agendasInPlay(state)
        const most = Math.max(...agendas.map((a) => a.doom))
        const top = agendas.filter((a) => a.doom === most)
        return push(
          state,
          top.length === 1
            ? { type: 'PlaceDoom', amount: 1, agenda: top[0]!.deck }
            : { type: 'PlaceDoom', amount: 1 },
        )
      }
      case 'bsrBrokenSteps': {
        if (investigator === null) return state
        const omens = String(data.location) === CODES.brokenStepsOmen
        const me = getInvestigator(state, investigator)
        const choices: Choice[] = []
        if (omens) {
          if (me.actionsRemaining > 0)
            choices.push({
              label: 'choice.bsr.loseAction',
              then: [{ type: 'LoseActions', investigator, amount: 1 }],
            })
          if (state.encounterDiscard.some(omen))
            choices.push({
              label: 'choice.bsr.drawOmen',
              then: [specific('bsrDrawFromDiscard', { investigator, kind: 'omen' })],
            })
        } else {
          const discard = chooseAssetToDiscard(state, investigator)
          if (discard.length) choices.push({ label: 'choice.bsr.discardAsset', then: discard })
          if (state.encounterDiscard.some(cultist))
            choices.push({
              label: 'choice.bsr.drawCultist',
              then: [specific('bsrDrawFromDiscard', { investigator, kind: 'cultist' })],
            })
        }
        if (choices.length <= 1) return push(state, ...(choices[0]?.then ?? []))
        return push(state, {
          type: 'Ask',
          investigator,
          question: { kind: 'chooseOne', prompt: 'prompt.chooseEffect', choices },
        })
      }
      case 'bsrDrawFromDiscard':
        return investigator
          ? drawFromDiscard(state, investigator, data.kind === 'omen' ? omen : cultist)
          : state
      case 'bsrMoveDoom': {
        // Porte de l'Avancée: mueve 1 perdición de un mazo de Plan al otro y coloca 2 pistas.
        const from = data.from === 'second' ? 'second' : 'first'
        const to: AgendaDeck = from === 'first' ? 'second' : 'first'
        return push(
          state,
          { type: 'RemoveDoom', target: { type: 'agenda', deck: from }, amount: 1 },
          { type: 'PlaceDoom', amount: 1, agenda: to },
          {
            type: 'MoveClues',
            from: { type: 'pool' },
            to: { type: 'location', id: CODES.porteDeLAvancee },
            amount: 2,
          },
        )
      }
      case 'bsrToAct': {
        // Reverso "El camino a Carcosa": el resto del mazo sale del juego y su acto 3 entra.
        const letter = data.letter === 'c' ? 'c' : 'a'
        const deck = current(state, letter)
        const act =
          letter === 'a'
            ? {
                code: CODES.openThePathBelow,
                name: 'Open The Path Below',
                clueThreshold: 0,
                cluesPerInvestigator: false,
                advanceTiming: 'objective' as const,
              }
            : {
                code: CODES.openThePathAbove,
                name: 'Open The Path Above',
                clueThreshold: 0,
                cluesPerInvestigator: false,
                advanceTiming: 'objective' as const,
              }
        const withAct = { ...state, acts: [act], actIndex: 0 }
        if (!deck) return withAct
        const second = state.secondAgenda
        if (deck.deck === 'second' || !second) return { ...withAct, secondAgenda: null }
        // El primer mazo desaparece: el segundo pasa a ser el único mazo de Plan.
        return {
          ...withAct,
          agendas: second.agendas,
          agendaIndex: second.index,
          doom: second.doom,
          secondAgenda: null,
        }
      }
      case 'bsrShuffleBack': {
        // Reversos 1a/1c: los descartes y las copias apartadas vuelven al mazo de Encuentros.
        const code = String(data.code)
        const moving = state.setAside.filter((c) => c.code === code)
        const [encounterDeck, rng] = shuffle(
          [...state.encounterDeck, ...state.encounterDiscard, ...moving],
          state.rng,
        )
        return {
          ...state,
          rng,
          encounterDeck,
          encounterDiscard: [],
          setAside: state.setAside.filter((c) => c.code !== code),
        }
      }
      case 'bsrTakeHorror':
        return investigator ? push(state, damage(investigator, 0, Number(data.amount))) : state
      case 'bsrDiscardCards':
        return investigator
          ? push(state, {
              type: 'ChooseDiscardFromHand',
              investigator,
              amount: Math.min(
                Number(data.amount),
                getInvestigator(state, investigator).hand.length,
              ),
            })
          : state
    }
    return state
  },
})

/** Pistas de los investigadores de un Lugar. */
function cluesAt(state: GameState, location: LocationId | null): number {
  return activeInvestigators(state)
    .filter((i) => i.location === location)
    .reduce((sum, i) => sum + i.clues, 0)
}

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

/** [fast] Los investigadores gastan 1 pista por investigador, en grupo: 1 perdición aquí. */
function clueAbility(letter: 'a' | 'c') {
  return (state: GameState, self: Agenda) => {
    const mine = current(state, letter)
    if (!mine || mine.code !== self.code) return []
    const total = activeInvestigators(state).reduce((sum, i) => sum + i.clues, 0)
    if (total < players(state)) return []
    return [
      {
        key: `${self.code}:clues`,
        label: letter === 'a' ? 'ability.bsr.agendaResources' : 'ability.bsr.agendaCards',
        actions: 0,
        provokes: false,
        limit: { per: 'round' as const, group: true },
        then: [
          {
            type: 'PayGroupClues',
            amount: players(state),
            from: activeInvestigators(state).map((i) => i.id),
          } as Message,
          { type: 'PlaceDoom', amount: 1, agenda: mine.deck } as Message,
          { type: 'CheckAgenda' } as Message,
          ...activeInvestigators(state).map((i): Message =>
            letter === 'a'
              ? { type: 'GainResources', investigator: i.id, amount: 2 }
              : { type: 'DrawCards', investigator: i.id, amount: 1 },
          ),
        ],
      },
    ]
  }
}

/** Reverso 1a/1c: Convicción o Duda según la perdición del plan 1 del otro mazo. */
function markBelief(state: GameState, other: 'a' | 'c'): Message[] {
  const agenda = current(state, other)
  if (!agenda || NUMBER[agenda.code] !== 1) return []
  return [markCarcosa(agenda.doom <= 2 ? 'conviction' : 'doubt')]
}

registerAgenda({
  code: CODES.theTideRises,
  abilities: clueAbility('a'),
  onAdvance: (state) => [
    specific('bsrShuffleBack', { code: CODES.tidalTerror }),
    ...markBelief(state, 'c'),
  ],
})

registerAgenda({
  code: CODES.theRitualBegins,
  abilities: clueAbility('c'),
  onAdvance: (state) => [
    specific('bsrShuffleBack', { code: CODES.riftSeeker }),
    ...markBelief(state, 'a'),
  ],
})

/** Reverso "Mundos entrelazados": la Bestia de Aldebarán y Ashleigh Clarke aparecen. */
function worldsIntertwine(state: GameState, beastAt: string[]): Message[] {
  const beast = findLocation(state, ...beastAt)
  return [
    ...(beast
      ? [{ type: 'SpawnSetAsideEnemy', code: SETS.beastOfAldebaran, location: beast } as Message]
      : []),
    ...(!hasNote(state.campaignLog, 'carcosaSlainAshleigh') &&
    state.locations[CODES.porteDeLAvancee]
      ? [
          {
            type: 'SpawnEnemy',
            card: { ...ashleigh },
            location: CODES.porteDeLAvancee,
            engageWith: null,
          } as Message,
        ]
      : []),
  ]
}

for (const [code, letter] of [
  [CODES.letTheStormRageVortex, 'a'],
  [CODES.letTheStormRageFlood, 'a'],
  [CODES.theEntityAboveFlood, 'c'],
  [CODES.theEntityAboveVortex, 'c'],
] as const)
  registerAgenda({
    code,
    abilities: clueAbility(letter),
    onAdvance: (state) =>
      code === CODES.letTheStormRageVortex
        ? worldsIntertwine(state, [CODES.towerPathOpen, CODES.towerSpiresForbidden])
        : code === CODES.theEntityAboveFlood
          ? worldsIntertwine(state, [CODES.chapelPathOpen, CODES.chapelWatersForbidden])
          : [specific('bsrToAct', { letter })],
  })

for (const code of [CODES.theCityFloods, CODES.swallowedSky])
  registerAgenda({
    code,
    onAdvance: () => [{ type: 'EndScenario', outcome: resolution(3) }],
  })

// ---------------------------------------------------------------------------
// Actos
// ---------------------------------------------------------------------------

const allAtWithoutClues = (state: GameState, ...codes: string[]) => {
  const target = findLocation(state, ...codes)
  const active = activeInvestigators(state)
  return (
    !!target &&
    state.locations[target]!.clues === 0 &&
    active.length > 0 &&
    active.every((i) => i.location === target)
  )
}

registerAct({
  code: CODES.openThePathBelow,
  objectiveMet: (state) =>
    allAtWithoutClues(state, CODES.chapelPathOpen, CODES.chapelWatersForbidden),
  onAdvance: () => [{ type: 'EndScenario', outcome: resolution(1) }],
})

registerAct({
  code: CODES.openThePathAbove,
  objectiveMet: (state) =>
    allAtWithoutClues(state, CODES.towerPathOpen, CODES.towerSpiresForbidden),
  onAdvance: () => [{ type: 'EndScenario', outcome: resolution(2) }],
})

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

const here = (state: GameState, investigator: InvestigatorId, id: string) =>
  getInvestigator(state, investigator).location === id

registerLocation({
  code: CODES.porteDeLAvancee,
  // [action][action]: mueve 1 perdición de un mazo de Plan al otro y coloca 2 pistas aquí.
  abilities: (state, self, investigator) => {
    const agendas = agendasInPlay(state)
    if (!here(state, investigator, self.id) || agendas.length < 2) return []
    const withDoom = agendas.filter((a) => a.doom > 0)
    if (!withDoom.length) return []
    return [
      {
        key: `${CODES.porteDeLAvancee}:doom`,
        label: 'ability.bsr.moveDoom',
        actions: 2,
        provokes: true,
        then: leadChooses(
          state,
          'prompt.bsr.moveDoomFrom',
          withDoom.map((a) => ({
            label: 'choice.bsr.agenda',
            params: { name: AGENDA_NAMES[a.code]! },
            then: [specific('bsrMoveDoom', { from: a.deck })],
          })),
        ).map((m) => (m.type === 'Ask' ? { ...m, investigator } : m)),
      },
    ]
  },
})

registerLocation({
  code: CODES.abbeyChurch,
  // Forzado al revelarse: entran en juego los Lugares apartados de la abadía.
  onReveal: (state) =>
    Object.keys(state.setAsideLocations).map((location): Message => ({
      type: 'PutLocationIntoPlay',
      location,
    })),
})

for (const [code, letter] of [
  [CODES.choeurGothiqueDamage, 'a'],
  [CODES.choeurGothiqueHorror, 'c'],
] as const)
  registerLocation({
    code,
    // [action] Coloca 1 perdición en el plan "a" ("c"): cura 2 daño (horror). Una vez.
    abilities: (state, self, investigator) => {
      const agenda = current(state, letter)
      if (!agenda || !here(state, investigator, self.id)) return []
      return [
        {
          key: `${code}:heal`,
          label: letter === 'a' ? 'ability.bsr.healDamage' : 'ability.bsr.healHorror',
          actions: 1,
          provokes: true,
          limit: { per: 'game', group: true },
          then: [
            { type: 'PlaceDoom', amount: 1, agenda: agenda.deck },
            letter === 'a'
              ? { type: 'Heal', investigator, damage: 2, horror: 0 }
              : { type: 'Heal', investigator, damage: 0, horror: 2 },
          ],
        },
      ]
    },
  })

registerLocation({
  code: CODES.cloister,
  // [action] Sin pistas aquí: Negociar. [willpower] (3): "encontrasteis un guía".
  abilities: (state, self, investigator) =>
    here(state, investigator, self.id) && self.clues === 0 && !remembered(state, FOUND_GUIDE)
      ? [
          {
            key: `${CODES.cloister}:parley`,
            label: 'ability.bsr.findGuide',
            actions: 1,
            provokes: false,
            parley: true,
            then: [
              effectTest(investigator, 'Cloister', 'willpower', 3, {
                onSuccess: [{ type: 'SetScenarioMeta', key: FOUND_GUIDE, value: 1 }],
              }),
            ],
          },
        ]
      : [],
})

registerLocation({
  code: CODES.knightsHall,
  // [action] Sin pistas aquí: Investigar con [agility]; si tienes éxito, en vez de descubrir
  // pistas, "encontrasteis la llave de la torre".
  abilities: (state, self, investigator) =>
    here(state, investigator, self.id) && self.clues === 0 && !remembered(state, TOWER_KEY)
      ? [
          {
            key: `${CODES.knightsHall}:investigate`,
            label: 'ability.bsr.findKey',
            actions: 1,
            provokes: true,
            then: [
              {
                type: 'BeginSkillTest',
                investigator,
                skill: 'agility',
                difficulty: shroudOf(state, self.id),
                tags: ['investigate'],
                kind: {
                  type: 'investigate',
                  location: self.id,
                  replaceClue: true,
                  onSuccess: [{ type: 'SetScenarioMeta', key: TOWER_KEY, value: 1 }],
                },
              },
            ],
          },
        ]
      : [],
})

registerLocation({
  code: CODES.chapelPathOpen,
  // [action]: recibe hasta 3 horror.
  abilities: (state, self, investigator) =>
    here(state, investigator, self.id)
      ? [
          {
            key: `${CODES.chapelPathOpen}:horror`,
            label: 'ability.bsr.takeHorror',
            actions: 1,
            provokes: true,
            then: [
              {
                type: 'Ask',
                investigator,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.bsr.howMuchHorror',
                  choices: [0, 1, 2, 3].map((amount) => ({
                    label: 'choice.bsr.amount',
                    params: { amount },
                    then: amount ? [specific('bsrTakeHorror', { investigator, amount })] : [],
                  })),
                },
              },
            ],
          },
        ]
      : [],
})

registerLocation({
  code: CODES.towerPathOpen,
  // [action]: descarta hasta 3 cartas de tu mano.
  abilities: (state, self, investigator) => {
    const hand = getInvestigator(state, investigator).hand.length
    return here(state, investigator, self.id) && hand > 0
      ? [
          {
            key: `${CODES.towerPathOpen}:discard`,
            label: 'ability.bsr.discardCards',
            actions: 1,
            provokes: true,
            then: [
              {
                type: 'Ask',
                investigator,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.bsr.howManyCards',
                  choices: [0, 1, 2, 3]
                    .filter((n) => n <= hand)
                    .map((amount) => ({
                      label: 'choice.bsr.amount',
                      params: { amount },
                      then: amount ? [specific('bsrDiscardCards', { investigator, amount })] : [],
                    })),
                },
              },
            ],
          },
        ]
      : []
  },
})

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.tidalTerror,
  // Aparición: Porte de l'Avancée o Capilla de san Auberto.
  spawn: (state) =>
    [CODES.porteDeLAvancee, CODES.chapelPathOpen, CODES.chapelWatersForbidden].filter(
      (id) => !!state.locations[id],
    ),
})

registerEnemy({
  code: CODES.riftSeeker,
  // Forzado: tras atacarte, +1 daño y +1 horror o 1 perdición en cada plan.
  forced: (state, trigger, self) =>
    trigger.type === 'afterEnemyAttack' && trigger.enemy === self.id
      ? [
          {
            type: 'Ask',
            investigator: trigger.investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEffect',
              choices: [
                {
                  label: 'choice.bsr.extraHarm',
                  then: [damage(trigger.investigator, 1, 1)],
                },
                { label: 'choice.bsr.doomOnEach', then: doomOnEach(state) },
              ],
            },
          },
        ]
      : [],
  // [action] 1 perdición en cada plan y 2 horror: Negociar. Descarta el Buscador.
  abilities: (state, self, investigator) =>
    getInvestigator(state, investigator).location === self.location
      ? [
          {
            key: `${self.id}:parley`,
            label: 'ability.bsr.riftSeeker',
            actions: 1,
            provokes: false,
            parley: true,
            target: { type: 'enemy', id: self.id },
            then: [
              ...doomOnEach(state),
              damage(investigator, 0, 2),
              { type: 'DiscardEnemy', enemy: self.id },
            ],
          },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// Traiciones
// ---------------------------------------------------------------------------

registerTreachery({
  code: CODES.crashingFloods,
  // [agility] (3). Si fallas: X daño y pierdes X acciones (X: paso del mazo "a").
  revelation: (state, investigator) => {
    const n = step(state, 'a')
    return [
      effectTest(investigator, 'Crashing Floods', 'agility', 3, {
        onFail: [damage(investigator, n), { type: 'LoseActions', investigator, amount: n }],
      }),
    ]
  },
})

registerTreachery({
  code: CODES.worldsMerge,
  // [willpower] (3). Si fallas: X horror y descartas X cartas (X: paso del mazo "c").
  revelation: (state, investigator) => {
    const n = step(state, 'c')
    return [
      effectTest(investigator, 'Worlds Merge', 'willpower', 3, {
        onFail: [
          damage(investigator, 0, n),
          specific('bsrDiscardCards', { investigator, amount: n }),
        ],
      }),
    ]
  },
})
