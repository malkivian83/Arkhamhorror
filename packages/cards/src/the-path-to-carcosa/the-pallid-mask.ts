/**
 * Escenario VI de El camino a Carcosa: "La máscara pálida" (03240–03262).
 * Guía de campaña revisada ES, pp. 22–24.
 *
 * Las catacumbas forman una cuadrícula: cada Lugar se pone en juego a la izquierda,
 * derecha, arriba o abajo de otro (posición [columna, fila]) y está conectado con los
 * adyacentes. Las copias repetidas de un Lugar llevan el sufijo `~2` en su id.
 */
import {
  activeInvestigators,
  allPlayerCardDefs,
  distancesFrom,
  getInvestigator,
  leadInvestigator,
  nextInt,
  printedCode,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerScenario,
  registerTreachery,
  seedRng,
  shuffle,
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
import { ENCOUNTER_SETS, encounterSpecific } from './encounter-sets'
import { carcosaSpecific, hasNote, markCarcosa, replaceSymbolTokens } from './log'
import { THE_MAN_IN_THE_PALLID_MASK, theManInThePallidMask } from './the-man-in-the-pallid-mask'
import { VIPS } from './the-last-king'

export const THE_PALLID_MASK = 'the-pallid-mask'

export const CODES = {
  scenario: '03240',
  empireOfTheDead: '03241',
  specterOfDeath: '03241b',
  empireOfTheUndead: '03242',
  throughTheCatacombs: '03243',
  thePathIsBarred: '03244',
  theWayOut: '03245',
  leadingTheWay: '03246',
  theGateToHell: '03247',
  stoneArchways: '03248',
  cryptOfTheSepulchralLamp: '03249',
  boneFilledCaverns: '03250',
  wellOfSouls: '03251',
  candlelitTunnels: '03252',
  labyrinthOfBones: '03253',
  narrowShaft: '03254',
  shiveringPools: '03255',
  blockedPassage: '03256',
  tombOfShadows: '03257',
  catacombsDocent: '03258',
  corpseDweller: '03259',
  eyesInTheWalls: '03260',
  theShadowBehindYou: '03261',
  thePitBelow: '03262',
} as const

type Direction = 'up' | 'down' | 'left' | 'right'
const STEP: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}
/** Dónde pone en juego cada Lugar las Catacumbas al revelarse (y si se elige un solo sitio). */
const PLACEMENTS: Record<string, { dirs: Direction[]; one?: boolean }> = {
  [CODES.theGateToHell]: { dirs: ['up', 'down'] },
  [CODES.stoneArchways]: { dirs: ['right'] },
  [CODES.cryptOfTheSepulchralLamp]: { dirs: ['up', 'right'] },
  [CODES.boneFilledCaverns]: { dirs: ['down', 'right'] },
  [CODES.wellOfSouls]: { dirs: ['up', 'down', 'right'], one: true },
  [CODES.candlelitTunnels]: { dirs: ['left', 'right'] },
  [CODES.labyrinthOfBones]: { dirs: ['up', 'down', 'right'] },
  [CODES.narrowShaft]: { dirs: ['up', 'right'], one: true },
  [CODES.shiveringPools]: { dirs: ['down', 'right'], one: true },
}

const START = 'carcosa:startingLocation'
const DECK = 'catacombs'
const MAN_DEFEATED = 'carcosa:manDefeated'
const STUCK = 'carcosa:stuck:'
const LOOKED = 'carcosa:lookedBehind:'
const BEARER = 'carcosa:strangerBearer'
export const SECRET_PASSAGE = 'openedASecretPassageway'

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

type Place = Omit<LocationCard, 'connections' | 'clueValue' | 'cluesPerInvestigator'> & {
  clues?: number
}
const catacomb = ({ clues = 0, ...card }: Place): LocationCard => ({
  ...card,
  clueValue: clues,
  cluesPerInvestigator: clues > 0,
  connections: [],
  symbol: 'none',
  connectsTo: [],
  unrevealedName: 'Catacombs',
})

export const locationCards: Record<string, LocationCard> = {
  [CODES.theGateToHell]: catacomb({
    id: CODES.theGateToHell,
    name: 'The Gate to Hell',
    shroud: 1,
    clues: 2,
  }),
  [CODES.stoneArchways]: catacomb({ id: CODES.stoneArchways, name: 'Stone Archways', shroud: 2 }),
  [CODES.cryptOfTheSepulchralLamp]: catacomb({
    id: CODES.cryptOfTheSepulchralLamp,
    name: 'Crypt of the Sepulchral Lamp',
    shroud: 2,
    clues: 2,
  }),
  [CODES.boneFilledCaverns]: catacomb({
    id: CODES.boneFilledCaverns,
    name: 'Bone-Filled Caverns',
    shroud: 3,
    clues: 2,
    victory: 1,
  }),
  [CODES.wellOfSouls]: catacomb({
    id: CODES.wellOfSouls,
    name: 'Well of Souls',
    shroud: 4,
    clues: 1,
    victory: 1,
  }),
  [CODES.candlelitTunnels]: catacomb({
    id: CODES.candlelitTunnels,
    name: 'Candlelit Tunnels',
    shroud: 3,
    clues: 2,
  }),
  [CODES.labyrinthOfBones]: catacomb({
    id: CODES.labyrinthOfBones,
    name: 'Labyrinth of Bones',
    shroud: 2,
    clues: 2,
  }),
  [CODES.narrowShaft]: catacomb({
    id: CODES.narrowShaft,
    name: 'Narrow Shaft',
    shroud: 2,
    clues: 1,
    victory: 1,
  }),
  [CODES.shiveringPools]: catacomb({
    id: CODES.shiveringPools,
    name: 'Shivering Pools',
    shroud: 5,
    clues: 1,
    victory: 1,
  }),
  [CODES.blockedPassage]: catacomb({
    id: CODES.blockedPassage,
    name: 'Blocked Passage',
    shroud: 7,
  }),
  [CODES.tombOfShadows]: catacomb({
    id: CODES.tombOfShadows,
    name: 'Tomb of Shadows',
    shroud: 4,
    clues: 2,
    victory: 1,
  }),
}
/** Segunda copia de un Lugar: mismo comportamiento e imagen, otro id. */
const second = (code: string): LocationCard => ({ ...locationCards[code]!, id: `${code}~2` })

export const specterOfDeath: EnemyCard = enemy({
  code: CODES.specterOfDeath,
  name: 'Specter of Death',
  traits: ['Monster', 'Geist', 'Elite'],
  fight: 3,
  health: 5,
  healthPerInvestigator: true,
  evade: 3,
  damage: 2,
  horror: 2,
  keywords: ['hunter', 'retaliate'],
  victory: 2,
})

export const catacombsDocent: EnemyCard = enemy({
  code: CODES.catacombsDocent,
  name: 'Catacombs Docent',
  traits: ['Humanoid', 'Lunatic'],
  fight: 3,
  health: 2,
  evade: 2,
  damage: 0,
  horror: 1,
  keywords: [],
})

export const corpseDweller: EnemyCard = enemy({
  code: CODES.corpseDweller,
  name: 'Corpse Dweller',
  traits: ['Monster'],
  fight: 3,
  health: 5,
  evade: 4,
  damage: 2,
  horror: 1,
  keywords: ['hunter', 'retaliate'],
})

const haruko = VIPS.find((v) => v.key === 'Haruko')!.enemy

const card = (code: string, name: string, traits: string[]) =>
  treachery({ code, name, traits, keywords: [] })

/** Conjunto La máscara pálida: sus cartas de Encuentro. */
const pallidSet: EncounterCard[] = [
  ...copies(catacombsDocent, 3),
  ...copies(corpseDweller, 3),
  ...copies(card(CODES.eyesInTheWalls, 'Eyes in the Walls', ['Terror']), 3),
  ...copies(card(CODES.theShadowBehindYou, 'The Shadow Behind You', ['Terror']), 3),
  ...copies(card(CODES.thePitBelow, 'The Pit Below', ['Hazard']), 3),
]

/** Despertaron en las catacumbas (Introducción 1). */
const awokeInside = (log: ScenarioContext['log'] | undefined) =>
  hasNote(log, 'carcosaGazeOfThePhantom') || hasNote(log, 'carcosaUnableToFindNigel')

/** Guía ES p. 22, "Preparación". */
export function thePallidMask({
  difficulty,
  seed = 0,
  log,
}: Pick<ScenarioContext, 'difficulty'> & {
  seed?: number
  players?: number
  log?: ScenarioContext['log']
}): ScenarioDefinition {
  let rng = seedRng(seed)
  const mix = <T>(items: T[]): T[] => {
    const [shuffled, next] = shuffle(items, rng)
    rng = next
    return shuffled
  }
  const others = [
    locationCards[CODES.theGateToHell]!,
    locationCards[CODES.stoneArchways]!,
    second(CODES.stoneArchways),
    locationCards[CODES.cryptOfTheSepulchralLamp]!,
    locationCards[CODES.boneFilledCaverns]!,
    locationCards[CODES.wellOfSouls]!,
    locationCards[CODES.candlelitTunnels]!,
    second(CODES.candlelitTunnels),
    locationCards[CODES.labyrinthOfBones]!,
    second(CODES.labyrinthOfBones),
    locationCards[CODES.narrowShaft]!,
    locationCards[CODES.shiveringPools]!,
  ]
  const awoke = awokeInside(log)
  // Despertaron dentro: un Lugar al azar (ni la Tumba ni el Pasadizo); si no, la Puerta.
  const pool = mix(others)
  const start = awoke ? pool[0]! : locationCards[CODES.theGateToHell]!
  const rest = pool.filter((l) => l.id !== start.id)
  // Las 5 de abajo: la Tumba, el Pasadizo y otras 3, barajadas; el resto encima.
  const bottom = mix([
    locationCards[CODES.tombOfShadows]!,
    locationCards[CODES.blockedPassage]!,
    ...rest.slice(0, 3),
  ])
  const deck = [...rest.slice(3), ...bottom]
  const harukoInfo = hasNote(log, 'carcosaInterviewedHaruko')
  return {
    id: THE_PALLID_MASK,
    intro: [
      {
        title: 'story.pallid.introTitle',
        body: awoke ? 'story.pallid.intro1' : 'story.pallid.intro2',
        effects: [noteEffect(awoke ? 'carcosaAwokeInTheCatacombs' : 'carcosaEnteredTheCatacombs')],
      },
      ...(harukoInfo ? [{ title: 'story.pallid.harukoTitle', body: 'story.pallid.haruko' }] : []),
    ],
    setupInstructions: { title: 'story.pallid.setupTitle', body: 'story.pallid.setup' },
    locations: [{ ...start, position: [0, 0] }],
    setAsideLocations: deck,
    startingLocation: start.id,
    agendas: [
      { code: CODES.empireOfTheDead, name: 'Empire of the Dead', doomThreshold: 6 },
      { code: CODES.empireOfTheUndead, name: 'Empire of the Undead', doomThreshold: 12 },
    ],
    acts: [
      {
        code: CODES.throughTheCatacombs,
        name: 'Through the Catacombs',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: CODES.thePathIsBarred,
        name: 'The Path is Barred',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
        cluesAtLocation: CODES.tombOfShadows,
      },
      {
        code: CODES.theWayOut,
        name: 'The Way Out',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: CODES.leadingTheWay,
        name: 'Leading the Way',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...pallidSet,
      ...ENCOUNTER_SETS.ghouls,
      ...ENCOUNTER_SETS.hauntings,
      ...ENCOUNTER_SETS.chillingCold,
    ],
    setAside: [{ ...specterOfDeath }, { ...haruko }],
    chaosBag: [...CARCOSA_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      specific('pallidSetup', {
        start: start.id,
        deck: deck.map((l) => l.id).join(','),
        awoke,
      }),
      ...(harukoInfo ? [specific('pallidSecretPassage')] : []),
    ],
  }
}

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

function specific(key: string, data: Record<string, string | number | boolean> = {}): Message {
  return { type: 'ScenarioSpecific', key, data }
}

const entry = storyEntries('pallid')
const hard = (state: GameState) => state.difficulty === 'hard' || state.difficulty === 'expert'
const actCode = (state: GameState) => state.acts[state.actIndex]?.code
const push = (state: GameState, ...messages: Message[]): GameState => ({
  ...state,
  queue: [...messages, ...state.queue],
})
const players = (state: GameState) => state.investigators.length
const startOf = (state: GameState) => {
  const start = state.scenarioMeta?.[START]
  return typeof start === 'string' ? start : null
}
const isCode = (id: string, code: string) => printedCode(id) === code
const findLocation = (state: GameState, code: string) =>
  Object.keys(state.locations).find((id) => isCode(id, code)) ?? null

/** Lugar en una posición de la cuadrícula (o null). */
function at(state: GameState, x: number, y: number): LocationId | null {
  return (
    Object.values(state.locations).find((l) => l.position?.[0] === x && l.position?.[1] === y)
      ?.id ?? null
  )
}

/** Lugares adyacentes (arriba, abajo, izquierda y derecha) en la cuadrícula. */
export function adjacent(state: GameState, id: LocationId): LocationId[] {
  const position = state.locations[id]?.position
  if (!position) return []
  return Object.values(STEP).flatMap(([dx, dy]) => {
    const found = at(state, position[0] + dx, position[1] + dy)
    return found ? [found] : []
  })
}

/** El jefe elige entre varias opciones; con una sola, se resuelve sin preguntar. */
function leadChooses(state: GameState, prompt: string, choices: Choice[]): Message[] {
  if (choices.length === 0) return []
  if (choices.length === 1) return choices[0]!.then
  const lead = leadInvestigator(state) ?? state.investigators[0]
  if (!lead) return []
  return [{ type: 'Ask', investigator: lead.id, question: { kind: 'chooseOne', prompt, choices } }]
}

const locationChoice = (state: GameState, id: LocationId, then: Message[]): Choice => {
  const l = state.locations[id]
  return {
    label: 'choice.location',
    params: { location: l ? (l.revealed ? l.name : (l.unrevealedName ?? l.name)) : id },
    target: { type: 'location', id },
    then,
  }
}

/** Pone en juego la carta superior del mazo de Catacumbas en esa posición. */
function placeTop(state: GameState, x: number, y: number): GameState {
  const deck = state.scenarioDecks?.[DECK] ?? []
  const [top, ...rest] = deck
  if (!top || at(state, x, y)) return state
  const card = state.setAsideLocations[top]
  if (!card) return state
  return push(
    {
      ...state,
      scenarioDecks: { ...state.scenarioDecks, [DECK]: rest },
      setAsideLocations: { ...state.setAsideLocations, [top]: { ...card, position: [x, y] } },
    },
    { type: 'PutLocationIntoPlay', location: top },
  )
}

/** Sitios libres en esas direcciones desde un Lugar. */
function freeSpots(state: GameState, id: LocationId, dirs: Direction[]): [number, number][] {
  const position = state.locations[id]?.position
  if (!position) return []
  return dirs
    .map((d): [number, number] => [position[0] + STEP[d][0], position[1] + STEP[d][1]])
    .filter(([x, y]) => !at(state, x, y))
}

/** Lugares sin revelar que aún pueden mirarse (Túneles iluminados por velas, Guía). */
const lookChoices = (state: GameState, investigator: InvestigatorId): Message[] =>
  leadChooses(
    state,
    'prompt.pallid.look',
    Object.values(state.locations)
      .filter((l) => !l.revealed)
      .map((l) =>
        locationChoice(state, l.id, [specific('pallidLook', { investigator, location: l.id })]),
      ),
  ).map((m) => (m.type === 'Ask' ? { ...m, investigator } : m))

/** Distancia (en Lugares) desde el Lugar inicial. */
function fromStart(state: GameState, location: LocationId | null): number {
  const start = startOf(state)
  if (!start || location === null || !state.locations[start]) return 0
  return distancesFrom(state, start).get(location) ?? 0
}

/** Lo desafié: el Lugar más alejado de La puerta al Infierno. */
function farthestFromGate(state: GameState): LocationId[] {
  const gate = findLocation(state, CODES.theGateToHell)
  if (!gate) return []
  const distances = distancesFrom(state, gate)
  const ids = Object.keys(state.locations).filter((id) => id !== gate && distances.has(id))
  if (!ids.length) return []
  const best = Math.max(...ids.map((id) => distances.get(id)!))
  return ids.filter((id) => distances.get(id) === best)
}

/** Ghoul o Geist. */
const ghoulOrGeist = (traits: string[] | undefined) =>
  (traits ?? []).some((t) => t === 'Ghoul' || t === 'Geist')

// ---------------------------------------------------------------------------
// Resoluciones (guía ES p. 24)
// ---------------------------------------------------------------------------

const NEXT = 'story.carcosa.blackStarsRise'

function resolutionMessages(state: GameState, outcome: ScenarioOutcome): Message[] {
  const number = outcome.type === 'resolution' ? outcome.resolution : 0
  if (![0, 1, 2].includes(number)) throw new Error('Invalid The Pallid Mask resolution')
  const token = (['elderThing', 'cultist', 'tablet'] as const)[number]!
  const slain = state.victoryDisplay.includes(haruko.code)
  const key = number === 0 ? 'noResolution' : `resolution${number}`
  return [
    {
      type: 'Story',
      entry: entry(key, [
        noteEffect('carcosaKnowTheSiteOfTheGate'),
        ...(number === 0 ? [{ key: 'story.pallid.readActII' }] : []),
        ...(number === 2 ? [{ key: 'story.pallid.chasingMarks' }] : []),
        ...(slain ? [noteEffect('carcosaSlainHaruko')] : []),
        { key: 'story.effect.experience', params: { bonus: 0 } },
        { key: `story.pallid.tokens.${token}` },
        { key: 'story.effect.proceed', params: { scenario: NEXT } },
      ]),
    },
    recordNote('carcosaKnowTheSiteOfTheGate'),
    ...(number === 2 ? [markCarcosa('chasing', 2)] : []),
    ...(slain ? [recordNote('carcosaSlainHaruko')] : []),
    earnExperience(0, true),
    replaceSymbolTokens(token, token),
    ...(number === 0 ? [specific('pallidReadActII', { readers: '' })] : []),
    endScenario(number === 0 ? outcome : resolution(number)),
  ]
}

/** Debilidades básicas Locura o Pacto del catálogo (para quien lea el acto II). */
const madnessOrPact = () =>
  allPlayerCardDefs()
    .filter(
      (d) =>
        d.weakness === 'basicweakness' && d.traits.some((t) => t === 'Madness' || t === 'Pact'),
    )
    .map((d) => d.code)
    .sort()

// ---------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------

registerScenario({
  id: THE_PALLID_MASK,
  resolution: resolutionMessages,
  tokenEffect: (state, token, investigator) => {
    const me = getInvestigator(state, investigator)
    switch (token) {
      case 'skull': {
        // -X: Lugares de distancia al Lugar inicial (máximo 5 en Fácil/Normal).
        const distance = fromStart(state, me.location)
        return { modifier: -(hard(state) ? distance : Math.min(5, distance)) }
      }
      case 'cultist':
        // Durante un ataque con éxito: 1 daño menos (Difícil: ninguno).
        return {
          modifier: hard(state) ? -3 : -2,
          ...(state.skillTest?.kind.type === 'fight'
            ? {
                onSuccess: [
                  hard(state)
                    ? { type: 'AdjustAttackDamage', none: true }
                    : { type: 'AdjustAttackDamage', amount: -1 },
                ] as Message[],
              }
            : {}),
        }
      case 'tablet':
        return {
          modifier: hard(state) ? -3 : -2,
          immediate: [specific('pallidTablet', { investigator })],
        }
      case 'elderThing':
        return {
          modifier: hard(state) ? -4 : -3,
          onFail: [specific('pallidFindGhoul', { investigator })],
        }
    }
    return { modifier: 0 }
  },
  // Cada Lugar está conectado con los adyacentes.
  connections: (state, l) => adjacent(state, l.id),
  // Cripta de la lámpara sepulcral: se investiga con [willpower].
  investigateSkill: (_state, location) =>
    isCode(location, CODES.cryptOfTheSepulchralLamp) ? 'willpower' : null,
  // Caverna llena de huesos: mientras la investigas, tienes 1 ranura de mano menos.
  slotModifier: (state, investigator, slot) => {
    const test = state.skillTest
    return slot === 'hand' &&
      test?.investigator === investigator &&
      test.kind.type === 'investigate' &&
      isCode(test.kind.location, CODES.boneFilledCaverns)
      ? -1
      : 0
  },
  cannotLeave: (state, investigator) =>
    state.scenarioMeta?.[`${STUCK}${investigator}`] === state.round,
  // Catacumbas sin revelar: los investigadores de tu Lugar deben gastar 1 pista por
  // investigador, en grupo (salvo junto a unas Arcadas de piedra reveladas).
  canEnter: (state, investigator, from, to) => {
    const target = state.locations[to]
    // Colocarse al empezar no es entrar desde otro Lugar.
    if (from === null || !target || target.revealed || !entryCostApplies(state, to)) return true
    return cluesAt(state, from) >= players(state)
  },
  beforeMove: (state, move) => {
    const mover = getInvestigator(state, move.investigator)
    const target = state.locations[move.location]
    if (!target || target.revealed || mover.location === null) return null
    const checked = { ...move, checked: true }
    // Túnel angosto: al ir a moverte a un Lugar sin revelar, [agility] (3).
    if (isCode(mover.location, CODES.narrowShaft))
      return [
        effectTest(move.investigator, 'Narrow Shaft', 'agility', 3, {
          onSuccess: [
            specific('pallidEnter', { investigator: move.investigator, location: move.location }),
          ],
          onFail: [damage(move.investigator, 1)],
        }),
      ]
    if (!entryCostApplies(state, move.location)) return null
    return [checked, ...payEntry(state, mover.location)]
  },
  forced: (state, trigger) => {
    // Pozo de las almas y Estanques gélidos: tras terminar tu turno allí.
    if (trigger.type === 'turnEnds') {
      const here = getInvestigator(state, trigger.investigator).location
      const who = trigger.investigator
      if (here && isCode(here, CODES.wellOfSouls))
        return [
          {
            type: 'Ask',
            investigator: who,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEffect',
              choices: [
                {
                  label: 'choice.pallid.directHorror',
                  then: [
                    { type: 'TakeDamage', investigator: who, damage: 0, horror: 1, direct: true },
                  ],
                },
                {
                  label: 'choice.pallid.discardRandom',
                  then: [{ type: 'DiscardRandomFromHand', investigator: who, amount: 2 }],
                },
              ],
            },
          },
        ]
      if (here && isCode(here, CODES.shiveringPools))
        return [
          {
            type: 'Ask',
            investigator: who,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEffect',
              choices: [
                {
                  label: 'choice.pallid.directDamage',
                  then: [
                    { type: 'TakeDamage', investigator: who, damage: 1, horror: 0, direct: true },
                  ],
                },
                {
                  label: 'choice.pallid.loseResources',
                  then: [{ type: 'LoseResources', investigator: who, amount: 5 }],
                },
              ],
            },
          },
        ]
    }
    // La salida de allí: al final de la ronda, se descarta el Lugar más alejado de la Puerta.
    if (trigger.type === 'roundEnds' && actCode(state) === CODES.theWayOut)
      return [specific('pallidCollapse')]
    // El camino está bloqueado: si El hombre de la máscara pálida es derrotado, avanza.
    if (
      trigger.type === 'enemyDefeated' &&
      trigger.enemy.code === THE_MAN_IN_THE_PALLID_MASK &&
      actCode(state) === CODES.thePathIsBarred
    )
      return [
        { type: 'SetScenarioMeta', key: MAN_DEFEATED, value: 1 },
        { type: 'AdvanceAct', paid: true },
      ]
    return []
  },
  specific: (state, key, data) => {
    const common = carcosaSpecific(state, key, data) ?? encounterSpecific(state, key, data)
    if (common) return common
    const investigator = typeof data.investigator === 'string' ? data.investigator : null
    switch (key) {
      case 'pallidSetup': {
        // Lugar inicial, mazo de Catacumbas y El hombre de la máscara pálida apartado.
        const bearer = state.investigators.find((i) =>
          [...i.deck, ...i.hand, ...i.discard].includes(THE_MAN_IN_THE_PALLID_MASK),
        )
        const strip = (cards: string[]) => {
          const index = cards.indexOf(THE_MAN_IN_THE_PALLID_MASK)
          return index < 0 ? cards : cards.filter((_, n) => n !== index)
        }
        const awoke = data.awoke === true
        return push(
          {
            ...state,
            scenarioMeta: { ...state.scenarioMeta, [START]: String(data.start) },
            scenarioDecks: { ...state.scenarioDecks, [DECK]: String(data.deck).split(',') },
            investigators: state.investigators.map((i) =>
              i.id === bearer?.id
                ? { ...i, deck: strip(i.deck), hand: strip(i.hand), discard: strip(i.discard) }
                : i,
            ),
            setAside: bearer ? [...state.setAside, { ...theManInThePallidMask }] : state.setAside,
            ...(bearer
              ? {
                  scenarioMeta: {
                    ...state.scenarioMeta,
                    [START]: String(data.start),
                    [BEARER]: bearer.id,
                  },
                }
              : {}),
          },
          recordNote(awoke ? 'carcosaAwokeInTheCatacombs' : 'carcosaEnteredTheCatacombs'),
          // El Lugar inicial ya se reveló al empezar allí: su Forzado coloca las Catacumbas.
          specific('pallidPlace', { location: String(data.start) }),
        )
      }
      case 'pallidSecretPassage': {
        // Información de Haruko: se revela una Catacumba adyacente al Lugar inicial.
        const start = startOf(state)
        if (!start) return state
        const options = adjacent(state, start).filter((id) => !state.locations[id]?.revealed)
        return push(
          { ...state, scenarioMeta: { ...state.scenarioMeta, [SECRET_PASSAGE]: 1 } },
          ...leadChooses(
            state,
            'prompt.pallid.secretPassage',
            options.map((id) =>
              locationChoice(state, id, [{ type: 'RevealLocation', location: id }]),
            ),
          ),
        )
      }
      case 'pallidPlace': {
        // Forzado al revelarse: pone en juego Catacumbas en los sitios libres indicados.
        const from = String(data.location)
        const placement = PLACEMENTS[printedCode(from)]
        if (!placement) return state
        const spots = freeSpots(state, from, placement.dirs)
        if (!placement.one) return spots.reduce((next, [x, y]) => placeTop(next, x, y), state)
        if (spots.length <= 1) return spots[0] ? placeTop(state, ...spots[0]) : state
        return push(
          state,
          ...leadChooses(
            state,
            'prompt.pallid.placeWhere',
            spots.map(([x, y]) => ({
              label: `choice.pallid.place.${placement.dirs.find(
                (d) =>
                  state.locations[from]!.position![0] + STEP[d][0] === x &&
                  state.locations[from]!.position![1] + STEP[d][1] === y,
              )!}`,
              then: [specific('pallidPlaceAt', { x, y })],
            })),
          ),
        )
      }
      case 'pallidPlaceAt':
        return placeTop(state, Number(data.x), Number(data.y))
      case 'pallidEnter': {
        // Túnel angosto superado: el movimiento sigue (con el coste de entrar, si lo hay).
        if (investigator === null) return state
        const to = String(data.location)
        const here = getInvestigator(state, investigator).location
        if (here === null) return state
        const move: Message = { type: 'MoveTo', investigator, location: to, checked: true }
        if (!entryCostApplies(state, to)) return push(state, move)
        if (cluesAt(state, here) < players(state)) return state
        return push(state, move, ...payEntry(state, here))
      }
      case 'pallidLook': {
        const location = state.locations[String(data.location)]
        if (!location || investigator === null) return state
        return {
          ...state,
          log: [
            ...state.log,
            {
              key: 'log.pallid.looked',
              round: state.round,
              params: { name: getInvestigator(state, investigator).name, location: location.name },
            },
          ],
        }
      }
      case 'pallidLookChoice':
        return investigator ? push(state, ...lookChoices(state, investigator)) : state
      case 'pallidTablet': {
        // Un Gul o Geist (preparado, en Fácil/Normal) de tu Lugar te ataca.
        if (investigator === null) return state
        const here = getInvestigator(state, investigator).location
        const attackers = Object.values(state.enemies).filter(
          (e) => e.location === here && ghoulOrGeist(e.traits) && (hard(state) || !e.exhausted),
        )
        const attack = (id: string): Message[] => [
          ...(hard(state) ? [{ type: 'ReadyEnemy', enemy: id } as Message] : []),
          { type: 'EnemyAttack', enemy: id, investigator, exhaustAfter: false },
        ]
        if (attackers.length <= 1)
          return push(state, ...(attackers[0] ? attack(attackers[0].id) : []))
        return push(state, {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEnemy',
            choices: attackers.map((e) => ({
              label: 'choice.enemy',
              params: { enemy: e.name },
              target: { type: 'enemy', id: e.id },
              then: attack(e.id),
            })),
          },
        })
      }
      case 'pallidFindGhoul': {
        // Busca un Gul o Geist en el mazo de Encuentros y los descartes, y róbalo.
        if (investigator === null) return state
        const matches = (c: EncounterCard) => c.kind === 'enemy' && ghoulOrGeist(c.traits)
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
        const inDiscard = state.encounterDiscard.findIndex(matches)
        if (inDiscard < 0) return state
        return push(
          {
            ...state,
            encounterDiscard: state.encounterDiscard.filter((_, n) => n !== inDiscard),
          },
          { type: 'ResolveEncounterCard', investigator, card: state.encounterDiscard[inDiscard]! },
        )
      }
      case 'pallidCollapse': {
        // La salida de allí: el Lugar más alejado de la Puerta se descarta.
        const options = farthestFromGate(state)
        return push(
          state,
          ...leadChooses(
            state,
            'prompt.pallid.collapse',
            options.map((id) =>
              locationChoice(state, id, [specific('pallidDiscardLocation', { location: id })]),
            ),
          ),
        )
      }
      case 'pallidDiscardLocation': {
        const id = String(data.location)
        const location = state.locations[id]
        if (!location) return state
        const inside = activeInvestigators(state).filter((i) => i.location === id)
        const enemies = Object.values(state.enemies).filter((e) => e.location === id)
        const remove: Message[] = [
          { type: 'RemoveLocation', location: id },
          { type: 'RevealLocation', location: findLocation(state, CODES.theGateToHell) ?? id },
        ]
        const exits = location.connections.filter((c) => state.locations[c])
        if ((!inside.length && !enemies.length) || !exits.length) return push(state, ...remove)
        const moveAll = (to: LocationId): Message[] => [
          ...inside.flatMap((i): Message[] => [
            { type: 'MoveTo', investigator: i.id, location: to, checked: true, entryPaid: true },
            damage(i.id, 2),
          ]),
          ...enemies.flatMap((e): Message[] => [
            { type: 'MoveEnemy', enemy: e.id, location: to },
            { type: 'DamageEnemy', enemy: e.id, amount: 2 } as Message,
          ]),
          ...remove,
        ]
        return push(
          state,
          ...leadChooses(
            state,
            'prompt.pallid.collapseMove',
            exits.map((to) => locationChoice(state, to, moveAll(to))),
          ),
        )
      }
      case 'pallidLeadingTheWay':
        // Se avanzó gastando pistas: el siguiente acto es Marcando el camino.
        return { ...state, acts: state.acts.filter((a) => a.code !== CODES.theWayOut) }
      case 'pallidReadActII': {
        // Sin resolución: al menos un investigador lee el segundo acto de El Rey de Amarillo.
        const readers = String(data.readers ?? '')
          .split(',')
          .filter(Boolean)
        const lead = leadInvestigator(state) ?? state.investigators[0]
        if (!lead) return state
        const left = state.investigators.filter((i) => !readers.includes(i.id))
        const read = (id: string) =>
          specific('pallidReadActII', { readers: [...readers, id].join(',') })
        if (!left.length) return push(state, ...readActII(state, readers))
        return push(state, {
          type: 'Ask',
          investigator: lead.id,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.pallid.readActII',
            choices: [
              ...left.map((i): Choice => ({
                label: 'choice.pallid.reads',
                params: { name: i.name },
                then: [read(i.id)],
              })),
              ...(readers.length
                ? [{ label: 'choice.pallid.doneReading', then: readActII(state, readers) }]
                : []),
            ],
          },
        })
      }
    }
    return state
  },
})

/** Los lectores del acto II: +2 de experiencia y una Debilidad Locura o Pacto al azar. */
function readActII(state: GameState, readers: string[]): Message[] {
  const pool = madnessOrPact()
  let rng = state.rng
  return [
    recordNote('carcosaReadActII', readers.map((id) => getInvestigator(state, id).name).join(', ')),
    ...readers.flatMap((id): Message[] => {
      const [n, next] = nextInt(rng, Math.max(1, pool.length))
      rng = next
      return [
        { type: 'EarnExperience', amount: 2, investigator: id },
        ...(pool.length
          ? [{ type: 'AddStoryAsset', investigator: id, code: pool[n]! } as Message]
          : []),
      ]
    }),
  ]
}

/** Pistas de los investigadores de un Lugar. */
function cluesAt(state: GameState, location: LocationId | null): number {
  return activeInvestigators(state)
    .filter((i) => i.location === location)
    .reduce((sum, i) => sum + i.clues, 0)
}

/** Las Arcadas de piedra reveladas anulan el texto sin revelar de sus adyacentes. */
function entryCostApplies(state: GameState, to: LocationId): boolean {
  return !adjacent(state, to).some(
    (id) => isCode(id, CODES.stoneArchways) && state.locations[id]?.revealed,
  )
}

/** Pagan los investigadores del Lugar de origen (decide el jefe cuánto pone cada uno). */
function payEntry(state: GameState, from: LocationId): Message[] {
  return [
    {
      type: 'PayGroupClues',
      amount: players(state),
      from: activeInvestigators(state)
        .filter((i) => i.location === from)
        .map((i) => i.id),
    },
  ]
}

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

registerAgenda({
  code: CODES.empireOfTheDead,
  // Reverso: el Espectro de la muerte aparece en el Lugar inicial.
  onAdvance: (state) => {
    const start = startOf(state)
    return start && state.locations[start]
      ? [{ type: 'SpawnSetAsideEnemy', code: CODES.specterOfDeath, location: start }]
      : []
  },
})

registerAgenda({
  code: CODES.empireOfTheUndead,
  // Reverso "Uníos a ellos en la muerte": cada investigador es derrotado y sufre 1 trauma
  // físico.
  onAdvance: (state) =>
    activeInvestigators(state).flatMap((i): Message[] => [
      { type: 'SufferTrauma', physical: 1, investigator: i.id },
      { type: 'DefeatInvestigator', investigator: i.id },
    ]),
})

// ---------------------------------------------------------------------------
// Actos
// ---------------------------------------------------------------------------

registerAct({
  code: CODES.throughTheCatacombs,
  objectiveMet: () => false,
  // Reverso: El hombre de la máscara pálida aparece en la Tumba de sombras (con +1 de salud
  // por investigador mientras está allí) y Ishimaru Haruko en el Lugar inicial.
  onAdvance: (state) => {
    const tomb = findLocation(state, CODES.tombOfShadows)
    const start = startOf(state)
    const man = state.setAside.find((c) => c.code === THE_MAN_IN_THE_PALLID_MASK)
    return [
      ...(man && tomb
        ? [
            {
              type: 'SpawnEnemy',
              card: { ...(man as EnemyCard), health: (man as EnemyCard).health + players(state) },
              location: tomb,
              engageWith: null,
              ...(typeof state.scenarioMeta?.[BEARER] === 'string'
                ? { owner: state.scenarioMeta[BEARER] as string }
                : {}),
            } as Message,
          ]
        : []),
      ...(!hasNote(state.campaignLog, 'carcosaSlainHaruko') && start && state.locations[start]
        ? [{ type: 'SpawnSetAsideEnemy', code: haruko.code, location: start } as Message]
        : []),
    ]
  },
})

registerAct({
  code: CODES.thePathIsBarred,
  // Reverso: derrotado → 2 Convicciones y La salida de allí; con pistas → 2 Dudas y
  // Marcando el camino. El hombre de la máscara pálida sale del juego.
  onAdvance: (state) => {
    const defeated = state.scenarioMeta?.[MAN_DEFEATED] === 1
    const man = Object.values(state.enemies).find((e) => e.code === THE_MAN_IN_THE_PALLID_MASK)
    return [
      markCarcosa(defeated ? 'conviction' : 'doubt', 2),
      ...(man ? [{ type: 'RemoveEnemyFromGame', enemy: man.id } as Message] : []),
      ...(defeated ? [] : [specific('pallidLeadingTheWay')]),
    ]
  },
})

const allAt = (state: GameState, code: string) => {
  const target = findLocation(state, code)
  const active = activeInvestigators(state)
  return !!target && active.length > 0 && active.every((i) => i.location === target)
}

registerAct({
  code: CODES.theWayOut,
  objectiveMet: (state) => allAt(state, CODES.theGateToHell),
  onAdvance: () => [{ type: 'EndScenario', outcome: resolution(1) }],
})

registerAct({
  code: CODES.leadingTheWay,
  objectiveMet: (state) => allAt(state, CODES.blockedPassage),
  onAdvance: () => [{ type: 'EndScenario', outcome: resolution(2) }],
})

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

for (const code of Object.keys(PLACEMENTS))
  registerLocation({
    code,
    onReveal: (_state, self) => [specific('pallidPlace', { location: self.id })],
    ...(code === CODES.candlelitTunnels
      ? {
          // [action]: [intellect] (3); si tienes éxito, mira el lado revelado de unas
          // Catacumbas (límite de grupo una vez por partida).
          abilities: (state: GameState, self: { id: string }, investigator: InvestigatorId) =>
            Object.values(state.locations).some((l) => !l.revealed)
              ? [
                  {
                    key: `${CODES.candlelitTunnels}:sign`,
                    label: 'ability.pallid.readSign',
                    actions: 1,
                    provokes: true,
                    limit: { per: 'game' as const, group: true },
                    then: [
                      effectTest(investigator, 'Candlelit Tunnels', 'intellect', 3, {
                        onSuccess: [specific('pallidLookChoice', { investigator })],
                      }),
                    ],
                  },
                ]
              : [],
        }
      : {}),
  })

registerLocation({
  code: CODES.tombOfShadows,
  // Forzado: al revelarse, avanza al reverso del acto 1.
  onReveal: (state) =>
    actCode(state) === CODES.throughTheCatacombs ? [{ type: 'AdvanceAct', paid: true }] : [],
})

registerLocation({
  code: CODES.blockedPassage,
  // Forzado: al revelarlo, 2 daño y no puedes salir esta ronda (salvo en Marcando el camino).
  onReveal: (state, self) =>
    actCode(state) === CODES.leadingTheWay
      ? []
      : activeInvestigators(state)
          .filter((i) => i.location === self.id)
          .flatMap((i): Message[] => [
            damage(i.id, 2),
            { type: 'SetScenarioMeta', key: `${STUCK}${i.id}`, value: state.round },
          ]),
})

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.specterOfDeath,
  // Agotado, recibe 1 daño menos de cada ataque.
  damageTaken: (_state, self, amount, source) => ({
    amount: self.exhausted && source.attack ? Math.max(0, amount - 1) : amount,
  }),
  // Forzado: tras fallar una prueba al intentar evitarlo, te ataca.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.kind === 'evade' &&
    !trigger.succeeded &&
    trigger.enemy === self.id
      ? [
          {
            type: 'EnemyAttack',
            enemy: self.id,
            investigator: trigger.investigator,
            exhaustAfter: false,
          },
        ]
      : [],
})

registerEnemy({
  code: CODES.catacombsDocent,
  // Aparición: el Lugar sin revelar más cercano.
  spawn: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    const unrevealed = Object.values(state.locations)
      .filter((l) => !l.revealed)
      .map((l) => l.id)
    if (here === null || !unrevealed.length) return unrevealed
    const distances = distancesFrom(state, here)
    const best = Math.min(...unrevealed.map((id) => distances.get(id) ?? Infinity))
    return unrevealed.filter((id) => (distances.get(id) ?? Infinity) === best)
  },
  // [action]: Negociar. [intellect] (4): mira el lado revelado de unas Catacumbas (límite de
  // grupo una vez por partida).
  abilities: (state, self, investigator) =>
    getInvestigator(state, investigator).location === self.location &&
    Object.values(state.locations).some((l) => !l.revealed)
      ? [
          {
            key: `${CODES.catacombsDocent}:parley`,
            label: 'ability.pallid.docent',
            actions: 1,
            provokes: true,
            parley: true,
            limit: { per: 'game', group: true },
            target: { type: 'enemy', id: self.id },
            then: [
              effectTest(investigator, 'Catacombs Docent', 'intellect', 4, {
                onSuccess: [specific('pallidLookChoice', { investigator })],
              }),
            ],
          },
        ]
      : [],
})

const humanoids = (state: GameState) =>
  Object.values(state.enemies).filter((e) => (e.traits ?? []).includes('Humanoid'))

registerEnemy({
  code: CODES.corpseDweller,
  // Aparición: donde haya un enemigo Humanoide (que se descarta); si no hay, se descarta y
  // gana oleada.
  spawn: (state) => [...new Set(humanoids(state).map((e) => e.location))],
  surge: (state) => humanoids(state).length === 0,
  forced: (state, trigger, self) => {
    if (trigger.type !== 'enemySpawned' || trigger.enemy !== self.id) return []
    const victims = humanoids(state).filter((e) => e.location === self.location && e.id !== self.id)
    return leadChooses(
      state,
      'prompt.chooseEnemy',
      victims.map((e) => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [{ type: 'DiscardEnemy', enemy: e.id } as Message],
      })),
    )
  },
})

// ---------------------------------------------------------------------------
// Traiciones de La máscara pálida
// ---------------------------------------------------------------------------

registerTreachery({
  code: CODES.eyesInTheWalls,
  // [willpower] (3): 1 horror por cada punto de fallo.
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Eyes in the Walls', 'willpower', 3, {
      onFailEach: [damage(investigator, 0, 1)],
    }),
  ],
})

registerTreachery({
  code: CODES.theShadowBehindYou,
  // A tu zona de amenaza (límite 1 por investigador).
  revelation: (state, investigator, self) =>
    Object.values(state.treacheries).some(
      (t) =>
        t.id !== self.id &&
        t.code === CODES.theShadowBehindYou &&
        t.placement.type === 'threatArea' &&
        t.placement.investigator === investigator,
    )
      ? []
      : [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'threatArea', investigator },
          },
        ],
  // [action]: Miras detrás de ti.
  abilities: (state, self, investigator) =>
    self.placement.type === 'threatArea' && self.placement.investigator === investigator
      ? [
          {
            key: `${self.id}:look`,
            label: 'ability.pallid.lookBehind',
            actions: 1,
            provokes: true,
            then: [{ type: 'SetScenarioMeta', key: `${LOOKED}${self.id}`, value: state.round }],
          },
        ]
      : [],
  // Forzado: al final de tu turno, si no has mirado: descarta tus recursos o tu mano, y
  // luego se descarta.
  forced: (state, trigger, self) => {
    if (
      trigger.type !== 'turnEnds' ||
      self.placement.type !== 'threatArea' ||
      self.placement.investigator !== trigger.investigator ||
      state.scenarioMeta?.[`${LOOKED}${self.id}`] === state.round
    )
      return []
    const who = trigger.investigator
    const me = getInvestigator(state, who)
    return [
      {
        type: 'Ask',
        investigator: who,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEffect',
          choices: [
            {
              label: 'choice.pallid.discardResources',
              then: [{ type: 'LoseResources', investigator: who, amount: me.resources }],
            },
            {
              label: 'choice.pallid.discardHand',
              then: [{ type: 'DiscardRandomFromHand', investigator: who, amount: me.hand.length }],
            },
          ],
        },
      },
      { type: 'DiscardTreachery', treachery: self.id },
    ]
  },
})

registerTreachery({
  code: CODES.thePitBelow,
  // Se une a tu Lugar si no hay otra (si la hay, se descarta y gana oleada): +1 velo.
  revelation: (state, investigator, self) => {
    const here = getInvestigator(state, investigator).location
    const taken = Object.values(state.treacheries).some(
      (t) =>
        t.id !== self.id &&
        t.code === CODES.thePitBelow &&
        t.placement.type === 'location' &&
        t.placement.location === here,
    )
    if (taken || here === null) return [{ type: 'GainSurge' }]
    return [
      {
        type: 'PlaceTreachery',
        treachery: self.id,
        placement: { type: 'location', location: here },
      },
    ]
  },
  shroudModifier: 1,
  // Forzado: al final de la ronda, 3 daño a cada investigador allí y se descarta.
  forced: (state, trigger, self) =>
    trigger.type === 'roundEnds' && self.placement.type === 'location'
      ? [
          ...activeInvestigators(state)
            .filter(
              (i) => self.placement.type === 'location' && i.location === self.placement.location,
            )
            .map((i) => damage(i.id, 3)),
          { type: 'DiscardTreachery', treachery: self.id },
        ]
      : [],
})
