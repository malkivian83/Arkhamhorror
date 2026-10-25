/**
 * Escenario V de El camino a Carcosa: "El Fantasma de la Verdad" (03200–03227).
 * Guía de campaña revisada ES, pp. 17–21.
 *
 * Los códigos son los de la expansión. El texto de las cartas está en el catálogo
 * EN/ES; aquí solo su comportamiento.
 */
import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerPlayerCards,
  registerScenario,
  registerTreachery,
  seedRng,
  shuffle,
  totalDoom,
  type AbilityOption,
  type CampaignLog,
  type Choice,
  type EncounterCard,
  type Enemy,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type LocationId,
  type Message,
  type ScenarioDefinition,
  type ScenarioOutcome,
  type StoryEntry,
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
  resolution,
  storyEntries,
  treachery,
} from '../scenario-helpers'
import { CARCOSA_CHAOS_BAGS } from './campaign'
import { byakheeStat, ENCOUNTER_SETS, encounterSpecific, SETS } from './encounter-sets'
import {
  carcosaBelief,
  carcosaCount,
  carcosaSpecific,
  hasNote,
  markCarcosa,
  replaceSymbolTokens,
} from './log'
import { VIPS } from './the-last-king'

export const A_PHANTOM_OF_TRUTH = 'a-phantom-of-truth'

export const CODES = {
  scenario: '03200',
  theFirstNight: '03201',
  theSecondNight: '03202',
  theThirdNight: '03203',
  conspiracyV1: '03204',
  conspiracyV2: '03205',
  pursuingShadows: '03206',
  stalkedByShadows: '03207',
  montparnasse: '03208',
  montmartreA: '03209',
  montmartreB: '03210',
  grandGuignol: '03211',
  operaGarnierA: '03212',
  operaGarnierB: '03213',
  gareDOrsay: '03214',
  pereLachaise: '03215',
  canalSaintMartin: '03216',
  leMaraisA: '03217',
  leMaraisB: '03218',
  notreDame: '03219',
  gardensOfLuxembourg: '03220',
  /** El organista: Lo desafié sin esperanza (convicción) y Envuelto en misterio (duda). */
  organistHopeless: '03221a',
  organistDraped: '03221b',
  stealthyByakhee: '03222',
  twinSuns: '03223',
  deadlyFate: '03224',
  torturousChords: '03225',
  frozenInFear: '03226',
  lostSoul: '03227',
} as const

/** Paranoia (Básica 97), en su reimpresión de la caja básica de 2026. */
export const PARANOIA = '12101'
const ORGANISTS: string[] = [CODES.organistHopeless, CODES.organistDraped]
const RAIL: string[] = [
  CODES.montparnasse,
  CODES.montmartreA,
  CODES.montmartreB,
  CODES.operaGarnierA,
  CODES.operaGarnierB,
  CODES.gareDOrsay,
  CODES.leMaraisA,
  CODES.leMaraisB,
  CODES.notreDame,
]
const AGENDAS: string[] = [CODES.theFirstNight, CODES.theSecondNight, CODES.theThirdNight]
const STUCK = 'carcosa:stuck:'
const BY_DOOM = 'carcosa:actByDoom'
const ORGANIST_CLUES = 'carcosa:organistClues'
const REHUNT = 'carcosa:organistRehunt'

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

const organist = (code: string, name: string, stats: Partial<EnemyCard>): EnemyCard =>
  enemy({
    code,
    name,
    traits: ['Humanoid', 'Avatar', 'Elite'],
    fight: 0,
    health: 0,
    evade: 0,
    damage: 0,
    horror: 0,
    keywords: [],
    ...stats,
  })

export const organistHopeless = organist(CODES.organistHopeless, 'The Organist', {
  fight: 5,
  evade: 3,
  horror: 3,
  keywords: ['hunter'],
})
export const organistDraped = organist(CODES.organistDraped, 'The Organist', {
  fight: 3,
  evade: 5,
  horror: 1,
  keywords: ['aloof'],
})

export const stealthyByakhee: EnemyCard = enemy({
  code: CODES.stealthyByakhee,
  name: 'Stealthy Byakhee',
  traits: ['Monster', 'Byakhee'],
  fight: 5,
  health: 2,
  evade: 3,
  damage: 2,
  horror: 1,
  keywords: ['hunter'],
})

const jordan = VIPS.find((v) => v.key === 'Jordan')!.enemy

registerPlayerCards([
  {
    code: CODES.lostSoul,
    name: 'Lost Soul',
    type: 'treachery',
    class: 'neutral',
    traits: ['Madness', 'Pact'],
    story: true,
    weakness: 'Lost Soul',
  },
])

type Place = Omit<LocationCard, 'connections' | 'clueValue' | 'cluesPerInvestigator'> & {
  clues?: number
}
const location = ({ clues = 1, ...card }: Place): LocationCard => ({
  ...card,
  clueValue: clues,
  cluesPerInvestigator: true,
  connections: [],
})
const montmartre = (id: string, shroud: number) =>
  location({
    id,
    name: 'Montmartre',
    symbol: 'square',
    connectsTo: ['diamond', 'triangle', 'equals', 'moon'],
    position: [1, 0.5],
    shroud,
  })
const opera = (id: string, shroud: number) =>
  location({
    id,
    name: 'Opéra Garnier',
    symbol: 'diamond',
    connectsTo: ['triangle', 'square', 'heart'],
    position: [0, 1],
    shroud,
  })
const marais = (id: string, shroud: number) =>
  location({
    id,
    name: 'Le Marais',
    symbol: 'moon',
    connectsTo: ['square', 'equals', 't', 'plus'],
    position: [2, 1],
    shroud,
  })

/** Símbolos de las cartas y posiciones de la distribución sugerida (p. 19). */
export const locationCards: Record<string, LocationCard> = {
  [CODES.montparnasse]: location({
    id: CODES.montparnasse,
    name: 'Montparnasse',
    symbol: 'circle',
    connectsTo: ['heart', 'star', 'plus'],
    position: [1, 3],
    shroud: 2,
  }),
  [CODES.montmartreA]: montmartre(CODES.montmartreA, 3),
  [CODES.montmartreB]: montmartre(CODES.montmartreB, 2),
  [CODES.grandGuignol]: location({
    id: CODES.grandGuignol,
    name: 'Grand Guignol',
    symbol: 'triangle',
    connectsTo: ['diamond', 'square'],
    position: [0, 0],
    shroud: 3,
    victory: 1,
  }),
  [CODES.operaGarnierA]: opera(CODES.operaGarnierA, 5),
  [CODES.operaGarnierB]: opera(CODES.operaGarnierB, 6),
  [CODES.gareDOrsay]: location({
    id: CODES.gareDOrsay,
    name: "Gare d'Orsay",
    symbol: 'heart',
    connectsTo: ['diamond', 'circle', 'star'],
    position: [0, 2],
    shroud: 4,
  }),
  [CODES.pereLachaise]: location({
    id: CODES.pereLachaise,
    name: 'Père Lachaise Cemetery',
    symbol: 't',
    connectsTo: ['equals', 'moon'],
    position: [3, 0.5],
    shroud: 1,
    clues: 2,
    victory: 1,
  }),
  [CODES.canalSaintMartin]: location({
    id: CODES.canalSaintMartin,
    name: 'Canal Saint-Martin',
    symbol: 'equals',
    connectsTo: ['square', 't', 'moon'],
    position: [2, 0],
    shroud: 4,
    victory: 1,
  }),
  [CODES.leMaraisA]: marais(CODES.leMaraisA, 3),
  [CODES.leMaraisB]: marais(CODES.leMaraisB, 1),
  [CODES.notreDame]: location({
    id: CODES.notreDame,
    name: 'Notre-Dame',
    symbol: 'plus',
    connectsTo: ['circle', 'moon', 'star'],
    position: [2, 2],
    shroud: 3,
  }),
  [CODES.gardensOfLuxembourg]: location({
    id: CODES.gardensOfLuxembourg,
    name: 'Gardens of Luxembourg',
    symbol: 'star',
    connectsTo: ['circle', 'heart', 'plus'],
    position: [1, 2],
    shroud: 3,
    victory: 1,
  }),
}

const card = (code: string, name: string, traits: string[]) =>
  treachery({ code, name, traits, keywords: [] })

/** Conjunto El Fantasma de la Verdad: sus cartas de Encuentro (sin El organista). */
const phantomSet: EncounterCard[] = [
  ...copies(stealthyByakhee, 2),
  ...copies(card(CODES.twinSuns, 'Twin Suns', ['Omen']), 2),
  ...copies(card(CODES.deadlyFate, 'Deadly Fate', ['Omen']), 3),
  ...copies(card(CODES.torturousChords, 'Torturous Chords', ['Hex', 'Terror']), 3),
  ...copies(card(CODES.frozenInFear, 'Frozen in Fear', ['Terror']), 2),
]

/** Más Convicciones que Dudas (un empate cuenta como Duda). */
export const convinced = (log: CampaignLog | undefined) => carcosaBelief(log) === 'conviction'

/** Cartas que se retiran según el registro (p. 19). */
function removedFor(conviction: boolean): string[] {
  return conviction ? [SETS.blackStarsRise, SETS.falseLead] : [CODES.twinSuns, SETS.huntingShadow]
}

/** Sueños de la introducción que se leen sin decidir nada (p. 17–18). */
function dreams(log: ScenarioContext['log'] | undefined): {
  entries: StoryEntry[]
  slew: boolean
  police: boolean
  chase: boolean
} {
  const king = hasNote(log, 'carcosaKingClaimedItsVictims')
  const meeting = !king && hasNote(log, 'carcosaSecretMeeting')
  const slew = !king && !meeting && hasNote(log, 'carcosaSlewTheMonsters')
  const six = !king
  const police = six && hasNote(log, 'carcosaPoliceSuspicious')
  const chase = carcosaCount(log, 'chasing') >= 4
  const dream = (n: number): StoryEntry => ({
    title: `story.phantom.dream${n}Title`,
    body: `story.phantom.dream${n}`,
    effects:
      n === 1
        ? [{ key: 'story.phantom.lostSoulEffect' }]
        : n === 4
          ? [{ key: 'story.phantom.traumaEffect' }]
          : n === 7
            ? [{ key: 'story.phantom.paranoiaEffect' }]
            : [],
  })
  const entries: StoryEntry[] = [
    {
      title: 'story.phantom.introTitle',
      body: king ? 'story.phantom.intro1' : 'story.phantom.intro2',
    },
    dream(1),
    dream(2),
    ...(meeting ? [dream(3)] : []),
    ...(slew ? [dream(4)] : []),
    ...(six ? [dream(6)] : []),
    ...(police ? [dream(7)] : []),
    dream(8),
    ...(chase ? [] : [dream(9), dream(13)]),
  ]
  return { entries, slew, police, chase }
}

/** Guía ES p. 19, "Preparación". */
export function aPhantomOfTruth({
  difficulty,
  seed = 0,
  log,
}: Pick<ScenarioContext, 'difficulty'> & {
  seed?: number
  players?: number
  log?: ScenarioContext['log']
}): ScenarioDefinition {
  // Se elige al azar una de las dos copias de Montmartre, Opéra Garnier y Le Marais.
  let rng = seedRng(seed)
  const pick = (a: string, b: string) => {
    const [chosen, next] = shuffle([a, b], rng)
    rng = next
    return locationCards[chosen[0]!]!
  }
  const random = [
    pick(CODES.montmartreA, CODES.montmartreB),
    pick(CODES.operaGarnierA, CODES.operaGarnierB),
    pick(CODES.leMaraisA, CODES.leMaraisB),
  ]
  const fixed = [
    CODES.montparnasse,
    CODES.gareDOrsay,
    CODES.grandGuignol,
    CODES.canalSaintMartin,
    CODES.pereLachaise,
    CODES.notreDame,
    CODES.gardensOfLuxembourg,
  ].map((code) => locationCards[code]!)
  const intro = dreams(log)
  const jordanInfo = hasNote(log, 'carcosaInterviewedJordan')
  const conviction = convinced(log)
  const removed = removedFor(conviction)
  const deck = [
    ...phantomSet,
    ...ENCOUNTER_SETS.evilPortents,
    ...ENCOUNTER_SETS.byakhee,
    ...ENCOUNTER_SETS.theStranger,
    ...ENCOUNTER_SETS.agentsOfHastur,
    ...ENCOUNTER_SETS.midnightMasksTreacheries,
  ].filter((c) => !removed.includes(c.code))
  return {
    id: A_PHANTOM_OF_TRUTH,
    intro: intro.entries,
    setupInstructions: { title: 'story.phantom.setupTitle', body: 'story.phantom.setup' },
    locations: [...random, ...fixed],
    startingLocation: jordanInfo ? CODES.montparnasse : CODES.gareDOrsay,
    agendas: [
      { code: CODES.theFirstNight, name: 'The First Night', doomThreshold: 6 },
      { code: CODES.theSecondNight, name: 'The Second Night', doomThreshold: 5 },
      { code: CODES.theThirdNight, name: 'The Third Night', doomThreshold: 5 },
    ],
    acts: actsFor(conviction),
    encounterDeck: deck,
    setAside: [{ ...organistHopeless }, { ...organistDraped }, { ...jordan }],
    chaosBag: [...CARCOSA_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      // Sueño 1: cada investigador recibe la Debilidad Alma perdida.
      specific('phantomLostSouls'),
      ...(intro.slew ? [{ type: 'SufferTrauma', mental: 1 } as Message] : []),
      ...(intro.police ? [specific('phantomParanoia')] : []),
      // Sueño 10: los investigadores deciden (Sueño 11, Convicción; Sueño 12, Duda).
      ...(intro.chase
        ? [
            {
              type: 'Story',
              entry: { title: 'story.phantom.dream10Title', body: 'story.phantom.dream10' },
              choices: [11, 12].map((n): Choice => ({
                label: `story.phantom.dream10Choice${n}`,
                then: [
                  {
                    type: 'Story',
                    entry: {
                      title: `story.phantom.dream${n}Title`,
                      body: `story.phantom.dream${n}`,
                      effects: [
                        {
                          key:
                            n === 11 ? 'story.carcosa.markConviction' : 'story.carcosa.markDoubt',
                        },
                      ],
                    },
                  },
                  markCarcosa(n === 11 ? 'conviction' : 'doubt'),
                  specific('phantomBelief'),
                  {
                    type: 'Story',
                    entry: { title: 'story.phantom.dream13Title', body: 'story.phantom.dream13' },
                  },
                ],
              })),
            } as Message,
          ]
        : []),
      {
        type: 'Story',
        entry: {
          title: 'story.phantom.awakeningTitle',
          body: 'story.phantom.awakening',
        },
      },
      // Información de Jordan: 3 recursos adicionales y se empieza en Montparnasse.
      ...(jordanInfo
        ? [
            {
              type: 'Story',
              entry: {
                title: 'story.phantom.jordanTitle',
                body: 'story.phantom.jordan',
                effects: [{ key: 'story.phantom.jordanEffect' }],
              },
            } as Message,
            specific('phantomJordan'),
          ]
        : []),
    ],
  }
}

const actsFor = (conviction: boolean) =>
  conviction
    ? [
        {
          code: CODES.conspiracyV2,
          name: 'The Parisian Conspiracy (v. II)',
          clueThreshold: 2,
          cluesPerInvestigator: true,
          advanceTiming: 'anytime' as const,
        },
        {
          code: CODES.stalkedByShadows,
          name: 'Stalked by Shadows',
          clueThreshold: 0,
          cluesPerInvestigator: false,
          advanceTiming: 'objective' as const,
        },
      ]
    : [
        {
          code: CODES.conspiracyV1,
          name: 'The Parisian Conspiracy (v. I)',
          clueThreshold: 2,
          cluesPerInvestigator: true,
          advanceTiming: 'anytime' as const,
        },
        {
          code: CODES.pursuingShadows,
          name: 'Pursuing Shadows',
          clueThreshold: 0,
          cluesPerInvestigator: false,
          advanceTiming: 'objective' as const,
        },
      ]

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

function specific(key: string, data: Record<string, string | number | boolean> = {}): Message {
  return { type: 'ScenarioSpecific', key, data }
}

const entry = storyEntries('phantom')
const hard = (state: GameState) => state.difficulty === 'hard' || state.difficulty === 'expert'
const actCode = (state: GameState) => state.acts[state.actIndex]?.code
const push = (state: GameState, ...messages: Message[]): GameState => ({
  ...state,
  queue: [...messages, ...state.queue],
})
const organistOf = (state: GameState) =>
  Object.values(state.enemies).find((e) => ORGANISTS.includes(e.code))
const isByakhee = (e: Enemy | EnemyCard) => (e.traits ?? []).includes('Byakhee')
const players = (state: GameState) => state.investigators.length

/** El jefe elige entre varias opciones; con una sola, se resuelve sin preguntar. */
function leadChooses(state: GameState, prompt: string, choices: Choice[]): Message[] {
  if (choices.length === 0) return []
  if (choices.length === 1) return choices[0]!.then
  const lead = leadInvestigator(state) ?? state.investigators[0]
  if (!lead) return []
  return [{ type: 'Ask', investigator: lead.id, question: { kind: 'chooseOne', prompt, choices } }]
}

const locationChoice = (state: GameState, id: LocationId, then: Message[]): Choice => ({
  label: 'choice.location',
  params: { location: state.locations[id]?.name ?? id },
  target: { type: 'location', id },
  then,
})

/** Distancia de cada Lugar al investigador más cercano. */
function nearestInvestigator(state: GameState): Map<LocationId, number> {
  const result = new Map<LocationId, number>()
  for (const i of activeInvestigators(state)) {
    if (i.location === null) continue
    for (const [id, d] of distancesFrom(state, i.location))
      result.set(id, Math.min(result.get(id) ?? Infinity, d))
  }
  return result
}

/** Lugares más alejados de todos los investigadores. */
function farthestLocations(state: GameState): LocationId[] {
  const distances = nearestInvestigator(state)
  const ids = Object.keys(state.locations)
  const score = (id: LocationId) => distances.get(id) ?? Infinity
  const best = Math.max(...ids.map(score))
  return ids.filter((id) => score(id) === best)
}

/** Mueve a El organista 1 Lugar lejos del investigador más cercano (a uno vacío, si puede). */
function organistAway(state: GameState): Message[] {
  const organist = organistOf(state)
  if (!organist) return []
  const distances = nearestInvestigator(state)
  const here = distances.get(organist.location) ?? Infinity
  const away = (state.locations[organist.location]?.connections ?? []).filter(
    (id) => (distances.get(id) ?? Infinity) > here,
  )
  const empty = away.filter((id) => !activeInvestigators(state).some((i) => i.location === id))
  const options = empty.length ? empty : away
  return leadChooses(
    state,
    'prompt.phantom.organistAway',
    options.map((id) =>
      locationChoice(state, id, [{ type: 'MoveEnemy', enemy: organist.id, location: id }]),
    ),
  )
}

/** Aparece El organista apartado en el Lugar del jefe o en el más alejado de todos. */
function spawnOrganist(state: GameState, code: string, where: 'lead' | 'farthest'): Message[] {
  const spawn = (id: LocationId): Message[] => [{ type: 'SpawnSetAsideEnemy', code, location: id }]
  if (where === 'lead') {
    const lead = leadInvestigator(state) ?? activeInvestigators(state)[0]
    return lead?.location ? spawn(lead.location) : []
  }
  return leadChooses(
    state,
    'prompt.phantom.organistSpawn',
    farthestLocations(state).map((id) => locationChoice(state, id, spawn(id))),
  )
}

/** Reverso de los planes 1 y 2: desenfrentarse, moverse si se quiere y El organista se aleja. */
function daybreak(state: GameState): Message[] {
  return [
    ...activeInvestigators(state).map((i): Message => ({
      type: 'DisengageAll',
      investigator: i.id,
    })),
    ...activeInvestigators(state).flatMap((i): Message[] => {
      const here = i.location
      if (here === null) return []
      const connections = state.locations[here]?.connections ?? []
      if (!connections.length) return []
      return [
        {
          type: 'Ask',
          investigator: i.id,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.phantom.daybreakMove',
            choices: [
              { label: 'choice.phantom.stay', then: [] },
              ...connections.map((id) =>
                locationChoice(state, id, [{ type: 'MoveTo', investigator: i.id, location: id }]),
              ),
            ],
          },
        },
      ]
    }),
    specific('phantomOrganistAway'),
  ]
}

/** Resolución del reverso del acto 2: R2 si se colaron en una reunión secreta; si no, R1. */
const actTwoOutcome = (state: GameState): Message => ({
  type: 'EndScenario',
  outcome: resolution(hasNote(state.campaignLog, 'carcosaSecretMeeting') ? 2 : 1),
})

// ---------------------------------------------------------------------------
// Resoluciones (guía ES pp. 20–21)
// ---------------------------------------------------------------------------

const NEXT = 'story.carcosa.thePallidMask'

function resolutionMessages(state: GameState, outcome: ScenarioOutcome): Message[] {
  const number = outcome.type === 'resolution' ? outcome.resolution : 0
  if (![0, 1, 2, 3].includes(number)) throw new Error('Invalid A Phantom of Truth resolution')
  const steps: Record<
    number,
    { key: string; note: string; token: 'cultist' | 'tablet' | 'elderThing' }
  > = {
    0: { key: 'noResolution', note: 'carcosaGazeOfThePhantom', token: 'elderThing' },
    1: { key: 'resolution1', note: 'carcosaFoundNigelsHome', token: 'cultist' },
    2: { key: 'resolution2', note: 'carcosaFoundNigelEngram', token: 'tablet' },
    3: { key: 'resolution3', note: 'carcosaUnableToFindNigel', token: 'elderThing' },
  }
  const { key, note, token } = steps[number]!
  const slain = state.victoryDisplay.includes(jordan.code)
  const bonus = number === 2 ? 2 : 0
  return [
    {
      type: 'Story',
      entry: entry(key, [
        noteEffect(note),
        ...(number === 2 ? [{ key: 'story.phantom.mentalTrauma' }] : []),
        ...(slain ? [noteEffect('carcosaSlainJordan')] : []),
        { key: 'story.effect.experience', params: { bonus } },
        { key: `story.phantom.tokens.${token}` },
        { key: 'story.effect.proceed', params: { scenario: NEXT } },
      ]),
    },
    recordNote(note),
    ...(number === 2 ? [{ type: 'SufferTrauma', mental: 1 } as Message] : []),
    ...(slain ? [recordNote('carcosaSlainJordan')] : []),
    earnExperience(bonus, true),
    replaceSymbolTokens(token, token),
    endScenario(number === 0 ? outcome : resolution(number)),
  ]
}

// ---------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------

const failedBy = (state: GameState) => {
  const test = state.skillTest
  return test ? Math.max(1, test.difficulty - (test.modifiedSkill ?? 0)) : 1
}

registerScenario({
  id: A_PHANTOM_OF_TRUTH,
  resolution: resolutionMessages,
  tokenEffect: (state, token, investigator) => {
    switch (token) {
      case 'skull':
        // -X: la perdición en juego (máximo 5 en Fácil/Normal).
        return { modifier: -(hard(state) ? totalDoom(state) : Math.min(5, totalDoom(state))) }
      case 'cultist':
        return hard(state)
          ? { modifier: -2, immediate: [specific('phantomByakhee')] }
          : { modifier: -2, onFail: [specific('phantomByakhee')] }
      case 'tablet':
        // Cancela los efectos y los iconos de las cartas de habilidad comprometidas.
        return { modifier: hard(state) ? -4 : -3, immediate: [{ type: 'CancelCommittedSkills' }] }
      case 'elderThing':
        return {
          modifier: hard(state) ? -3 : -2,
          onFail: [specific('phantomLoseResources', { investigator })],
        }
    }
    return { modifier: 0 }
  },
  enemyStat: (state, e, stat) =>
    // Notre-Dame: -1 de combate y +1 de evasión.
    (e.location === CODES.notreDame ? (stat === 'fight' ? -1 : 1) : 0) +
    // Byakhee sigiloso: -3 de combate mientras está agotado.
    (stat === 'fight' && e.code === CODES.stealthyByakhee && e.exhausted ? -3 : 0) +
    // Byakhee chillador (Agentes de Hastur): +1 de combate y evasión ante poca cordura.
    byakheeStat(state, e),
  // El organista no puede recibir daño.
  enemyImmune: (_state, e) => ORGANISTS.includes(e.code),
  // Jardines de Luxemburgo: mientras un Byakhee se mueve, con un investigador allí.
  enemyConnections: (state, location, mover) =>
    mover &&
    isByakhee(mover) &&
    location !== CODES.gardensOfLuxembourg &&
    state.locations[CODES.gardensOfLuxembourg] &&
    activeInvestigators(state).some((i) => i.location === CODES.gardensOfLuxembourg)
      ? [CODES.gardensOfLuxembourg]
      : [],
  // Cementerio Père Lachaise y Le Marais (03218): no puedes salir hasta el final de la ronda.
  cannotLeave: (state, investigator) =>
    state.scenarioMeta?.[`${STUCK}${investigator}`] === state.round,
  // Opéra Garnier: al investigarla, el doble de iconos (03212) o de valor base (03213).
  skillDoubling: (_state, test) =>
    test.kind.type !== 'investigate'
      ? {}
      : test.kind.location === CODES.operaGarnierA
        ? { icons: true }
        : test.kind.location === CODES.operaGarnierB
          ? { base: true }
          : {},
  // Acordes tortuosos: cada carta que juegas cuesta 1 más por cada uno con recursos.
  cardCostModifier: (state, investigator) => chordsOf(state, investigator).length,
  forced: (state, trigger) => {
    // Acto 1: al final de la ronda, con 3 o más de perdición en juego, avanza.
    if (
      trigger.type === 'roundEnds' &&
      (actCode(state) === CODES.conspiracyV1 || actCode(state) === CODES.conspiracyV2) &&
      totalDoom(state) >= 3
    )
      return [
        { type: 'SetScenarioMeta', key: BY_DOOM, value: 1 },
        { type: 'AdvanceAct', paid: true },
      ]
    // Cementerio Père Lachaise: tras investigarlo con éxito, no puedes salir esta ronda.
    if (
      trigger.type === 'skillTestEnded' &&
      trigger.kind === 'investigate' &&
      trigger.succeeded &&
      trigger.location === CODES.pereLachaise
    )
      return [
        { type: 'SetScenarioMeta', key: `${STUCK}${trigger.investigator}`, value: state.round },
      ]
    // Le Marais (03218): tras entrar, no puedes salir esta ronda.
    if (
      trigger.type === 'afterMove' &&
      getInvestigator(state, trigger.investigator).location === CODES.leMaraisB
    )
      return [
        { type: 'SetScenarioMeta', key: `${STUCK}${trigger.investigator}`, value: state.round },
      ]
    // Acordes tortuosos: al jugar una carta, se retira 1 recurso de cada uno.
    if (trigger.type === 'afterPlayCard')
      return chordsOf(state, trigger.investigator).map((t): Message => ({
        type: 'AddTreacheryTokens',
        treachery: t.id,
        amount: -1,
      }))
    return []
  },
  reactions: (state, trigger) => {
    // Le Marais (03217): al comenzar tu turno allí, roba 1 carta (límite de grupo).
    if (
      trigger.type === 'turnBegins' &&
      getInvestigator(state, trigger.investigator).location === CODES.leMaraisA
    )
      return [
        {
          key: `${CODES.leMaraisA}:draw`,
          investigator: trigger.investigator,
          label: 'ability.phantom.leMarais',
          limit: { per: 'round', group: true },
          then: [{ type: 'DrawCards', investigator: trigger.investigator, amount: 1 }],
        },
      ]
    // Canal Saint-Martin: tras evitar a un enemigo allí, muévelo a un Lugar conectado.
    if (trigger.type === 'afterEvade') {
      const evaded = state.enemies[trigger.enemy]
      if (!evaded || evaded.location !== CODES.canalSaintMartin) return []
      const who = trigger.investigator
      return [
        {
          key: `${CODES.canalSaintMartin}:move`,
          investigator: who,
          label: 'ability.phantom.canal',
          params: { enemy: evaded.name },
          limit: { per: 'round' },
          then: [
            {
              type: 'Ask',
              investigator: who,
              question: {
                kind: 'chooseOne',
                prompt: 'prompt.chooseLocation',
                choices: (state.locations[CODES.canalSaintMartin]?.connections ?? []).map((id) =>
                  locationChoice(state, id, [
                    { type: 'MoveEnemy', enemy: evaded.id, location: id },
                  ]),
                ),
              },
            },
          ],
        },
      ]
    }
    // Persiguiendo sombras: tras atacar con éxito a El organista, un investigador de tu
    // Lugar puede colocar 1 de sus pistas sobre él (límite de grupo 1 por investigador).
    if (
      trigger.type === 'afterSkillTest' &&
      trigger.kind === 'fight' &&
      trigger.succeeded &&
      actCode(state) === CODES.pursuingShadows
    ) {
      const target = trigger.enemy ? state.enemies[trigger.enemy] : undefined
      if (!target || !ORGANISTS.includes(target.code)) return []
      const used = state.scenarioMeta?.[`${ORGANIST_CLUES}${state.round}`]
      if (typeof used === 'number' && used >= players(state)) return []
      const here = getInvestigator(state, trigger.investigator).location
      const givers = activeInvestigators(state).filter((i) => i.location === here && i.clues > 0)
      if (!givers.length) return []
      return [
        {
          key: `${CODES.pursuingShadows}:clue`,
          investigator: trigger.investigator,
          label: 'ability.phantom.organistClue',
          then: [
            ...leadChooses(
              state,
              'prompt.phantom.organistClue',
              givers.map((i) => ({
                label: 'choice.investigator',
                params: { name: i.name },
                then: [
                  {
                    type: 'MoveClues',
                    from: { type: 'investigator', id: i.id },
                    to: { type: 'enemy', id: target.id },
                    amount: 1,
                  } as Message,
                ],
              })),
            ),
            {
              type: 'SetScenarioMeta',
              key: `${ORGANIST_CLUES}${state.round}`,
              value: (typeof used === 'number' ? used : 0) + 1,
            },
          ],
        },
      ]
    }
    return []
  },
  specific: (state, key, data) => {
    const common = carcosaSpecific(state, key, data) ?? encounterSpecific(state, key, data)
    if (common) return common
    const investigator = typeof data.investigator === 'string' ? data.investigator : null
    switch (key) {
      case 'phantomLostSouls': {
        // Sueño 1: Alma perdida en cada mazo (y en el registro, para el resto de la campaña).
        return push(
          state,
          ...state.investigators.flatMap((i): Message[] => [
            { type: 'AddStoryAsset', investigator: i.id, code: CODES.lostSoul },
            { type: 'PlaceOnDeck', investigator: i.id, code: CODES.lostSoul, where: 'top' },
            { type: 'ShuffleDeck', investigator: i.id },
          ]),
        )
      }
      case 'phantomParanoia':
        // Sueño 7: el investigador elegido añade Paranoia a su mazo.
        return push(
          state,
          ...leadChooses(
            state,
            'prompt.phantom.paranoia',
            state.investigators.map((i) => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [
                { type: 'AddStoryAsset', investigator: i.id, code: PARANOIA } as Message,
                {
                  type: 'PlaceOnDeck',
                  investigator: i.id,
                  code: PARANOIA,
                  where: 'top',
                } as Message,
                { type: 'ShuffleDeck', investigator: i.id } as Message,
              ],
            })),
          ),
        )
      case 'phantomBelief': {
        // Tras el Sueño 10 cambian el acto 1 y las cartas retiradas según el registro.
        const conviction = convinced(state.campaignLog)
        const removed = removedFor(conviction)
        const restored = removedFor(!conviction)
        const all = [
          ...ENCOUNTER_SETS.evilPortents,
          ...ENCOUNTER_SETS.midnightMasksTreacheries,
          ...phantomSet,
        ].filter((c) => restored.includes(c.code))
        const [encounterDeck, rng] = shuffle(
          [
            ...state.encounterDeck.filter((c) => !removed.includes(c.code)),
            ...all.map((c) => ({ ...c })),
          ],
          state.rng,
        )
        return { ...state, encounterDeck, rng, acts: actsFor(conviction) }
      }
      case 'phantomJordan':
        return push(
          state,
          ...activeInvestigators(state).map((i): Message => ({
            type: 'GainResources',
            investigator: i.id,
            amount: 3,
          })),
        )
      case 'phantomOrganistAway':
        return push(state, ...organistAway(state))
      case 'phantomSpawnOrganist':
        return push(
          state,
          ...spawnOrganist(state, String(data.code), data.where === 'lead' ? 'lead' : 'farthest'),
        )
      case 'phantomDisengageOrganist': {
        const organist = organistOf(state)
        if (!organist) return state
        return {
          ...state,
          enemies: { ...state.enemies, [organist.id]: { ...organist, engagedWith: null } },
        }
      }
      case 'phantomByakhee': {
        // Cada Byakhee no enfrentado se mueve una vez hacia el investigador más cercano.
        const byakhee = Object.values(state.enemies)
          .filter((e) => isByakhee(e) && e.engagedWith === null)
          .map((e) => e.id)
        return byakhee.length ? push(state, { type: 'HuntersMove', enemies: byakhee }) : state
      }
      case 'phantomLoseResources':
        return investigator
          ? push(state, { type: 'LoseResources', investigator, amount: failedBy(state) })
          : state
      case 'phantomTwinSuns': {
        // Retira 1 perdición del plan actual o recibe 1 horror por cada punto de fallo.
        if (investigator === null) return state
        const horror = damage(investigator, 0, failedBy(state))
        if (state.doom === 0) return push(state, horror)
        return push(state, {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEffect',
            choices: [
              {
                label: 'choice.phantom.removeAgendaDoom',
                then: [{ type: 'RemoveDoom', target: { type: 'agenda' }, amount: 1 }],
              },
              { label: 'choice.oath.wallsHorror', params: { n: failedBy(state) }, then: [horror] },
            ],
          },
        })
      }
      case 'phantomDeadlyFate':
        return investigator ? deadlyFate(state, investigator) : state
      case 'phantomAttackFromDiscard': {
        if (investigator === null) return state
        const index = Number(data.index)
        const attacker = state.encounterDiscard[index]
        if (!attacker || attacker.kind !== 'enemy') return state
        return push(state, damage(investigator, attacker.damage, attacker.horror))
      }
      case 'phantomDrawFromDiscard': {
        if (investigator === null) return state
        const index = Number(data.index)
        const drawn = state.encounterDiscard[index]
        if (!drawn) return state
        return push(
          { ...state, encounterDiscard: state.encounterDiscard.filter((_, n) => n !== index) },
          { type: 'ResolveEncounterCard', investigator, card: drawn },
        )
      }
      case 'phantomChords': {
        if (investigator === null) return state
        const id = String(data.treachery)
        return push(
          state,
          { type: 'AddTreacheryTokens', treachery: id, amount: failedBy(state) },
          {
            type: 'PlaceTreachery',
            treachery: id,
            placement: { type: 'threatArea', investigator },
          },
        )
      }
      case 'phantomGrandGuignol':
        return investigator ? push(state, ...grandGuignol(state, investigator)) : state
      case 'phantomShuffleHand': {
        if (investigator === null) return state
        const me = getInvestigator(state, investigator)
        const back = me.hand.filter((code) => !playerCardDef(code)?.weakness)
        const kept = me.hand.filter((code) => !!playerCardDef(code)?.weakness)
        const [deck, rng] = shuffle([...me.deck, ...back], state.rng)
        return push(
          {
            ...state,
            rng,
            investigators: state.investigators.map((i) =>
              i.id === investigator ? { ...i, hand: kept, deck } : i,
            ),
          },
          ...(back.length
            ? [{ type: 'DrawCards', investigator, amount: back.length } as Message]
            : []),
        )
      }
      case 'phantomMontmartre':
        return investigator ? montmartreReveal(state, investigator) : state
      case 'phantomPlayRevealed': {
        // Juega (pagando su coste) un apoyo revelado de la parte superior de un mazo.
        if (investigator === null) return state
        const owner = String(data.owner)
        const code = String(data.code)
        const cost = playerCardDef(code)?.cost ?? 0
        const me = getInvestigator(state, investigator)
        const from = getInvestigator(state, owner)
        if (from.deck[0] !== code || me.resources < cost) return state
        return push(
          {
            ...state,
            investigators: state.investigators.map((i) =>
              i.id === owner ? { ...i, deck: i.deck.slice(1) } : i,
            ),
          },
          { type: 'SpendResources', investigator, amount: cost },
          { type: 'PutAssetIntoPlay', investigator, code },
        )
      }
    }
    return state
  },
})

/** Acordes tortuosos con recursos en la zona de amenaza del investigador. */
function chordsOf(state: GameState, investigator: InvestigatorId) {
  return Object.values(state.treacheries).filter(
    (t) =>
      t.code === CODES.torturousChords &&
      t.placement.type === 'threatArea' &&
      t.placement.investigator === investigator &&
      (t.tokens ?? 0) > 0,
  )
}

/** Destino fatal: descarta hasta un enemigo; lo robas o te ataca desde los descartes. */
function deadlyFate(state: GameState, investigator: InvestigatorId): GameState {
  const index = state.encounterDeck.findIndex((c) => c.kind === 'enemy')
  if (index < 0)
    return push(
      {
        ...state,
        encounterDeck: [],
        encounterDiscard: [...state.encounterDiscard, ...state.encounterDeck],
      },
      damage(investigator, 0, 1),
    )
  const discarded = state.encounterDeck.slice(0, index + 1)
  const at = state.encounterDiscard.length + index
  return push(
    {
      ...state,
      encounterDeck: state.encounterDeck.slice(index + 1),
      encounterDiscard: [...state.encounterDiscard, ...discarded],
    },
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEffect',
        choices: [
          {
            label: 'choice.phantom.drawEnemy',
            params: { enemy: discarded[index]!.name },
            then: [specific('phantomDrawFromDiscard', { investigator, index: at })],
          },
          {
            label: 'choice.phantom.enemyAttacks',
            params: { enemy: discarded[index]!.name },
            then: [specific('phantomAttackFromDiscard', { investigator, index: at })],
          },
        ],
      },
    },
  )
}

/** Grand Guignol: 2 horror o barajar las cartas de la mano (no Debilidad) y robar otras tantas. */
function grandGuignol(state: GameState, investigator: InvestigatorId): Message[] {
  return [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEffect',
        choices: [
          { label: 'choice.phantom.guignolHorror', then: [damage(investigator, 0, 2)] },
          {
            label: 'choice.phantom.guignolShuffle',
            then: [specific('phantomShuffleHand', { investigator })],
          },
        ],
      },
    },
  ]
}

/**
 * Montmartre (03209): revela la carta superior del mazo de cada investigador; puedes jugar
 * un apoyo revelado pagando su coste. Después se barajan los mazos.
 */
function montmartreReveal(state: GameState, investigator: InvestigatorId): GameState {
  const me = getInvestigator(state, investigator)
  const revealed = activeInvestigators(state).flatMap((i) => {
    const top = i.deck[0]
    return top ? [{ owner: i.id, code: top }] : []
  })
  const playable = revealed.filter(({ code }) => {
    const def = playerCardDef(code)
    return def?.type === 'asset' && !def.weakness && (def.cost ?? 0) <= me.resources
  })
  const shuffles: Message[] = activeInvestigators(state).map((i) => ({
    type: 'ShuffleDeck',
    investigator: i.id,
  }))
  const logged = {
    ...state,
    log: [
      ...state.log,
      ...revealed.map((r) => ({
        key: 'log.phantom.revealed',
        round: state.round,
        params: {
          name: getInvestigator(state, r.owner).name,
          card: playerCardDef(r.code)?.name ?? r.code,
        },
      })),
    ],
  }
  if (!playable.length) return push(logged, ...shuffles)
  return push(
    logged,
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.phantom.montmartre',
        choices: [
          { label: 'choice.phantom.playNothing', then: [] },
          ...playable.map(({ owner, code }) => ({
            label: 'choice.phantom.playRevealed',
            params: { card: playerCardDef(code)?.name ?? code },
            then: [specific('phantomPlayRevealed', { investigator, owner, code })],
          })),
        ],
      },
    },
    ...shuffles,
  )
}

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

for (const code of AGENDAS)
  registerAgenda({
    code,
    // Con más Convicciones que Dudas, la perdición de otras cartas resta en vez de sumar.
    thresholdDoom: (state) =>
      convinced(state.campaignLog) ? 2 * state.doom - totalDoom(state) : totalDoom(state),
    onAdvance: (state) => {
      if (code === CODES.theThirdNight)
        // Amanece al fin: con más Dudas (o igual), R3; si no, el reverso del acto 2.
        return [
          convinced(state.campaignLog)
            ? actTwoOutcome(state)
            : ({ type: 'EndScenario', outcome: resolution(3) } as Message),
        ]
      return [
        ...daybreak(state),
        ...(code === CODES.theSecondNight && !hasNote(state.campaignLog, 'carcosaSlainJordan')
          ? [
              {
                type: 'SpawnSetAsideEnemy',
                code: jordan.code,
                location: CODES.montparnasse,
              } as Message,
            ]
          : []),
      ]
    },
  })

// ---------------------------------------------------------------------------
// Actos
// ---------------------------------------------------------------------------

for (const [code, organist, cluesWhere] of [
  [CODES.conspiracyV1, CODES.organistDraped, 'lead'],
  [CODES.conspiracyV2, CODES.organistHopeless, 'farthest'],
] as const)
  registerAct({
    code,
    // Si se gastaron pistas, El organista aparece en un sitio; si avanzó por la perdición,
    // cada investigador recibe 2 horror y aparece en el otro.
    onAdvance: (state) => {
      const byDoom = state.scenarioMeta?.[BY_DOOM] === 1
      const where = byDoom ? (cluesWhere === 'lead' ? 'farthest' : 'lead') : cluesWhere
      return [
        ...(byDoom ? activeInvestigators(state).map((i) => damage(i.id, 0, 2)) : []),
        specific('phantomSpawnOrganist', { code: organist, where }),
      ]
    },
  })

registerAct({
  code: CODES.pursuingShadows,
  // Objetivo: 3 pistas por investigador sobre El organista.
  objectiveMet: (state) => (organistOf(state)?.clues ?? 0) >= 3 * players(state),
  onAdvance: (state) => [actTwoOutcome(state)],
})

registerAct({
  code: CODES.stalkedByShadows,
  objectiveMet: () => false,
  // [fast] Gastad 1 pista por investigador: 1 perdición en el plan o evitar a El organista.
  abilities: (state, _self, investigator) => {
    const cost = players(state)
    const pool = activeInvestigators(state).reduce((sum, i) => sum + i.clues, 0)
    const organist = organistOf(state)
    if (pool < cost) return []
    return [
      {
        key: `${CODES.stalkedByShadows}:clues`,
        label: 'ability.phantom.stalked',
        params: { n: cost },
        actions: 0,
        provokes: false,
        limit: { per: 'round', group: true },
        costs: [{ type: 'SpendGroupClues', amount: cost }],
        then: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEffect',
              choices: [
                {
                  label: 'choice.phantom.agendaDoom',
                  then: [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }],
                },
                ...(organist
                  ? [
                      {
                        label: 'choice.phantom.evadeOrganist',
                        then: [
                          { type: 'EvadeEnemy', enemy: organist.id, by: investigator } as Message,
                        ],
                      },
                    ]
                  : []),
              ],
            },
          },
        ],
      } satisfies AbilityOption,
    ]
  },
  onAdvance: (state) => [actTwoOutcome(state)],
})

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.montparnasse,
  // [fast] Descarta una carta de tu mano: gana tantos recursos como iconos [willpower].
  abilities: (state, self, investigator) => {
    const hand = getInvestigator(state, investigator).hand
    if (!hand.length) return []
    return [
      {
        key: `${self.id}:discard`,
        label: 'ability.phantom.montparnasse',
        actions: 0,
        provokes: false,
        limit: { per: 'round' },
        then: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseCardToDiscard',
              choices: [...new Set(hand)].map((code) => {
                const gain = playerCardDef(code)?.icons?.willpower ?? 0
                return {
                  label: 'choice.discard',
                  params: { card: playerCardDef(code)?.name ?? code },
                  target: { type: 'hand' as const, code },
                  then: [
                    { type: 'DiscardFromHand', investigator, card: code } as Message,
                    ...(gain
                      ? [{ type: 'GainResources', investigator, amount: gain } as Message]
                      : []),
                  ],
                }
              }),
            },
          },
        ],
      },
    ]
  },
})

registerLocation({
  code: CODES.montmartreA,
  // [action]: revela la carta superior de cada mazo; puedes jugar un apoyo revelado.
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:reveal`,
      label: 'ability.phantom.montmartreReveal',
      actions: 1,
      provokes: true,
      limit: { per: 'round', group: true },
      then: [specific('phantomMontmartre', { investigator })],
    },
  ],
})

registerLocation({
  code: CODES.montmartreB,
  // [action] Gasta 1 recurso: añade 1 suministro o munición a una carta que controles.
  abilities: (state, self, investigator) => {
    if (getInvestigator(state, investigator).resources < 1) return []
    const targets = Object.values(state.assets).filter(
      (a) =>
        a.owner === investigator &&
        ['ammo', 'supplies'].includes(playerCardDef(a.code)?.uses?.type ?? ''),
    )
    return targets.map((a): AbilityOption => ({
      key: `${self.id}:uses`,
      label: 'ability.phantom.montmartreUses',
      params: { card: playerCardDef(a.code)?.name ?? a.code },
      actions: 1,
      provokes: true,
      limit: { per: 'round' },
      target: { type: 'asset', id: a.id },
      costs: [{ type: 'SpendResources', investigator, amount: 1 }],
      then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
    }))
  },
})

registerLocation({
  code: CODES.grandGuignol,
  // Forzado: tras revelarlo, quien lo revela recibe 2 horror o baraja su mano y roba otra.
  onReveal: (state, self) => {
    const here = activeInvestigators(state).find((i) => i.location === self.id)
    return here ? [specific('phantomGrandGuignol', { investigator: here.id })] : []
  },
})

registerLocation({
  code: CODES.gareDOrsay,
  // [action] Gasta 1 recurso: muévete a cualquier Lugar Ferrocarril.
  abilities: (state, self, investigator) => {
    if (getInvestigator(state, investigator).resources < 1) return []
    const rails = RAIL.filter((id) => id !== self.id && state.locations[id])
    return [
      {
        key: `${self.id}:rail`,
        label: 'ability.phantom.gareDOrsay',
        actions: 1,
        provokes: true,
        costs: [{ type: 'SpendResources', investigator, amount: 1 }],
        then: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseMove',
              choices: rails.map((id) =>
                locationChoice(state, id, [{ type: 'MoveTo', investigator, location: id }]),
              ),
            },
          },
        ],
      },
    ]
  },
})

registerLocation({
  code: CODES.notreDame,
  // [action]: [willpower] (6); si tienes éxito, coloca o retira 1 perdición del plan
  // (límite de grupo una vez por partida).
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:doom`,
      label: 'ability.phantom.notreDame',
      actions: 1,
      provokes: true,
      limit: { per: 'game', group: true },
      then: [
        effectTest(investigator, 'Notre-Dame', 'willpower', 6, {
          onSuccess: [
            {
              type: 'Ask',
              investigator,
              question: {
                kind: 'chooseOne',
                prompt: 'prompt.chooseEffect',
                choices: [
                  {
                    label: 'choice.phantom.agendaDoom',
                    then: [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }],
                  },
                  {
                    label: 'choice.phantom.removeAgendaDoom',
                    then: [{ type: 'RemoveDoom', target: { type: 'agenda' }, amount: 1 }],
                  },
                ],
              },
            },
          ],
        }),
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.organistDraped,
  // No puede ser derrotado (no puede recibir daño).
  wouldBeDefeated: () => [],
  // Forzado: al final de la fase de Enemigos, sin enfrentar se aleja; enfrentado, se separa.
  forced: (_state, trigger, self) =>
    trigger.type === 'enemyPhaseEnds'
      ? [specific(self.engagedWith === null ? 'phantomOrganistAway' : 'phantomDisengageOrganist')]
      : [],
})

registerEnemy({
  code: CODES.organistHopeless,
  wouldBeDefeated: () => [],
  // Forzado: tras moverse por Cazador sin quedar enfrentado, se mueve otra vez y no ataca
  // en esta fase (límite una vez por ronda).
  forced: (state, trigger, self) =>
    trigger.type === 'enemyEntersLocation' &&
    trigger.enemy === self.id &&
    state.phase === 'enemy' &&
    self.huntedRound === state.round &&
    state.scenarioMeta?.[REHUNT] !== state.round &&
    !activeInvestigators(state).some((i) => i.location === self.location)
      ? [
          { type: 'SetScenarioMeta', key: REHUNT, value: state.round },
          { type: 'EnemySkipsAttacks', enemy: self.id },
          { type: 'HuntersMove', enemies: [self.id] },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// Traiciones de El Fantasma de la Verdad y Alma perdida
// ---------------------------------------------------------------------------

registerTreachery({
  code: CODES.twinSuns,
  // [intellect] (4): si fallas, retira 1 perdición del plan o 1 horror por punto de fallo.
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Twin Suns', 'intellect', 4, {
      onFail: [specific('phantomTwinSuns', { investigator })],
    }),
  ],
})

registerTreachery({
  code: CODES.deadlyFate,
  // [willpower] (3): si fallas, descarta del mazo de Encuentros hasta un enemigo.
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Deadly Fate', 'willpower', 3, {
      onFail: [specific('phantomDeadlyFate', { investigator })],
    }),
  ],
})

registerTreachery({
  code: CODES.torturousChords,
  // [willpower] (5): si fallas, entra en tu zona de amenaza con 1 recurso por punto de fallo.
  revelation: (_state, investigator, self) => [
    effectTest(investigator, 'Torturous Chords', 'willpower', 5, {
      onFail: [specific('phantomChords', { investigator, treachery: self.id })],
    }),
  ],
  // Sin recursos, se descarta.
  persistsWhile: (_state, self) => self.placement.type !== 'threatArea' || (self.tokens ?? 0) > 0,
})

registerTreachery({
  code: CODES.lostSoul,
  // Con más (o igual) Dudas: [intellect] (X = tu [willpower]); con más Convicciones:
  // [willpower] (X = tu [intellect]). Si fallas, 2 daño.
  revelation: (state, investigator) => {
    const me = getInvestigator(state, investigator)
    const conviction = convinced(state.campaignLog)
    return [
      effectTest(
        investigator,
        'Lost Soul',
        conviction ? 'willpower' : 'intellect',
        conviction ? me.skills.intellect : me.skills.willpower,
        { onFail: [damage(investigator, 2)] },
      ),
    ]
  },
})
