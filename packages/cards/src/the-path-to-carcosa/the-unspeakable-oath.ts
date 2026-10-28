/**
 * Escenario IV de El camino a Carcosa: "El juramento inconfesable" (03159–03188) e
 * Interludio II: Alma perdida. Guía de campaña revisada ES, pp. 13–16.
 *
 * Los códigos son los de la expansión. El texto de las cartas está en el catálogo
 * EN/ES; aquí solo su comportamiento.
 */
import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  leadInvestigator,
  nextInt,
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
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type LocationId,
  type Message,
  type ScenarioDefinition,
  type ScenarioOutcome,
  type SkillType,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import {
  copies,
  damage,
  earnExperience,
  effectTest,
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
import { CLASP_OF_BLACK_ONYX } from './echoes-assets'
import {
  beastOfAldebaran,
  byakheeStat,
  ENCOUNTER_SETS,
  encounterSpecific,
  hastursGiftFight,
  isLunatic,
  screechingByakhee,
  SETS,
  spawnOfHali,
} from './encounter-sets'
import { carcosaSpecific, hasNote, markCarcosa, replaceSymbolTokens } from './log'
import { COURAGE, COURAGE_CARD, DANIEL_ALLY } from './oath-assets'
import { VIPS } from './the-last-king'

export const THE_UNSPEAKABLE_OATH = 'the-unspeakable-oath'

export const CODES = {
  scenario: '03159',
  lockedInside: '03160',
  torturousDescent: '03161',
  hisDomain: '03162',
  arkhamAsylum: '03163',
  theReallyBadOnesV1: '03164',
  theReallyBadOnesV2: '03165',
  planningTheEscape: '03166',
  noAsylum: '03167',
  westernWingA: '03168',
  westernWingB: '03169',
  easternWingA: '03170',
  easternWingB: '03171',
  kitchen: '03172',
  messHall: '03173',
  infirmary: '03174',
  yard: '03175',
  garden: '03176',
  basementHall: '03177',
  danielsCell: '03178',
  occupiedCell: '03179',
  drearyCell: '03180',
  familiarCell: '03181',
  danielEnemy: '03182b',
  asylumGorger: '03183',
  madPatient: '03184',
  straitjacket: '03185',
  giftOfMadnessPity: '03186',
  giftOfMadnessMisery: '03187',
  wallsClosingIn: '03188',
} as const

const WESTERN: string[] = [CODES.westernWingA, CODES.westernWingB]
const EASTERN: string[] = [CODES.easternWingA, CODES.easternWingB]
const HALLS = [...WESTERN, ...EASTERN]
const CELLS: string[] = [
  CODES.danielsCell,
  CODES.occupiedCell,
  CODES.drearyCell,
  CODES.familiarCell,
]
/** Sin revelar no se puede entrar en ellos, salvo desde el acto 2. */
const LOCKED: string[] = [CODES.kitchen, CODES.garden, CODES.basementHall]

/** Lo que los investigadores "recuerdan" (objetivo del acto 3), como `scenarioMeta`. */
export const MEMORIES = [
  'knowTheGuardsPatrols',
  'setAFireInTheKitchen',
  'incitedAFightAmongstThePatients',
  'releasedADangerousPatient',
  'recalledTheWayOut',
  'distractedTheGuards',
] as const
export type Memory = (typeof MEMORIES)[number]
export const KEYS_BY_FORCE = 'tookTheKeysByForce'
const DANIEL_SURVIVED = 'carcosa:danielSurvived'

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

export const asylumGorger: EnemyCard = enemy({
  code: CODES.asylumGorger,
  name: 'Asylum Gorger',
  traits: ['Monster', 'Abomination'],
  fight: 4,
  health: 5,
  evade: 4,
  damage: 3,
  horror: 3,
  keywords: ['hunter'],
  noOpportunityAttacks: true,
})

export const madPatient: EnemyCard = enemy({
  code: CODES.madPatient,
  name: 'Mad Patient',
  traits: ['Humanoid', 'Lunatic'],
  prey: { type: 'mostRemainingSanity' },
  fight: 2,
  health: 2,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: [],
})

export const danielEnemy: EnemyCard = enemy({
  code: CODES.danielEnemy,
  name: 'Daniel Chesterfield',
  traits: ['Humanoid', 'Lunatic', 'Elite'],
  prey: { type: 'highestSkill', skill: 'combat' },
  fight: 3,
  health: 4,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: [],
  victory: 1,
})

const constance = VIPS.find((v) => v.key === 'Constance')!.enemy

/** Montón de Enemigos Monstruo apartados (7). */
const MONSTERS: EnemyCard[] = [
  ...copies(asylumGorger, 2),
  { ...beastOfAldebaran },
  ...copies(spawnOfHali, 2),
  ...copies(screechingByakhee, 2),
]
const MONSTER_CODES = new Set(MONSTERS.map((m) => m.code))
const LUNATIC_CODES = new Set<string>([SETS.maniac, SETS.youngPsychopath, CODES.madPatient])

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

const westernWing = (id: string, shroud: number, clues: number) =>
  location({
    id,
    name: 'Asylum Halls',
    symbol: 'circle',
    connectsTo: ['hourglass', 'triangle', 'diamond'],
    position: [2, 2],
    shroud,
    clues,
  })
const easternWing = (id: string, shroud: number, clues: number) =>
  location({
    id,
    name: 'Asylum Halls',
    symbol: 'hourglass',
    connectsTo: ['circle', 'heart', 'squiggle'],
    position: [3, 2],
    shroud,
    clues,
  })
const cell = (id: string, shroud: number) =>
  location({
    id,
    name: 'Patient Confinement',
    symbol: 'moon',
    connectsTo: ['squiggle'],
    shroud,
    clues: 1,
    fixed: true,
  })

/** Símbolos de las cartas y posiciones de la distribución sugerida (p. 14). */
export const locationCards: Record<string, LocationCard> = {
  [CODES.westernWingA]: westernWing(CODES.westernWingA, 2, 0),
  [CODES.westernWingB]: westernWing(CODES.westernWingB, 3, 1),
  [CODES.easternWingA]: easternWing(CODES.easternWingA, 3, 0),
  [CODES.easternWingB]: easternWing(CODES.easternWingB, 2, 1),
  [CODES.kitchen]: location({
    id: CODES.kitchen,
    name: 'Kitchen',
    symbol: 'square',
    connectsTo: ['triangle'],
    position: [0, 2],
    shroud: 2,
    clues: 1,
  }),
  [CODES.messHall]: location({
    id: CODES.messHall,
    name: 'Mess Hall',
    symbol: 'triangle',
    connectsTo: ['circle', 'square'],
    position: [1, 2],
    shroud: 2,
    clues: 2,
    victory: 1,
  }),
  [CODES.infirmary]: location({
    id: CODES.infirmary,
    name: 'Infirmary',
    symbol: 'heart',
    connectsTo: ['hourglass'],
    position: [4, 2],
    shroud: 3,
    clues: 1,
    victory: 1,
  }),
  [CODES.yard]: location({
    id: CODES.yard,
    name: 'Yard',
    symbol: 'diamond',
    connectsTo: ['circle', 'plus'],
    position: [2, 1],
    shroud: 1,
    clues: 1,
  }),
  [CODES.garden]: location({
    id: CODES.garden,
    name: 'Garden',
    symbol: 'plus',
    connectsTo: ['diamond'],
    position: [2, 0],
    shroud: 3,
    clues: 1,
  }),
  [CODES.basementHall]: location({
    id: CODES.basementHall,
    name: 'Basement Hall',
    symbol: 'squiggle',
    connectsTo: ['hourglass', 'moon'],
    position: [3, 3],
    shroud: 4,
    clues: 1,
    victory: 1,
  }),
  [CODES.danielsCell]: cell(CODES.danielsCell, 2),
  [CODES.occupiedCell]: cell(CODES.occupiedCell, 5),
  [CODES.drearyCell]: cell(CODES.drearyCell, 3),
  [CODES.familiarCell]: cell(CODES.familiarCell, 2),
}

/** Huecos de las 4 Celdas de pacientes alrededor del Pasillo del sótano. */
const CELL_SLOTS: [number, number][] = [
  [2, 3],
  [4, 3],
  [2.5, 4],
  [3.5, 4],
]

const card = (
  code: string,
  name: string,
  traits: string[],
  keywords: ('peril' | 'hidden')[] = [],
) => treachery({ code, name, traits, keywords })

/** Conjunto El juramento inconfesable: sus cartas de Encuentro (los Enemigos, aparte). */
const oathSet = [
  ...copies(card(CODES.straitjacket, 'Straitjacket', ['Item', 'Clothing']), 2),
  card(CODES.giftOfMadnessPity, 'Gift of Madness (Pity)', ['Terror'], ['peril', 'hidden']),
  card(CODES.giftOfMadnessMisery, 'Gift of Madness (Misery)', ['Terror'], ['peril', 'hidden']),
  ...copies(card(CODES.wallsClosingIn, 'Walls Closing In', ['Terror']), 3),
]

/** Fichas añadidas de forma permanente según la dificultad (p. 14). */
const ADDED_TOKEN = { easy: -2, standard: -3, hard: -4, expert: -5 } as const

/** Guía ES p. 14, "Preparación". */
export function theUnspeakableOath({
  difficulty,
  seed = 0,
  log,
}: Pick<ScenarioContext, 'difficulty'> & {
  seed?: number
  players?: number
  log?: ScenarioContext['log']
}): ScenarioDefinition {
  // Se retira al azar 1 copia de cada ala de los Pasillos del manicomio.
  const [west, afterWest] = shuffle([...WESTERN], seedRng(seed))
  const [east, afterEast] = shuffle([...EASTERN], afterWest)
  const [slots] = shuffle([...CELL_SLOTS], afterEast)
  const halls = [locationCards[west[0]!]!, locationCards[east[0]!]!]
  const fixed = [
    CODES.kitchen,
    CODES.messHall,
    CODES.infirmary,
    CODES.yard,
    CODES.garden,
    CODES.basementHall,
  ].map((code) => locationCards[code]!)
  const cells = CELLS.map((code, n) => ({ ...locationCards[code]!, position: slots[n]! }))
  const tookClasp = hasNote(log, 'carcosaTookTheOnyxClasp')
  const lunatics: EncounterCard[] = [
    ...ENCOUNTER_SETS.hastursGift.filter((c) => c.kind === 'enemy'),
    ...copies(madPatient, 3),
  ]
  const foundTheWay = hasNote(log, 'carcosaFollowersFoundTheWay')
  const constanceInfo = hasNote(log, 'carcosaInterviewedConstance')
  return {
    id: THE_UNSPEAKABLE_OATH,
    intro: [
      {
        title: 'story.oath.introTitle',
        body: foundTheWay ? 'story.oath.intro1' : 'story.oath.intro2',
      },
      { title: 'story.oath.introTitle', body: 'story.oath.intro3' },
      ...(constanceInfo
        ? [{ title: 'story.oath.constanceTitle', body: 'story.oath.constance' }]
        : []),
    ],
    setupInstructions: { title: 'story.oath.setupTitle', body: 'story.oath.setup' },
    locations: [...halls, ...fixed],
    setAsideLocations: cells,
    startingLocation: halls[0]!.id,
    startingLocationChoices: halls.map((l) => l.id),
    agendas: [
      { code: CODES.lockedInside, name: 'Locked Inside', doomThreshold: 2 },
      { code: CODES.torturousDescent, name: 'Torturous Descent', doomThreshold: 7 },
      { code: CODES.hisDomain, name: 'His Domain', doomThreshold: 8 },
    ],
    acts: [
      {
        code: CODES.arkhamAsylum,
        name: 'Arkham Asylum',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      tookClasp
        ? {
            code: CODES.theReallyBadOnesV1,
            name: '"The Really Bad Ones" (v. I)',
            clueThreshold: 0,
            cluesPerInvestigator: false,
            advanceTiming: 'objective',
          }
        : {
            code: CODES.theReallyBadOnesV2,
            name: '"The Really Bad Ones" (v. II)',
            clueThreshold: 0,
            cluesPerInvestigator: false,
            advanceTiming: 'objective',
          },
      {
        code: CODES.planningTheEscape,
        name: 'Planning the Escape',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: CODES.noAsylum,
        name: 'No Asylum',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...oathSet,
      ...ENCOUNTER_SETS.hastursGift.filter((c) => c.kind === 'treachery'),
      ...ENCOUNTER_SETS.delusions,
      ...ENCOUNTER_SETS.decayAndFilth,
      ...ENCOUNTER_SETS.agentsOfHastur.filter((c) => c.kind === 'treachery'),
    ],
    setAside: [
      ...MONSTERS.map((m) => ({ ...m })),
      ...lunatics.map((l) => ({ ...l })),
      { ...danielEnemy },
      { ...constance },
    ],
    chaosBag: [...CARCOSA_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      { type: 'AddChaosTokens', tokens: [ADDED_TOKEN[difficulty]] },
      // Información de Constance: la carta superior de cada mazo, como apoyo Coraje.
      ...(constanceInfo ? [specific('oathCourage')] : []),
    ],
  }
}

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

function specific(key: string, data: Record<string, string | number | boolean> = {}): Message {
  return { type: 'ScenarioSpecific', key, data }
}

const entry = storyEntries('oath')
const hard = (state: GameState) => state.difficulty === 'hard' || state.difficulty === 'expert'
const actCode = (state: GameState) => state.acts[state.actIndex]?.code
const agendaCode = (state: GameState) => state.agendas[state.agendaIndex]?.code

/** Del acto 2 en adelante se ignora el texto sin revelar de los Lugares del manicomio. */
const ignoreUnrevealed = (state: GameState) => state.actIndex > 0

export const remembered = (state: GameState, memory: Memory | typeof KEYS_BY_FORCE) =>
  state.scenarioMeta?.[memory] === 1

const remember = (memory: Memory): Message => ({ type: 'SetScenarioMeta', key: memory, value: 1 })

const monstersLeft = (state: GameState) =>
  state.setAside.filter((c) => MONSTER_CODES.has(c.code)).length

/** "Elige al azar un Enemigo Monstruo apartado y colócalo bajo el mazo de Acto." */
const monsterBeneathAct = (): Message => specific('oathMonster')

/** El jefe elige entre varias opciones; con una sola, se resuelve sin preguntar. */
function leadChooses(state: GameState, prompt: string, choices: Choice[]): Message[] {
  if (choices.length === 0) return []
  if (choices.length === 1) return choices[0]!.then
  const lead = leadInvestigator(state) ?? state.investigators[0]
  if (!lead) return []
  return [{ type: 'Ask', investigator: lead.id, question: { kind: 'chooseOne', prompt, choices } }]
}

const push = (state: GameState, ...messages: Message[]): GameState => ({
  ...state,
  queue: [...messages, ...state.queue],
})

/** Mueve al azar un Monstruo apartado bajo el acto (o al mazo, con Su dominio). */
function placeMonster(state: GameState, intoDeck: boolean): GameState {
  const pile = state.setAside.flatMap((c, n) => (MONSTER_CODES.has(c.code) ? [n] : []))
  if (!pile.length) return state
  const [pick, rng] = nextInt(state.rng, pile.length)
  const index = pile[pick]!
  const monster = state.setAside[index]!
  const setAside = state.setAside.filter((_, n) => n !== index)
  // Su dominio: en vez de colocarlo bajo el acto, se baraja en el mazo de Encuentros.
  if (intoDeck || agendaCode(state) === CODES.hisDomain) {
    const [encounterDeck, next] = shuffle([...state.encounterDeck, monster], rng)
    return { ...state, setAside, encounterDeck, rng: next }
  }
  return { ...state, setAside, rng, underAct: [...(state.underAct ?? []), monster.code] }
}

/** Baraja la pila de descartes de Encuentros y los enemigos bajo el acto en el mazo. */
function shuffleBeneathAct(state: GameState): GameState {
  const beneath = (state.underAct ?? []).flatMap((code) => {
    const found = MONSTERS.find((m) => m.code === code)
    return found ? [{ ...found }] : []
  })
  const [encounterDeck, rng] = shuffle(
    [...state.encounterDeck, ...state.encounterDiscard, ...beneath],
    state.rng,
  )
  return { ...state, encounterDeck, encounterDiscard: [], underAct: [], rng }
}

/** El Lugar de los Pasillos del manicomio más cercano (o todos, si no hay camino). */
function nearestHalls(state: GameState, investigator: InvestigatorId): LocationId[] {
  const halls = HALLS.filter((id) => state.locations[id])
  const here = getInvestigator(state, investigator).location
  if (here === null) return halls
  const distances = distancesFrom(state, here)
  const best = Math.min(...halls.map((id) => distances.get(id) ?? Infinity))
  return best === Infinity ? halls : halls.filter((id) => distances.get(id) === best)
}

const investigatorChoice = (i: { id: string; name: string }, then: Message[]): Choice => ({
  label: 'choice.investigator',
  params: { name: i.name },
  target: { type: 'investigator', id: i.id },
  then,
})

/** Reverso del acto 1: intimidarla, robarle las llaves, persuadirla o derribarla. */
function keysChoices(state: GameState, tried: SkillType[]): Message[] {
  const options: SkillType[] = (['combat', 'agility', 'intellect'] as SkillType[]).filter(
    (s) => !tried.includes(s),
  )
  const test = (skill: SkillType): Choice => ({
    label: `choice.oath.keys.${skill}`,
    then: leadChooses(
      state,
      'prompt.oath.keysTester',
      activeInvestigators(state).map((i) =>
        investigatorChoice(i, [
          effectTest(i.id, 'Key to the Basement', skill, 4, {
            onFail: [specific('oathKeys', { tried: [...tried, skill].join(',') })],
          }),
        ]),
      ),
    ),
  })
  return leadChooses(state, 'prompt.oath.keys', [
    ...options.map(test),
    {
      label: 'choice.oath.keys.force',
      then: [{ type: 'SetScenarioMeta', key: KEYS_BY_FORCE, value: 1 }],
    },
  ])
}

// ---------------------------------------------------------------------------
// Resoluciones (guía ES pp. 15–16) e Interludio II
// ---------------------------------------------------------------------------

const NEXT = 'story.carcosa.aPhantomOfTruth'

function resolutionMessages(state: GameState, outcome: ScenarioOutcome): Message[] {
  // Sin resolución: con alguno retirado por el Jardín, el acto 4 avanza (→R2/R3); si
  // todos fueron derrotados, R1.
  const escaped = remembered(state, KEYS_BY_FORCE) ? 2 : 3
  const number =
    outcome.type === 'resolution'
      ? outcome.resolution
      : state.investigators.some((i) => i.resigned)
        ? escaped
        : 1
  if (![1, 2, 3].includes(number)) throw new Error('Invalid The Unspeakable Oath resolution')
  const final = resolution(number)
  const defeated = state.investigators.some((i) => i.eliminated && !i.resigned)
  const slain = state.victoryDisplay.includes(constance.code)
  const steps: Record<number, { note: string; tokens: ('cultist' | 'tablet' | 'elderThing')[] }> = {
    1: { note: 'carcosaKingClaimedItsVictims', tokens: ['cultist', 'cultist'] },
    2: { note: 'carcosaAttackedEscapingTheAsylum', tokens: ['tablet', 'tablet'] },
    3: { note: 'carcosaEscapedTheAsylum', tokens: ['elderThing', 'elderThing'] },
  }
  const { note, tokens } = steps[number]!
  return [
    // Antes de cualquier resolución: los investigadores derrotados quedan enloquecidos.
    ...(defeated
      ? [
          {
            type: 'Story',
            entry: entry('defeated', [{ key: 'story.oath.drivenInsane' }]),
          } as Message,
          { type: 'DriveDefeatedInsane' } as Message,
        ]
      : []),
    {
      type: 'Story',
      entry: entry(`resolution${number}`, [
        noteEffect(note),
        ...(number === 1 ? [{ key: 'story.oath.newClaspBearer' }] : []),
        ...(number === 2 ? [{ key: 'story.oath.physicalTrauma' }] : []),
        ...(slain ? [noteEffect('carcosaSlainConstance')] : []),
        { key: 'story.effect.experience', params: { bonus: 0 } },
        { key: `story.oath.tokens${number}` },
        number === 1
          ? { key: 'story.effect.proceed', params: { scenario: NEXT } }
          : { key: 'story.oath.toInterlude' },
      ]),
    },
    recordNote(note),
    ...(number === 2 ? [{ type: 'SufferTrauma', physical: 1 } as Message] : []),
    ...(slain ? [recordNote('carcosaSlainConstance')] : []),
    earnExperience(0, true),
    replaceSymbolTokens(...tokens),
    ...(number === 1 ? [endScenario(final)] : interlude(state, final)),
  ]
}

/** Interludio II: Alma perdida (guía ES p. 16). */
function interlude(state: GameState, final: ScenarioOutcome): Message[] {
  const survived = state.scenarioMeta?.[DANIEL_SURVIVED] === 1
  const possessed = Object.values(state.enemies).some((e) => e.code === CODES.danielEnemy)
  const daniel = survived ? 'danielSurvived' : possessed ? 'danielWasPossessed' : 'danielDied'
  const warning = (heed: boolean): Choice => {
    const note = heed ? 'carcosaHeededDanielsWarning' : 'carcosaIgnoredDanielsWarning'
    return {
      label: heed ? 'story.oath.heedChoice' : 'story.oath.ignoreChoice',
      then: [
        {
          type: 'Story',
          entry: entry(heed ? 'heedTheWarning' : 'ignoreTheWarning', [
            noteEffect(note),
            { key: heed ? 'story.oath.markConvictions' : 'story.oath.markDoubts' },
            ...(heed
              ? [
                  { key: 'story.effect.experience', params: { bonus: 1 } },
                  { key: 'story.oath.hasturRule' },
                ]
              : []),
            { key: 'story.effect.proceed', params: { scenario: NEXT } },
          ]),
        },
        recordNote(note),
        markCarcosa(heed ? 'conviction' : 'doubt', 2),
        ...(heed ? [{ type: 'EarnExperience', amount: 1 } as Message] : []),
        endScenario(final),
      ],
    }
  }
  return [
    {
      type: 'Story',
      entry: entry(daniel, survived ? [{ key: 'story.oath.danielXp' }] : []),
    },
    ...(survived ? [{ type: 'EarnExperience', amount: 2 } as Message] : []),
    { type: 'Story', entry: entry('lostSoul'), choices: [warning(false), warning(true)] },
  ]
}

// ---------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------

registerScenario({
  id: THE_UNSPEAKABLE_OATH,
  resolution: resolutionMessages,
  tokenEffect: (state, token, investigator) => {
    const me = getInvestigator(state, investigator)
    switch (token) {
      case 'skull':
        if (!hard(state)) return { modifier: -1, onFail: [monsterBeneathAct()] }
        // Revela otra ficha; si fallas, un Monstruo bajo el acto (límite una vez por prueba).
        return state.skillTest?.tokens.includes('skull')
          ? { modifier: 0 }
          : { modifier: 0, revealAnother: true, onFail: [monsterBeneathAct()] }
      case 'cultist':
        return { modifier: -me.horror, ...(hard(state) ? { onFail: [damage(me.id, 0, 1)] } : {}) }
      case 'tablet': {
        const base = me.location === null ? 0 : (state.locations[me.location]?.shroud ?? 0)
        return { modifier: -base, ...(hard(state) ? { onFail: [damage(me.id, 0, 1)] } : {}) }
      }
      case 'elderThing':
        // Un Monstruo apartado bajo el acto o la prueba fracasa automáticamente.
        if (monstersLeft(state) === 0) return { modifier: 0, autoFail: true }
        return {
          modifier: 0,
          immediate: [
            {
              type: 'Ask',
              investigator,
              question: {
                kind: 'chooseOne',
                prompt: 'prompt.chooseEffect',
                choices: [
                  { label: 'choice.oath.monsterBeneathAct', then: [monsterBeneathAct()] },
                  { label: 'choice.oath.autoFail', then: [{ type: 'ForceSkillTestFailure' }] },
                ],
              },
            },
          ],
        }
    }
    return { modifier: 0 }
  },
  enemyStat: (state, e, stat) =>
    hastursGiftFight(state, e, stat) +
    byakheeStat(state, e) +
    // Constance Dumaine: +3 de combate mientras está agotada.
    (stat === 'fight' && e.code === constance.code && e.exhausted ? 3 : 0),
  // Pasillos (ala oeste, 03169): los Lunáticos de aquí tienen +1 de horror.
  enemyHorrorModifier: (_state, e) => (e.location === CODES.westernWingB && isLunatic(e) ? 1 : 0),
  // Patio: al investigarlo, +1 velo por cada horror que tengas.
  skillModifier: (state, test) =>
    test.kind.type === 'investigate' && test.kind.location === CODES.yard
      ? -getInvestigator(state, test.investigator).horror
      : 0,
  // Cocina, Jardín y Pasillo del sótano, sin revelar: no se puede entrar (acto 1).
  // Celdas sin revelar: entrar cuesta 1 pista.
  canEnter: (state, investigator, _from, to) => {
    const target = state.locations[to]
    if (!target || target.revealed) return true
    if (LOCKED.includes(to)) return ignoreUnrevealed(state)
    if (CELLS.includes(to)) return getInvestigator(state, investigator).clues >= 1
    return true
  },
  beforeMove: (state, move) => {
    const target = state.locations[move.location]
    if (!target || target.revealed || !CELLS.includes(move.location)) return null
    return [
      { ...move, checked: true },
      { type: 'SpendClues', investigator: move.investigator, amount: 1 },
    ]
  },
  assetLeavesPlay: (state, asset, reason) => {
    // Daniel Chesterfield: si abandona el juego, se retira de la partida. Retirarse con él
    // es sacarlo del manicomio.
    if (asset.code === DANIEL_ALLY)
      return [
        ...(reason === 'resigned'
          ? [{ type: 'SetScenarioMeta', key: DANIEL_SURVIVED, value: 1 } as Message]
          : []),
        { type: 'RemoveAssetFromGame', asset: asset.id },
      ]
    // Coraje: la carta boca abajo se descarta si abandona el juego.
    if (asset.code === COURAGE && reason === 'discard')
      return [
        { type: 'RemoveAssetFromGame', asset: asset.id },
        specific('oathCourageDiscard', { investigator: asset.originalOwner ?? asset.owner }),
      ]
    return null
  },
  forced: (state, trigger) => {
    // Daniel Chesterfield: cuando recibes horror que no se le asigna a él, 1 daño.
    if (
      trigger.type === 'afterDamageAssigned' &&
      (trigger.assignmentAssets ?? Object.values(state.assets)).some(
        (a) =>
          a.code === DANIEL_ALLY &&
          a.owner === trigger.investigator &&
          trigger.dealt.some((d) => d.horror > 0 && d.asset !== a.id),
      )
    )
      return [damage(trigger.investigator, 1)]
    // Pasillos (ala este, 03171): tras terminar tu turno aquí, 1 horror y 2 recursos.
    if (
      trigger.type === 'turnEnds' &&
      getInvestigator(state, trigger.investigator).location === CODES.easternWingB
    )
      return [
        damage(trigger.investigator, 0, 1),
        { type: 'GainResources', investigator: trigger.investigator, amount: 2 },
      ]
    // Comedor: tras investigarlo con éxito, eliges y descartas 1 carta de tu mano.
    if (
      trigger.type === 'skillTestEnded' &&
      trigger.kind === 'investigate' &&
      trigger.succeeded &&
      trigger.location === CODES.messHall
    )
      return [{ type: 'ChooseDiscardFromHand', investigator: trigger.investigator, amount: 1 }]
    return []
  },
  reactions: (state, trigger) => {
    // Pasillos (ala oeste, 03168): tras derrotar a un Lunático aquí, roba 1 carta.
    if (
      trigger.type !== 'enemyDefeated' ||
      !trigger.by ||
      trigger.enemy.location !== CODES.westernWingA ||
      !isLunatic(trigger.enemy) ||
      getInvestigator(state, trigger.by).location !== CODES.westernWingA
    )
      return []
    return [
      {
        key: `${CODES.westernWingA}:draw`,
        investigator: trigger.by,
        label: 'ability.oath.westernDraw',
        then: [{ type: 'DrawCards', investigator: trigger.by, amount: 1 }],
      },
    ]
  },
  specific: (state, key, data) => {
    const common = carcosaSpecific(state, key, data) ?? encounterSpecific(state, key, data)
    if (common) return common
    const investigator = typeof data.investigator === 'string' ? data.investigator : null
    switch (key) {
      case 'oathMonster':
        return placeMonster(state, data.intoDeck === true)
      case 'oathShuffleBeneathAct':
        return shuffleBeneathAct(state)
      case 'oathKeys':
        return push(
          state,
          ...keysChoices(
            state,
            String(data.tried ?? '')
              .split(',')
              .filter(Boolean) as SkillType[],
          ),
        )
      case 'oathPatients': {
        // Reverso del plan 1: descartes y Lunáticos apartados, barajados en el mazo.
        const lunatics = state.setAside.filter((c) => LUNATIC_CODES.has(c.code))
        const [encounterDeck, rng] = shuffle(
          [...state.encounterDeck, ...state.encounterDiscard, ...lunatics],
          state.rng,
        )
        return {
          ...state,
          rng,
          encounterDeck,
          encounterDiscard: [],
          setAside: state.setAside.filter((c) => !LUNATIC_CODES.has(c.code)),
        }
      }
      case 'oathWayOut': {
        // Reverso del acto 3: con al menos 3 Monstruos barajados, el de menos [willpower]
        // descarta cartas del mazo hasta un Monstruo y lo roba.
        const monsters = (state.underAct ?? []).filter((c) => MONSTER_CODES.has(c)).length
        const next = shuffleBeneathAct(state)
        if (monsters < 3) return next
        const active = activeInvestigators(next)
        const lowest = Math.min(...active.map((i) => i.skills.willpower))
        const who = active.filter((i) => i.skills.willpower === lowest)
        return push(
          next,
          ...leadChooses(
            next,
            'prompt.oath.wayOut',
            who.map((i) =>
              investigatorChoice(i, [specific('oathDrawMonster', { investigator: i.id })]),
            ),
          ),
        )
      }
      case 'oathDrawMonster': {
        if (investigator === null) return state
        const index = state.encounterDeck.findIndex(
          (c) => c.kind === 'enemy' && (c.traits ?? []).includes('Monster'),
        )
        if (index < 0)
          return {
            ...state,
            encounterDeck: [],
            encounterDiscard: [...state.encounterDiscard, ...state.encounterDeck],
          }
        return push(
          {
            ...state,
            encounterDeck: state.encounterDeck.slice(index + 1),
            encounterDiscard: [...state.encounterDiscard, ...state.encounterDeck.slice(0, index)],
          },
          { type: 'ResolveEncounterCard', investigator, card: state.encounterDeck[index]! },
        )
      }
      case 'oathDaniel':
        // Reverso del acto 2 (v. I): un investigador en la Celda de Daniel toma su control.
        return push(
          state,
          ...leadChooses(
            state,
            'prompt.oath.daniel',
            activeInvestigators(state)
              .filter((i) => i.location === CODES.danielsCell)
              .map((i) =>
                investigatorChoice(i, [
                  { type: 'PutAssetIntoPlay', investigator: i.id, code: DANIEL_ALLY },
                ]),
              ),
          ),
        )
      case 'oathGiveDaniel': {
        const asset = state.assets[String(data.asset)]
        if (!asset || investigator === null) return state
        return {
          ...state,
          assets: { ...state.assets, [asset.id]: { ...asset, owner: investigator } },
        }
      }
      case 'oathCourage': {
        // Información de Constance: la carta superior del mazo pasa a ser un apoyo Coraje.
        let next = state
        const play: Message[] = []
        for (const i of state.investigators) {
          const [top, ...deck] = i.deck
          if (!top) continue
          next = {
            ...next,
            investigators: next.investigators.map((x) => (x.id === i.id ? { ...x, deck } : x)),
            scenarioMeta: { ...next.scenarioMeta, [`${COURAGE_CARD}${i.id}`]: top },
          }
          play.push({ type: 'PutAssetIntoPlay', investigator: i.id, code: COURAGE, noSlot: true })
        }
        return push(next, ...play)
      }
      case 'oathCourageDiscard': {
        if (investigator === null) return state
        const code = state.scenarioMeta?.[`${COURAGE_CARD}${investigator}`]
        if (typeof code !== 'string') return state
        const { [`${COURAGE_CARD}${investigator}`]: _gone, ...meta } = state.scenarioMeta ?? {}
        return {
          ...state,
          scenarioMeta: meta,
          investigators: state.investigators.map((i) =>
            i.id === investigator && !i.eliminated ? { ...i, discard: [...i.discard, code] } : i,
          ),
        }
      }
      case 'oathWalls': {
        // Las paredes se cierran: 1 horror por punto de fallo o un Monstruo bajo el acto.
        const test = state.skillTest
        if (investigator === null || !test) return state
        const failBy = Math.max(1, test.difficulty - (test.modifiedSkill ?? 0))
        const horror = damage(investigator, 0, failBy)
        if (monstersLeft(state) === 0) return push(state, horror)
        return push(state, {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEffect',
            choices: [
              { label: 'choice.oath.wallsHorror', params: { n: failBy }, then: [horror] },
              { label: 'choice.oath.monsterBeneathAct', then: [monsterBeneathAct()] },
            ],
          },
        })
      }
      case 'oathStraitjacket': {
        // Camisa de fuerza: los apoyos de sus ranuras de cuerpo y mano vuelven a la mano.
        if (investigator === null) return state
        const returned = Object.values(state.assets).filter((a) => {
          if (a.owner !== investigator) return false
          const slots = playerCardDef(a.code)?.slots ?? []
          return slots.includes('body') || slots.includes('hand')
        })
        return push(
          state,
          ...returned.map((a): Message => ({ type: 'ReturnAssetToHand', asset: a.id })),
        )
      }
    }
    return state
  },
})

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

registerAgenda({
  code: CODES.lockedInside,
  // Reverso "Los pacientes": Lunáticos al mazo y un Monstruo bajo el acto.
  onAdvance: () => [specific('oathPatients'), monsterBeneathAct()],
})

registerAgenda({
  code: CODES.torturousDescent,
  // Reverso "El Signo Amarillo": un Monstruo al azar al mazo; Constance Dumaine aparece en
  // el Jardín si no murió.
  onAdvance: (state) => [
    specific('oathMonster', { intoDeck: true }),
    ...(hasNote(state.campaignLog, 'carcosaSlainConstance')
      ? []
      : [{ type: 'SpawnSetAsideEnemy', code: constance.code, location: CODES.garden } as Message]),
  ],
})

registerAgenda({
  code: CODES.hisDomain,
  // Reverso "Máscaras, máscaras, máscaras": quien no se haya retirado es derrotado.
  onAdvance: (state) =>
    activeInvestigators(state).map((i): Message => ({
      type: 'DefeatInvestigator',
      investigator: i.id,
    })),
})

// ---------------------------------------------------------------------------
// Actos
// ---------------------------------------------------------------------------

registerAct({
  code: CODES.arkhamAsylum,
  // Reverso "La llave del sótano".
  onAdvance: (state) => keysChoices(state, []),
})

registerAct({
  code: CODES.theReallyBadOnesV1,
  objectiveMet: () => false,
  onAdvance: () => [specific('oathDaniel'), specific('oathShuffleBeneathAct')],
})

registerAct({
  code: CODES.theReallyBadOnesV2,
  objectiveMet: () => false,
  onAdvance: () => [
    { type: 'SpawnSetAsideEnemy', code: CODES.danielEnemy, location: CODES.danielsCell },
  ],
})

registerAct({
  code: CODES.planningTheEscape,
  objectiveMet: (state) => MEMORIES.filter((m) => remembered(state, m)).length >= 4,
  onAdvance: () => [specific('oathWayOut')],
})

registerAct({
  code: CODES.noAsylum,
  // Se avanza al terminar la partida con todos los no derrotados retirados (resolución).
  objectiveMet: () => false,
  onAdvance: (state) => [
    { type: 'EndScenario', outcome: resolution(remembered(state, KEYS_BY_FORCE) ? 2 : 3) },
  ],
})

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

const noClues = (state: GameState, id: LocationId) => (state.locations[id]?.clues ?? 0) === 0

/** "[action] (Si no hay pistas aquí): prueba; si tienes éxito, recuerdas…". */
function memoryAbility(
  state: GameState,
  id: LocationId,
  investigator: InvestigatorId,
  memory: Memory,
  skill: SkillType,
  difficulty: number,
  requireNoClues: boolean,
): AbilityOption[] {
  if (remembered(state, memory) || (requireNoClues && !noClues(state, id))) return []
  return [
    {
      key: `${id}:${memory}`,
      label: `ability.oath.${memory}`,
      params: { skill, difficulty },
      actions: 1,
      provokes: true,
      then: [
        effectTest(investigator, locationCards[id]?.name ?? id, skill, difficulty, {
          onSuccess: [remember(memory)],
        }),
      ],
    },
  ]
}

registerLocation({
  code: CODES.kitchen,
  abilities: (state, self, investigator) =>
    memoryAbility(state, self.id, investigator, 'setAFireInTheKitchen', 'willpower', 2, true),
})

registerLocation({
  code: CODES.garden,
  abilities: (state, self, investigator) => [
    ...memoryAbility(state, self.id, investigator, 'distractedTheGuards', 'agility', 2, true),
    // Sin salvación: "[action] Si no hay ningún enemigo preparado en el Jardín: Retirarse."
    ...(actCode(state) === CODES.noAsylum &&
    !Object.values(state.enemies).some((e) => e.location === self.id && !e.exhausted)
      ? [resignAbility(investigator, `${self.id}:resign`)]
      : []),
  ],
})

registerLocation({
  code: CODES.occupiedCell,
  abilities: (state, self, investigator) =>
    memoryAbility(state, self.id, investigator, 'releasedADangerousPatient', 'combat', 2, false),
})

registerLocation({
  code: CODES.drearyCell,
  abilities: (state, self, investigator) =>
    memoryAbility(state, self.id, investigator, 'knowTheGuardsPatrols', 'intellect', 2, false),
})

registerLocation({
  code: CODES.familiarCell,
  abilities: (state, self, investigator) =>
    memoryAbility(
      state,
      self.id,
      investigator,
      'recalledTheWayOut',
      'willpower',
      getInvestigator(state, investigator).horror,
      false,
    ),
})

registerLocation({
  code: CODES.yard,
  // [action] Si no hay pistas en el Patio, recibe 1 daño: recuerdas que incitasteis una pelea.
  abilities: (state, self, investigator) =>
    remembered(state, 'incitedAFightAmongstThePatients') || !noClues(state, self.id)
      ? []
      : [
          {
            key: `${self.id}:fight`,
            label: 'ability.oath.incitedAFightAmongstThePatients',
            actions: 1,
            provokes: true,
            costs: [damage(investigator, 1)],
            then: [remember('incitedAFightAmongstThePatients')],
          },
        ],
})

registerLocation({
  code: CODES.infirmary,
  // [action]: cura 1 daño y recibe 1 horror directo, o al revés (límite una vez por ronda).
  abilities: (_state, self, investigator) =>
    (
      [
        ['healDamage', { damage: 1, horror: 0 }, { damage: 0, horror: 1 }],
        ['healHorror', { damage: 0, horror: 1 }, { damage: 1, horror: 0 }],
      ] as const
    ).map(([label, heal, take]): AbilityOption => ({
      key: `${self.id}:heal`,
      label: `ability.oath.${label}`,
      actions: 1,
      provokes: true,
      limit: { per: 'round' },
      then: [
        { type: 'Heal', investigator, ...heal },
        { type: 'TakeDamage', investigator, ...take, direct: true },
      ],
    })),
})

registerLocation({
  code: CODES.easternWingA,
  // [action] Recibe 1 horror: evitas automáticamente a un Lunático de aquí.
  abilities: (state, self, investigator) =>
    Object.values(state.enemies)
      .filter((e) => e.location === self.id && isLunatic(e))
      .map((e): AbilityOption => ({
        key: `${self.id}:evade`,
        label: 'ability.oath.autoEvade',
        params: { enemy: e.name },
        actions: 1,
        provokes: false,
        target: { type: 'enemy', id: e.id },
        costs: [damage(investigator, 0, 1)],
        then: [{ type: 'EvadeEnemy', enemy: e.id, by: investigator }],
      })),
})

registerLocation({
  code: CODES.basementHall,
  // Forzado: tras revelarse, pone en juego las 4 Celdas de pacientes apartadas.
  onReveal: () => CELLS.map((id): Message => ({ type: 'PutLocationIntoPlay', location: id })),
})

registerLocation({
  code: CODES.danielsCell,
  // Forzado: tras revelarse, avanza al reverso del acto 2.
  onReveal: (state) =>
    actCode(state) === CODES.theReallyBadOnesV1 || actCode(state) === CODES.theReallyBadOnesV2
      ? [{ type: 'AdvanceAct', paid: true }]
      : [],
})

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.asylumGorger,
  // Aparición: Pasillo del sótano. No ataca en la fase en que se movió por Cazador.
  spawn: (state) => (state.locations[CODES.basementHall] ? [CODES.basementHall] : []),
  noAttackAfterHunting: true,
})

registerEnemy({
  code: CODES.madPatient,
  // Aparición: los Pasillos del manicomio más cercanos.
  spawn: nearestHalls,
  // Forzado: cuando lo atacas, recibes 1 horror.
  forced: (state, trigger, self) =>
    trigger.type === 'afterSkillTestInitiated' &&
    state.skillTest?.kind.type === 'fight' &&
    state.skillTest.kind.enemy === self.id
      ? [damage(trigger.investigator, 0, 1)]
      : [],
})

registerEnemy({
  code: CODES.danielEnemy,
  // [action] Si controlas el Broche de ónice negro: Negociar. Va a la zona de victoria.
  abilities: (state, self, investigator) =>
    Object.values(state.assets).some(
      (a) => a.code === CLASP_OF_BLACK_ONYX && a.owner === investigator,
    ) && getInvestigator(state, investigator).location === self.location
      ? [
          {
            key: `${self.id}:clasp`,
            label: 'ability.oath.showClasp',
            actions: 1,
            provokes: true,
            parley: true,
            target: { type: 'enemy', id: self.id },
            then: [{ type: 'EnemyToVictory', enemy: self.id }],
          },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// Traiciones de El juramento inconfesable
// ---------------------------------------------------------------------------

registerTreachery({
  code: CODES.straitjacket,
  // Si no tienes otra en tu zona de amenaza, entra como un apoyo que ocupa 1 ranura de
  // cuerpo y 2 de mano; los apoyos de esas ranuras vuelven a tu mano.
  occupiesSlots: { body: 1, hand: 2 },
  revelation: (state, investigator, self) =>
    Object.values(state.treacheries).some(
      (t) =>
        t.id !== self.id &&
        t.code === CODES.straitjacket &&
        t.placement.type === 'threatArea' &&
        t.placement.investigator === investigator,
    )
      ? []
      : [
          specific('oathStraitjacket', { investigator }),
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'threatArea', investigator },
          },
        ],
  // [action] [action]: descarta la Camisa de fuerza.
  abilities: (_state, self, investigator) =>
    self.placement.type === 'threatArea' && self.placement.investigator === investigator
      ? [
          {
            key: `${self.id}:discard`,
            label: 'ability.discardHidden',
            params: { card: self.name },
            actions: 2,
            provokes: true,
            then: [{ type: 'DiscardTreachery', treachery: self.id, own: true }],
          },
        ]
      : [],
})

for (const [code, restricts] of [
  [CODES.giftOfMadnessPity, { attackTrait: 'Lunatic' }],
  [CODES.giftOfMadnessMisery, { locationActionAbilities: true }],
] as const)
  registerTreachery({
    code,
    restricts,
    // Oculto: en secreto a tu mano.
    revelation: (_state, investigator, self) => [
      {
        type: 'PlaceTreachery',
        treachery: self.id,
        placement: { type: 'threatArea', investigator },
        hidden: true,
      },
    ],
    // [action]: un Monstruo apartado bajo el acto; se descarta de tu mano.
    abilities: (_state, self, investigator) =>
      self.placement.type === 'threatArea' && self.placement.investigator === investigator
        ? [
            {
              key: `${self.id}:discard`,
              label: 'ability.oath.giftOfMadness',
              params: { card: self.name },
              actions: 1,
              provokes: true,
              then: [
                monsterBeneathAct(),
                { type: 'DiscardTreachery', treachery: self.id, own: true },
              ],
            },
          ]
        : [],
  })

registerTreachery({
  code: CODES.wallsClosingIn,
  // [willpower] (X = velo de tu Lugar): si fallas, horror por cada punto o un Monstruo bajo
  // el acto.
  revelation: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return [
      effectTest(
        investigator,
        'Walls Closing In',
        'willpower',
        here === null ? 0 : shroudOf(state, here),
        { onFail: [specific('oathWalls', { investigator })] },
      ),
    ]
  },
})
