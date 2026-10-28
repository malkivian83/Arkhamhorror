/**
 * Escenario VIII de El camino a Carcosa: "Penumbrosa Carcosa" (03316–03342) y el epílogo.
 * Guía de campaña revisada ES, pp. 28–32.
 *
 * Los Lugares no tienen lado sin revelar: su reverso es una carta de Historia que se
 * resuelve al darles la vuelta con el acto 3. Hastur tiene tres versiones según la del
 * acto 2; El Rey de Amarillo está en juego junto al acto, sin Lugar (se representa como
 * una carta de Historia con su daño). Los investigadores no son derrotados por el horror.
 */
import {
  activeInvestigators,
  effectiveVitals,
  getInvestigator,
  leadInvestigator,
  nextInt,
  nextStepToward,
  playerCardDef,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerPlayerCard,
  registerPlayerCards,
  registerScenario,
  registerTreachery,
  seedRng,
  shuffle,
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
import {
  byakheeStat,
  ENCOUNTER_SETS,
  encounterSpecific,
  kingsEdictFight,
  loseAction,
  SETS,
} from './encounter-sets'
import { carcosaBelief, carcosaCount, carcosaSpecific, hasNote } from './log'
import { THE_MAN_IN_THE_PALLID_MASK, theManInThePallidMask } from './the-man-in-the-pallid-mask'

export const DIM_CARCOSA = 'dim-carcosa'

export const CODES = {
  scenario: '03316',
  madnessCoils: '03317',
  madnessDrowns: '03318',
  madnessDies: '03319',
  inLostCarcosa: '03320',
  searchV1: '03321a',
  thePallidMask: '03321b',
  searchV2: '03322a',
  searchV3: '03323a',
  theKingInTatters: '03324',
  shoresOfHali: '03325a',
  bleakPlainsStars: '03326a',
  bleakPlainsDesolation: '03326c',
  ruinsInhabitant: '03327a',
  ruinsMomentsRest: '03327c',
  ruinsCoffin: '03327e',
  dimStreetsMapping: '03328a',
  dimStreetsParade: '03328c',
  dimStreetsArchway: '03328e',
  depthsHeight: '03329a',
  depthsSteps: '03329c',
  darkSpires: '03330',
  palaceOfTheKing: '03331',
  hasturKingInYellow: '03332',
  hasturLordOfCarcosa: '03333',
  hasturTatteredKing: '03334',
  creatureOutOfDemhe: '03335',
  wingedOne: '03336',
  dismalCurse: '03337',
  realmOfMadness: '03338',
  theFinalAct: '03339',
  possessionTraitorous: '03340',
  possessionTorturous: '03341',
  possessionMurderous: '03342',
} as const

const BEARER = 'carcosa:strangerBearer'
const NO_FLIP = 'carcosa:noFlip:'
const KNOW_SECRET = 'carcosa:knowTheSecret'
const DEFEATED = 'carcosa:hasturDefeated'
const FAINTED = 'carcosa:fainted'
const COILS = 'carcosa:coilsTried'
const BEFORE = 'carcosa:horrorBefore:'
export const POSSESSIONS: string[] = [
  CODES.possessionTraitorous,
  CODES.possessionTorturous,
  CODES.possessionMurderous,
]

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

type Place = Omit<LocationCard, 'connections' | 'clueValue' | 'cluesPerInvestigator'> & {
  clues: number
}
const place = ({ clues, ...card }: Place): LocationCard => ({
  ...card,
  clueValue: clues,
  cluesPerInvestigator: true,
  connections: [],
})

/** Lugares por nombre: copias, velo, pistas, símbolo y conexiones (de la referencia). */
const KINDS = {
  shores: {
    name: 'Shores of Hali',
    ids: [CODES.shoresOfHali],
    shroud: 3,
    clues: 2,
    symbol: 'circle',
    connectsTo: ['square'],
    position: [1, 4],
  },
  bleak: {
    name: 'Bleak Plains',
    ids: [CODES.bleakPlainsStars, CODES.bleakPlainsDesolation],
    shroud: 4,
    clues: 1,
    symbol: 'square',
    connectsTo: ['circle', 'triangle', 'diamond'],
    position: [1, 3],
  },
  ruins: {
    name: 'Ruins of Carcosa',
    ids: [CODES.ruinsInhabitant, CODES.ruinsMomentsRest, CODES.ruinsCoffin],
    shroud: 2,
    clues: 1,
    symbol: 'triangle',
    connectsTo: ['square', 'equals', 'star'],
    position: [2, 2],
  },
  streets: {
    name: 'Dim Streets',
    ids: [CODES.dimStreetsMapping, CODES.dimStreetsParade, CODES.dimStreetsArchway],
    shroud: 2,
    clues: 1,
    symbol: 'diamond',
    connectsTo: ['square', 'equals', 'star'],
    position: [0, 2],
  },
  depths: {
    name: 'Depths of Demhe',
    ids: [CODES.depthsHeight, CODES.depthsSteps],
    shroud: 4,
    clues: 1,
    symbol: 'equals',
    connectsTo: ['moon', 'triangle', 'diamond'],
    position: [1, 1],
  },
  spires: {
    name: 'Dark Spires',
    ids: [CODES.darkSpires],
    shroud: 3,
    clues: 2,
    symbol: 'moon',
    connectsTo: ['equals'],
    position: [1, 0],
  },
  palace: {
    name: 'Palace of the King',
    ids: [CODES.palaceOfTheKing],
    shroud: 2,
    clues: 3,
    symbol: 'star',
    connectsTo: ['triangle', 'diamond'],
    position: [1, 2],
  },
} as const
type Kind = keyof typeof KINDS

export const locationCards: Record<string, LocationCard> = Object.fromEntries(
  Object.values(KINDS).flatMap((k) =>
    k.ids.map((id) => [
      id,
      place({
        id,
        name: k.name,
        shroud: k.shroud,
        clues: k.clues,
        symbol: k.symbol,
        connectsTo: [...k.connectsTo],
        position: [...k.position],
      }),
    ]),
  ),
)
const kindOf = (id: string): Kind | null =>
  (Object.keys(KINDS) as Kind[]).find((k) => (KINDS[k].ids as readonly string[]).includes(id)) ??
  null

/** Carta de Historia del reverso de cada Lugar. */
export const STORY_OF: Record<string, string> = {
  [CODES.shoresOfHali]: '03325b',
  [CODES.bleakPlainsStars]: '03326b',
  [CODES.bleakPlainsDesolation]: '03326d',
  [CODES.ruinsInhabitant]: '03327b',
  [CODES.ruinsMomentsRest]: '03327d',
  [CODES.ruinsCoffin]: '03327f',
  [CODES.dimStreetsMapping]: '03328b',
  [CODES.dimStreetsParade]: '03328d',
  [CODES.dimStreetsArchway]: '03328f',
  [CODES.depthsHeight]: '03329b',
  [CODES.depthsSteps]: '03329d',
  [CODES.darkSpires]: '03330b',
  [CODES.palaceOfTheKing]: '03331b',
}
const STORY_NAMES: Record<string, string> = {
  '03325b': 'Songs That the Hyades Shall Sing',
  '03326b': 'Stars of Aldebaran',
  '03326d': 'Bleak Desolation',
  '03327b': 'Inhabitant of Carcosa',
  '03327d': "A Moment's Rest",
  '03327f': 'The Coffin',
  '03328b': 'Mapping the Streets',
  '03328d': "The King's Parade",
  '03328f': 'The Archway',
  '03329b': 'The Height of the Depths',
  '03329d': 'Steps of the Palace',
  '03330b': 'The Fall',
  '03331b': "Hastur's End",
}

const hastur = (
  code: string,
  subname: string,
  stats: { fight: number; evade: number; health: number; horror: number },
  keywords: EnemyCard['keywords'],
): EnemyCard =>
  enemy({
    code,
    name: `Hastur (${subname})`,
    traits: ['Ancient One', 'Elite'],
    ...stats,
    healthPerInvestigator: true,
    damage: 0,
    keywords,
    prey: { type: 'mostRemainingSanity' },
  })
export const hasturLordOfCarcosa = hastur(
  CODES.hasturLordOfCarcosa,
  'Lord of Carcosa',
  { fight: 3, evade: 3, health: 9, horror: 2 },
  ['hunter', 'massive'],
)
export const hasturTatteredKing = hastur(
  CODES.hasturTatteredKing,
  'The Tattered King',
  { fight: 3, evade: 2, health: 8, horror: 4 },
  ['hunter'],
)
/** El Rey de Amarillo: combate 4, salud 7 por investigador, 2 de horror. */
const KING = { fight: 4, health: 7, horror: 2 }

export const creatureOutOfDemhe: EnemyCard = enemy({
  code: CODES.creatureOutOfDemhe,
  name: 'Creature Out of Demhe',
  traits: ['Monster'],
  fight: 5,
  health: 4,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: ['massive'],
})

export const wingedOne: EnemyCard = enemy({
  code: CODES.wingedOne,
  name: 'Winged One',
  traits: ['Monster', 'Byakhee'],
  fight: 3,
  health: 3,
  evade: 4,
  damage: 3,
  horror: 1,
  keywords: ['retaliate'],
})

const card = (code: string, name: string, traits: string[], keywords: string[] = []) =>
  treachery({ code, name, traits, keywords: keywords as never })

/** Conjunto Penumbrosa Carcosa: sus cartas de Encuentro. */
const dimCarcosaSet: EncounterCard[] = [
  { ...creatureOutOfDemhe },
  { ...wingedOne },
  ...copies(card(CODES.dismalCurse, 'Dismal Curse', ['Curse', 'Terror']), 3),
  ...copies(card(CODES.realmOfMadness, 'Realm of Madness', ['Terror']), 2),
  card(CODES.theFinalAct, 'The Final Act', ['Terror'], ['surge']),
  card(
    CODES.possessionTraitorous,
    'Possession (Traitorous)',
    ['Hex', 'Terror'],
    ['peril', 'hidden'],
  ),
  card(CODES.possessionTorturous, 'Possession (Torturous)', ['Hex', 'Terror'], ['peril', 'hidden']),
  card(CODES.possessionMurderous, 'Possession (Murderous)', ['Hex', 'Terror'], ['peril', 'hidden']),
]

/** La máscara pálida (03321b): apoyo de Historia del investigador jefe (acto 2, v. I). */
registerPlayerCards([
  {
    code: CODES.thePallidMask,
    name: 'The Pallid Mask',
    type: 'asset',
    class: 'neutral',
    traits: ['Item', 'Relic'],
    story: true,
  },
])
registerPlayerCard({ code: CODES.thePallidMask, ownerVitals: { sanity: -2 } })

type Version = 1 | 2 | 3
const ACT2_CODES: string[] = [CODES.searchV1, CODES.searchV2, CODES.searchV3]
const ACT2: Record<Version, { code: string; name: string }> = {
  1: { code: CODES.searchV1, name: 'Search For the Stranger (v.I)' },
  2: { code: CODES.searchV2, name: 'Search For the Stranger (v.II)' },
  3: { code: CODES.searchV3, name: 'Search For the Stranger (v.III)' },
}
/** Versión del acto 2 por las Dudas y Convicciones (empate con 6 o más: se elige). */
export function act2Version(log: ScenarioContext['log'] | undefined): Version | 'choose' {
  const doubt = carcosaCount(log, 'doubt')
  const conviction = carcosaCount(log, 'conviction')
  if (doubt + conviction <= 5) return 1
  if (doubt > conviction) return 2
  if (conviction > doubt) return 3
  return 'choose'
}
const act2 = (version: Version) => ({
  ...ACT2[version],
  clueThreshold: 0,
  cluesPerInvestigator: false,
  advanceTiming: 'objective' as const,
})

/** Guía ES p. 28, "Preparación". */
export function dimCarcosa({
  difficulty,
  seed = 0,
  log,
}: Pick<ScenarioContext, 'difficulty'> & {
  seed?: number
  log?: ScenarioContext['log']
}): ScenarioDefinition {
  let rng = seedRng(seed)
  const mix = <T>(items: readonly T[]): T[] => {
    const [shuffled, next] = shuffle([...items], rng)
    rng = next
    return shuffled
  }
  // Una copia al azar de cada Lugar con varias versiones; el resto, aparte.
  const chosen: string[] = []
  const aside: string[] = []
  for (const kind of ['bleak', 'ruins', 'streets', 'depths'] as const) {
    const [first, ...rest] = mix(KINDS[kind].ids)
    chosen.push(first!)
    aside.push(...rest)
  }
  const below = hasNote(log, 'carcosaOpenedThePathBelow')
  const version = act2Version(log)
  const tallies = carcosaCount(log, 'chasing')
  const doom = tallies <= 2 ? 3 : tallies <= 5 ? 2 : tallies <= 8 ? 1 : 0
  return {
    id: DIM_CARCOSA,
    intro: [
      {
        title: 'story.dim.introTitle',
        body: below ? 'story.dim.intro1' : 'story.dim.intro2',
      },
    ],
    setupInstructions: { title: 'story.dim.setupTitle', body: 'story.dim.setup' },
    locations: [CODES.shoresOfHali, CODES.darkSpires, CODES.palaceOfTheKing, ...chosen].map(
      (id) => ({ ...locationCards[id]! }),
    ),
    setAsideLocations: aside.map((id) => ({ ...locationCards[id]! })),
    startingLocation: below ? CODES.shoresOfHali : CODES.darkSpires,
    agendas: [
      { code: CODES.madnessCoils, name: 'Madness Coils', doomThreshold: 7 },
      { code: CODES.madnessDrowns, name: 'Madness Drowns', doomThreshold: 7 },
      { code: CODES.madnessDies, name: 'Madness Dies', doomThreshold: 9 },
    ],
    acts: [
      {
        code: CODES.inLostCarcosa,
        name: 'In Lost Carcosa',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      act2(version === 'choose' ? 2 : version),
      {
        code: CODES.theKingInTatters,
        name: 'The King in Tatters',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...dimCarcosaSet,
      ...ENCOUNTER_SETS.delusions,
      ...ENCOUNTER_SETS.cultOfTheYellowSign,
      ...ENCOUNTER_SETS.inhabitantsOfCarcosa.filter((c) => c.code !== SETS.beastOfAldebaran),
      ...ENCOUNTER_SETS.agentsOfHastur,
      ...ENCOUNTER_SETS.strikingFear,
    ],
    setAside: [
      { ...hasturLordOfCarcosa },
      { ...hasturTatteredKing },
      ...ENCOUNTER_SETS.inhabitantsOfCarcosa.filter((c) => c.code === SETS.beastOfAldebaran),
    ],
    chaosBag: [...CARCOSA_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      ...(version === 'choose' ? [specific('dimChooseAct2')] : []),
      specific('dimSetup', { doom }),
    ],
  }
}

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

function specific(key: string, data: Record<string, string | number | boolean> = {}): Message {
  return { type: 'ScenarioSpecific', key, data }
}

const entry = storyEntries('dim')
const hard = (state: GameState) => state.difficulty === 'hard' || state.difficulty === 'expert'
const push = (state: GameState, ...messages: Message[]): GameState => ({
  ...state,
  queue: [...messages, ...state.queue],
})
const players = (state: GameState) => state.startingInvestigatorCount
const actCode = (state: GameState) => state.acts[state.actIndex]?.code
const agendaCode = (state: GameState) => state.agendas[state.agendaIndex]?.code
const meta = (state: GameState, key: string) => state.scenarioMeta?.[key]
const setMeta = (key: string, value: string | number): Message => ({
  type: 'SetScenarioMeta',
  key,
  value,
})

/** Cordura restante (0 si tiene más horror que cordura). */
export function remainingSanity(state: GameState, investigator: InvestigatorId): number {
  const me = getInvestigator(state, investigator)
  return Math.max(0, effectiveVitals(state, me).sanity - me.horror)
}
/** Más del doble de horror que de cordura (Posesión, Maldición funesta). */
const overwhelmed = (state: GameState, investigator: InvestigatorId) => {
  const me = getInvestigator(state, investigator)
  return me.horror > 2 * effectiveVitals(state, me).sanity
}

const HASTURS: string[] = [CODES.hasturLordOfCarcosa, CODES.hasturTatteredKing]
const hasturEnemy = (state: GameState): Enemy | undefined =>
  Object.values(state.enemies).find((e) => HASTURS.includes(e.code))
const kingInYellow = (state: GameState) => state.stories?.[CODES.hasturKingInYellow]
const hasturInPlay = (state: GameState) => !!hasturEnemy(state) || !!kingInYellow(state)
/** Daño sobre Hastur, en cualquiera de sus versiones. */
export function hasturDamage(state: GameState): number {
  return hasturEnemy(state)?.damageTaken ?? kingInYellow(state)?.damage ?? 0
}
const isHastur = (e: Enemy) => HASTURS.includes(e.code)
/** +1/+2 de combate a Hastur por el plan 2 o 3. */
const agendaFight = (state: GameState) =>
  agendaCode(state) === CODES.madnessDrowns ? 1 : agendaCode(state) === CODES.madnessDies ? 2 : 0
/** Hastur solo puede ser derrotado en el plan 3 y si un investigador "conoce el secreto". */
const canDefeatHastur = (state: GameState) =>
  agendaCode(state) === CODES.madnessDies && meta(state, KNOW_SECRET) === 1

function damageHastur(state: GameState, amount: number): Message[] {
  const enemy = hasturEnemy(state)
  if (enemy) return [{ type: 'DamageEnemy', enemy: enemy.id, amount }]
  return kingInYellow(state) ? [specific('dimKingDamage', { amount })] : []
}
function exhaustHastur(state: GameState): Message[] {
  const enemy = hasturEnemy(state)
  if (enemy) return [{ type: 'EvadeEnemy', enemy: enemy.id }]
  return kingInYellow(state) ? [specific('dimKingExhaust')] : []
}
const healEach = (state: GameState, horror: number): Message[] =>
  activeInvestigators(state).map((i): Message => ({
    type: 'Heal',
    investigator: i.id,
    damage: 0,
    horror,
  }))

/** El jefe elige entre varias opciones; con una sola, se resuelve sin preguntar. */
function leadChooses(state: GameState, prompt: string, choices: Choice[]): Message[] {
  if (choices.length === 0) return []
  if (choices.length === 1) return choices[0]!.then
  const lead = leadInvestigator(state) ?? state.investigators[0]
  if (!lead) return []
  return [{ type: 'Ask', investigator: lead.id, question: { kind: 'chooseOne', prompt, choices } }]
}

/** Se puede dar la vuelta a este Lugar (El palacio del Rey: 5 de daño por investigador). */
export function canFlip(state: GameState, location: LocationId): boolean {
  if (!state.locations[location] || !STORY_OF[location]) return false
  if (meta(state, `${NO_FLIP}${location}`) === 1) return false
  if (location === CODES.palaceOfTheKing) return hasturDamage(state) >= 5 * players(state)
  return true
}

/** Investigadores con al menos una Posesión en la mano. */
const possessed = (state: GameState) =>
  state.investigators.filter((i) =>
    Object.values(state.treacheries).some(
      (t) =>
        POSSESSIONS.includes(t.code) &&
        t.placement.type === 'threatArea' &&
        t.placement.investigator === i.id,
    ),
  )

// ---------------------------------------------------------------------------
// Resoluciones y epílogo (guía ES pp. 30–32)
// ---------------------------------------------------------------------------

const BONUS: Record<number, string> = { 1: 'self', 2: 'truth', 3: 'truth' }

function resolutionMessages(state: GameState, outcome: ScenarioOutcome): Message[] {
  const number =
    outcome.type === 'resolution'
      ? outcome.resolution
      : carcosaBelief(state.campaignLog) === 'doubt'
        ? 5
        : 4
  if (![1, 2, 3, 4, 5].includes(number)) throw new Error('Invalid Dim Carcosa resolution')
  if (number >= 4) {
    const note = number === 4 ? 'carcosaRealmsMerged' : 'carcosaHasturHasYou'
    return [
      ...(outcome.type === 'noResolution'
        ? [{ type: 'Story', entry: entry('noResolution') } as Message]
        : []),
      {
        type: 'Story',
        entry: entry(`resolution${number}`, [noteEffect(note), { key: 'story.dim.allInsane' }]),
      },
      recordNote(note),
      // Guía ES p. 31: los investigadores pierden la campaña.
      recordNote('campaignLost'),
      { type: 'DriveDefeatedInsane', all: true },
      endScenario(resolution(number)),
    ]
  }
  const names = possessed(state).map((i) => i.name)
  const trauma =
    number === 1
      ? { physical: 2, mental: 2 }
      : number === 2
        ? { physical: 0, mental: 2 }
        : { physical: 2, mental: 0 }
  return [
    {
      type: 'Story',
      entry: entry(`resolution${number}`, [
        noteEffect('carcosaPreventedHastur'),
        ...(names.length ? [noteEffect('carcosaPossessed')] : []),
        { key: `story.dim.trauma${number}` },
        { key: 'story.effect.experience', params: { bonus: 5 } },
        { key: `story.dim.bonus.${BONUS[number]}` },
        { key: 'story.dim.won' },
      ]),
    },
    recordNote('carcosaPreventedHastur'),
    ...(names.length ? [recordNote('carcosaPossessed', names.join(', '))] : []),
    ...state.investigators.map((i): Message => ({
      type: 'SufferTrauma',
      investigator: i.id,
      ...trauma,
    })),
    earnExperience(5, true),
    // Epílogo: solo si ganan; si alguien fue poseído, solo lo leen ellos.
    {
      type: 'Story',
      entry: {
        title: 'story.dim.epilogueTitle',
        body: 'story.dim.epilogue',
        effects: [{ key: names.length ? 'story.dim.epiloguePossessed' : 'story.dim.epilogueAll' }],
      },
    },
    endScenario(resolution(number)),
  ]
}

// ---------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------

const flipped = (state: GameState, location: LocationId, permanent: boolean): Message[] =>
  permanent ? [setMeta(`${NO_FLIP}${location}`, 1)] : []

/** Efecto de la carta de Historia del reverso de un Lugar. */
function storyEffect(
  state: GameState,
  investigator: InvestigatorId,
  location: LocationId,
): Message[] {
  const p = players(state)
  const replace = specific('dimReplace', { location })
  switch (STORY_OF[location]) {
    case '03325b':
    case '03329d':
      // Canciones que cantarán las Híades, Escalones del palacio.
      return [...damageHastur(state, p), ...exhaustHastur(state), ...flipped(state, location, true)]
    case '03326b': {
      // Estrellas de Aldebarán: cada investigador cura 3 horror; 4 daño a otro enemigo.
      const others = Object.values(state.enemies).filter((e) => !isHastur(e))
      return [
        ...healEach(state, 3),
        ...leadChooses(
          state,
          'prompt.chooseEnemy',
          others.map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [{ type: 'DamageEnemy', enemy: e.id, amount: 4 } as Message],
          })),
        ),
        replace,
      ]
    }
    case '03326d':
      return [...damageHastur(state, 2 * p), ...flipped(state, location, true)]
    case '03327b':
      return [...healEach(state, 3), replace]
    case '03327d': {
      // Un momento de descanso: agota y desenfrenta a un enemigo, o cura 5 horror.
      const enemies = Object.values(state.enemies)
      const exhaust: Choice[] = enemies.map((e) => ({
        label: 'choice.dim.exhaustEnemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [{ type: 'EvadeEnemy', enemy: e.id } as Message],
      }))
      if (kingInYellow(state))
        exhaust.push({ label: 'choice.dim.exhaustKing', then: [specific('dimKingExhaust')] })
      return [
        {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEffect',
            choices: [
              ...exhaust,
              {
                label: 'choice.dim.healHorror',
                params: { amount: 5 },
                then: [{ type: 'Heal', investigator, damage: 0, horror: 5 }],
              },
            ],
          },
        },
        replace,
      ]
    }
    case '03327f':
      return [...damageHastur(state, p), ...flipped(state, location, true)]
    case '03328b':
      // Cartografiar las calles: [intellect] (3), 1 horror por punto de fallo; 1 daño por
      // investigador a Hastur igualmente.
      return [
        effectTest(investigator, 'Mapping the Streets', 'intellect', 3, {
          onFailEach: [damage(investigator, 0, 1)],
        }),
        ...damageHastur(state, p),
        ...flipped(state, location, true),
      ]
    case '03328d':
      return [
        effectTest(investigator, "The King's Parade", 'combat', 2, {
          onSuccess: exhaustHastur(state),
        }),
        replace,
      ]
    case '03328f':
      return [
        effectTest(investigator, 'The Archway', 'willpower', 1, {
          onSuccessEach: [{ type: 'Heal', investigator, damage: 0, horror: 1 }],
        }),
        replace,
      ]
    case '03329b':
      return [...healEach(state, 5), replace]
    case '03330b':
      // La caída: no te atreves (se puede volver a dar la vuelta) o la empujas.
      return [
        {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEffect',
            choices: [
              { label: 'choice.dim.cannot', then: [] },
              {
                label: 'choice.dim.push',
                then: [
                  damage(investigator, 0, 2),
                  ...damageHastur(state, 2 * p),
                  ...flipped(state, location, true),
                ],
              },
            ],
          },
        },
      ]
    case '03331b':
      // El final de Hastur: "conocéis el secreto".
      return [setMeta(KNOW_SECRET, 1), ...flipped(state, location, true)]
  }
  return []
}

/** Fichas convertidas en fallo automático contra Hastur sin cordura restante. */
const TO_AUTOFAIL = new Set<unknown>(['elderSign', 1, 0, -1])

registerScenario({
  id: DIM_CARCOSA,
  resolution: resolutionMessages,
  noHorrorDefeat: true,
  tokenEffect: (state, token, investigator) => {
    const me = getInvestigator(state, investigator)
    const test = state.skillTest
    switch (token) {
      case 'skull':
        return {
          modifier: hard(state) ? -me.horror : remainingSanity(state, investigator) === 0 ? -4 : -2,
        }
      case 'cultist':
        return {
          modifier: 0,
          revealAnother: true,
          onFail: [damage(investigator, 0, hard(state) ? 2 : 1)],
        }
      case 'tablet':
        return {
          modifier: hard(state) ? -5 : -3,
          onFail: [specific('dimTablet', { investigator })],
        }
      case 'elderThing': {
        const target =
          test?.kind.type === 'fight' || test?.kind.type === 'evade'
            ? state.enemies[test.kind.enemy]
            : undefined
        const monster = (target?.traits ?? []).some((t) => t === 'Monster' || t === 'Ancient One')
        return {
          modifier: hard(state) ? -5 : -3,
          ...(monster ? { immediate: [loseAction(state, investigator)] } : {}),
        }
      }
    }
    return { modifier: 0 }
  },
  // Hastur (Señor de Carcosa, El Rey Andrajoso): sin cordura restante, [elder_sign], +1, 0
  // y -1 cuentan como [auto_fail] al atacarlo o evitarlo.
  tokenOverride: (state, token, investigator) => {
    const test = state.skillTest
    if (!test || (test.kind.type !== 'fight' && test.kind.type !== 'evade')) return null
    const target = state.enemies[test.kind.enemy]
    if (!target || !isHastur(target) || !TO_AUTOFAIL.has(token)) return null
    return remainingSanity(state, investigator) === 0 ? { modifier: 0, autoFail: true } : null
  },
  enemyStat: (state, e, stat) =>
    kingsEdictFight(state, e, stat) +
    byakheeStat(state, e) +
    (stat === 'fight' && isHastur(e) ? agendaFight(state) : 0),
  // Hastur no puede ser derrotado (salvo en el plan 3 con el secreto); El hombre de la
  // máscara pálida, según la versión del acto 2.
  enemyWouldBeDefeated: (state, e) => {
    if (isHastur(e)) return canDefeatHastur(state) ? null : []
    if (e.code !== THE_MAN_IN_THE_PALLID_MASK) return null
    const code = actCode(state)
    if (code === CODES.searchV3) return [{ type: 'AdvanceAct', paid: true }]
    if (code === CODES.searchV1 || code === CODES.searchV2) return []
    return null
  },
  // Acto 2: los investigadores no pueden descubrir pistas.
  cannotDiscoverClues: (state) => ACT2_CODES.includes(actCode(state) ?? ''),
  // Llanuras inhóspitas: sin Aliados; Profundidades de Demhe: sin cartas Rápido.
  cannotPlay: (state, investigator, code) => {
    const here = getInvestigator(state, investigator).location
    const def = playerCardDef(code)
    if (!here || !def) return false
    if (kindOf(here) === 'bleak') return def.type === 'asset' && def.traits.includes('Ally')
    if (kindOf(here) === 'depths') return !!def.fast
    return false
  },
  // El Rey de Amarillo: [action] [willpower] (X = su combate) para agotarlo.
  abilities: (state, _self, investigator) => {
    const king = kingInYellow(state)
    if (!king || king.exhausted) return []
    return [
      {
        key: `${CODES.hasturKingInYellow}:exhaust`,
        label: 'ability.dim.exhaustKing',
        params: { difficulty: KING.fight + agendaFight(state) },
        actions: 1,
        provokes: true,
        then: [
          effectTest(investigator, 'Hastur', 'willpower', KING.fight + agendaFight(state), {
            onSuccess: [specific('dimKingExhaust')],
          }),
        ],
      },
    ]
  },
  forced: (state, trigger) => {
    // Ruinas de Carcosa (1 daño) y Calles penumbrosas (pierdes 1 acción): última pista.
    if (trigger.type === 'afterDiscoverClues' && trigger.last) {
      const kind = kindOf(trigger.location)
      if (kind === 'ruins') return [damage(trigger.investigator, 1)]
      if (kind === 'streets') return [loseAction(state, trigger.investigator)]
    }
    // Planes 1 y 2: avanzan con 3 o 5 de daño por investigador sobre Hastur.
    if (
      trigger.type === 'afterEnemyDamaged' &&
      state.enemies[trigger.enemy] &&
      isHastur(state.enemies[trigger.enemy]!)
    )
      return [specific('dimCheckAgenda')]
    // Hastur derrotado: el acto 3 avanza según su versión.
    if (trigger.type === 'enemyDefeated' && isHastur(trigger.enemy))
      return [setMeta(DEFEATED, trigger.enemy.code)]
    // Hastur: si su ataque te inflige horror por encima de tu cordura, 1 daño más.
    if (
      trigger.type === 'whenEnemyAttacks' &&
      state.enemies[trigger.enemy] &&
      isHastur(state.enemies[trigger.enemy]!)
    )
      return [
        setMeta(
          `${BEFORE}${trigger.investigator}`,
          getInvestigator(state, trigger.investigator).horror,
        ),
      ]
    if (
      trigger.type === 'afterEnemyAttack' &&
      state.enemies[trigger.enemy] &&
      isHastur(state.enemies[trigger.enemy]!)
    )
      return [specific('dimExcess', { investigator: trigger.investigator })]
    // El Rey de Amarillo: al empezar la fase de Enemigos, si está preparado, ataca a todos.
    if (
      trigger.type === 'enemyPhaseBegins' &&
      kingInYellow(state) &&
      !kingInYellow(state)!.exhausted
    )
      return activeInvestigators(state).map((i) =>
        specific('dimKingAttack', { investigator: i.id }),
      )
    // Se prepara con los enemigos, al final de la ronda.
    if (trigger.type === 'roundEnds' && kingInYellow(state)?.exhausted)
      return [specific('dimKingReady')]
    // Posesión: con más del doble de horror que de cordura, eliminado y muerto.
    if (trigger.type === 'afterTakeDamage')
      return [specific('dimPossessionCheck', { investigator: trigger.investigator })]
    return []
  },
  specific: (state, key, data) => {
    const common = carcosaSpecific(state, key, data) ?? encounterSpecific(state, key, data)
    if (common) return common
    const investigator = typeof data.investigator === 'string' ? data.investigator : null
    switch (key) {
      case 'dimChooseAct2':
        // Empate con 6 o más Dudas y Convicciones: el jefe elige la versión II o III.
        return push(
          state,
          ...leadChooses(state, 'prompt.dim.act2', [
            { label: 'choice.dim.act2', params: { version: 'II' }, then: [] },
            {
              label: 'choice.dim.act2',
              params: { version: 'III' },
              then: [specific('dimUseAct2', { version: 3 })],
            },
          ]),
        )
      case 'dimUseAct2':
        return {
          ...state,
          acts: state.acts.map((a, n) => (n === 1 ? act2(Number(data.version) as Version) : a)),
        }
      case 'dimSetup': {
        // El hombre de la máscara pálida sale del mazo de su portador y queda aparte.
        const bearer = state.investigators.find((i) =>
          [...i.deck, ...i.hand, ...i.discard].includes(THE_MAN_IN_THE_PALLID_MASK),
        )
        const strip = (cards: string[]) => {
          const index = cards.indexOf(THE_MAN_IN_THE_PALLID_MASK)
          return index < 0 ? cards : cards.filter((_, n) => n !== index)
        }
        const doom = Number(data.doom)
        return push(
          {
            ...state,
            investigators: state.investigators.map((i) =>
              i.id === bearer?.id
                ? { ...i, deck: strip(i.deck), hand: strip(i.hand), discard: strip(i.discard) }
                : i,
            ),
            setAside: [...state.setAside, { ...theManInThePallidMask }],
            scenarioMeta: {
              ...state.scenarioMeta,
              ...(bearer ? { [BEARER]: bearer.id } : {}),
            },
          },
          // Los Lugares entran con su lado revelado y sus pistas.
          ...Object.values(state.locations)
            .filter((l) => !l.revealed)
            .map((l): Message => ({ type: 'RevealLocation', location: l.id })),
          ...(doom ? [{ type: 'PlaceDoom', amount: doom } as Message] : []),
          // Horror directo igual a la mitad de la cordura (no puede derrotar).
          ...state.investigators.map((i): Message => ({
            type: 'TakeDamage',
            investigator: i.id,
            damage: 0,
            horror: Math.floor(effectiveVitals(state, i).sanity / 2),
            direct: true,
          })),
        )
      }
      case 'dimTablet':
        // Si fallas y Hastur está en juego, 1 pista en tu Lugar (de la reserva).
        if (!investigator || !hasturInPlay(state)) return state
        return push(state, {
          type: 'MoveClues',
          from: { type: 'pool' },
          to: { type: 'location', id: getInvestigator(state, investigator).location ?? '' },
          amount: 1,
        })
      case 'dimManAbility': {
        // Acto 2 (v. II): derrotarlo con su capacidad hace avanzar el acto.
        return actCode(state) === CODES.searchV2
          ? push(state, { type: 'AdvanceAct', paid: true })
          : state
      }
      case 'dimKingEnters':
        // Hastur (El Rey de Amarillo): en juego junto al acto, sin Lugar.
        return {
          ...state,
          stories: {
            ...state.stories,
            [CODES.hasturKingInYellow]: {
              code: CODES.hasturKingInYellow,
              name: 'Hastur (The King in Yellow)',
              clues: 0,
              damage: 0,
              health: KING.health * players(state),
              exhausted: false,
            },
          },
        }
      case 'dimKingDamage': {
        const king = kingInYellow(state)
        if (!king) return state
        const total = (king.damage ?? 0) + Number(data.amount)
        const next: GameState = {
          ...state,
          stories: { ...state.stories, [king.code]: { ...king, damage: total } },
        }
        if (total >= (king.health ?? Infinity) && canDefeatHastur(state))
          return push(
            {
              ...next,
              stories: Object.fromEntries(
                Object.entries(next.stories ?? {}).filter(([code]) => code !== king.code),
              ),
              scenarioMeta: { ...next.scenarioMeta, [DEFEATED]: king.code },
            },
            { type: 'CheckActObjective' },
          )
        return push(next, specific('dimCheckAgenda'))
      }
      case 'dimKingExhaust':
      case 'dimKingReady': {
        const king = kingInYellow(state)
        if (!king) return state
        return {
          ...state,
          stories: {
            ...state.stories,
            [king.code]: { ...king, exhausted: key === 'dimKingExhaust' },
          },
        }
      }
      case 'dimKingAttack':
        // El Rey de Amarillo ataca: 2 horror; si supera tu cordura, 1 daño más.
        if (!investigator) return state
        return push(
          state,
          setMeta(`${BEFORE}${investigator}`, getInvestigator(state, investigator).horror),
          {
            type: 'AttackWithoutLocation',
            investigator,
            card: enemy({
              code: CODES.hasturKingInYellow,
              name: 'Hastur',
              traits: ['Ancient One', 'Elite'],
              fight: KING.fight,
              health: KING.health,
              evade: 0,
              damage: 0,
              horror: KING.horror,
              keywords: [],
            }),
          },
          specific('dimExcess', { investigator }),
        )
      case 'dimExcess': {
        if (!investigator) return state
        const me = getInvestigator(state, investigator)
        const before = Number(meta(state, `${BEFORE}${investigator}`) ?? me.horror)
        return me.horror > before && me.horror > effectiveVitals(state, me).sanity
          ? push(state, damage(investigator, 1))
          : state
      }
      case 'dimCheckAgenda': {
        const amount = hasturDamage(state)
        const code = agendaCode(state)
        if (
          (code === CODES.madnessCoils && amount >= 3 * players(state)) ||
          (code === CODES.madnessDrowns && amount >= 5 * players(state))
        )
          return push(state, { type: 'AdvanceAgenda' }, specific('dimCheckAgenda'))
        return state
      }
      case 'dimCoils': {
        // Reverso del plan 1: elegir cómo salir del trance.
        const tried = String(meta(state, COILS) ?? '')
          .split(',')
          .filter(Boolean)
        const test = (skill: 'willpower' | 'intellect'): Choice => ({
          label: `choice.dim.coils.${skill}`,
          then: leadChooses(
            state,
            'prompt.dim.whoTests',
            activeInvestigators(state).map((i) => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [
                effectTest(i.id, 'Madness Coils', skill, 4, {
                  onFail: [setMeta(COILS, [...tried, skill].join(',')), specific('dimCoils')],
                }),
              ],
            })),
          ),
        })
        return push(
          state,
          ...leadChooses(state, 'prompt.dim.coils', [
            ...(tried.includes('willpower') ? [] : [test('willpower')]),
            ...(tried.includes('intellect') ? [] : [test('intellect')]),
            {
              label: 'choice.dim.coils.horror',
              then: activeInvestigators(state).map((i) => damage(i.id, 0, 2)),
            },
            { label: 'choice.dim.coils.faint', then: [setMeta(FAINTED, 1)] },
          ]),
        )
      }
      case 'dimShuffleDiscard': {
        const [encounterDeck, rng] = shuffle(
          [...state.encounterDeck, ...state.encounterDiscard],
          state.rng,
        )
        return { ...state, rng, encounterDeck, encounterDiscard: [] }
      }
      case 'dimFlip': {
        // Acto 3: se retiran las pistas de los investigadores y se da la vuelta al Lugar.
        const location = String(data.location)
        if (!investigator || !canFlip(state, location)) return state
        const story = STORY_OF[location]!
        const cleared: GameState = {
          ...state,
          investigators: state.investigators.map((i) => (i.clues ? { ...i, clues: 0 } : i)),
          log: [
            ...state.log,
            {
              key: 'log.dim.flipped',
              round: state.round,
              params: {
                name: getInvestigator(state, investigator).name,
                location: state.locations[location]!.name,
                story: STORY_NAMES[story] ?? story,
              },
            },
          ],
        }
        return push(
          cleared,
          specific('dimCreatureAttacks', { location }),
          ...storyEffect(cleared, investigator, location),
          specific('dimWingedMoves', { location }),
        )
      }
      case 'dimCreatureAttacks': {
        // Criatura de Demhe: si está preparada en ese Lugar o en uno conectado, ataca a los
        // investigadores del Lugar que se da la vuelta.
        const location = String(data.location)
        const near = [location, ...(state.locations[location]?.connections ?? [])]
        const attackers = Object.values(state.enemies).filter(
          (e) => e.code === CODES.creatureOutOfDemhe && !e.exhausted && near.includes(e.location),
        )
        return push(
          state,
          ...attackers.flatMap((e) =>
            activeInvestigators(state)
              .filter((i) => i.location === location)
              .map((i): Message => ({
                type: 'EnemyAttack',
                enemy: e.id,
                investigator: i.id,
                exhaustAfter: false,
              })),
          ),
        )
      }
      case 'dimWingedMoves': {
        // Ser alado: si está preparado y sin enfrentar, se mueve una vez hacia ese Lugar.
        const location = String(data.location)
        const moves = Object.values(state.enemies)
          .filter(
            (e) =>
              e.code === CODES.wingedOne &&
              !e.exhausted &&
              e.engagedWith === null &&
              e.location !== location,
          )
          .flatMap((e): Message[] => {
            const step = nextStepToward(state, e.location, (l) => l === location)
            return step ? [{ type: 'MoveEnemy', enemy: e.id, location: step }] : []
          })
        return push(state, ...moves)
      }
      case 'dimReplace': {
        // Se sustituye por otra copia apartada (con todo lo que hay en él) y sus pistas.
        const old = String(data.location)
        const kind = kindOf(old)
        const current = state.locations[old]
        if (!kind || !current) return state
        const options = Object.keys(state.setAsideLocations).filter((id) => kindOf(id) === kind)
        if (!options.length) return push(state, setMeta(`${NO_FLIP}${old}`, 1))
        const [n, rng] = nextInt(state.rng, options.length)
        const id = options[n]!
        const copy = state.setAsideLocations[id]!
        return push(
          {
            ...state,
            rng,
            setAsideLocations: {
              ...state.setAsideLocations,
              [id]: { ...copy, ...(current.position ? { position: current.position } : {}) },
            },
          },
          { type: 'PutLocationIntoPlay', location: id },
          { type: 'RevealLocation', location: id },
          ...activeInvestigators(state)
            .filter((i) => i.location === old)
            .map((i): Message => ({
              type: 'MoveTo',
              investigator: i.id,
              location: id,
              checked: true,
              entryPaid: true,
            })),
          ...Object.values(state.enemies)
            .filter((e) => e.location === old)
            .map((e): Message => ({ type: 'MoveEnemy', enemy: e.id, location: id })),
          ...Object.values(state.treacheries)
            .filter((t) => t.placement.type === 'location' && t.placement.location === old)
            .map((t): Message => ({
              type: 'PlaceTreachery',
              treachery: t.id,
              placement: { type: 'location', location: id },
            })),
          { type: 'RemoveLocation', location: old },
        )
      }
      case 'dimPossessionCheck': {
        if (!investigator) return state
        const me = getInvestigator(state, investigator)
        if (me.eliminated || !overwhelmed(state, investigator)) return state
        const holds = possessed(state).some((i) => i.id === investigator)
        return holds
          ? push(
              state,
              { type: 'KillInvestigators', investigator },
              { type: 'DefeatInvestigator', investigator },
            )
          : state
      }
      case 'dimRealm': {
        // Reino de la locura: descarta cartas con coste total de al menos X (tu horror).
        if (!investigator) return state
        const remaining = Number(data.remaining)
        const discarded = data.discarded === true
        const me = getInvestigator(state, investigator)
        const hand = [...new Set(me.hand)].filter((code) => {
          const def = playerCardDef(code)
          return def && !def.weakness
        })
        const assets = Object.values(state.assets).filter(
          (a) => a.owner === investigator && !playerCardDef(a.code)?.story,
        )
        if (remaining <= 0 || (!hand.length && !assets.length))
          return discarded ? state : push(state, damage(investigator, 0, 2))
        const next = (cost: number) =>
          specific('dimRealm', {
            investigator,
            remaining: remaining - cost,
            discarded: true,
          })
        return push(state, {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.dim.realm',
            promptParams: { amount: remaining },
            choices: [
              ...assets.map((a): Choice => ({
                label: 'choice.discard',
                params: { card: playerCardDef(a.code)?.name ?? a.code },
                target: { type: 'asset', id: a.id },
                then: [
                  { type: 'DiscardAsset', asset: a.id },
                  next(playerCardDef(a.code)?.cost ?? 0),
                ],
              })),
              ...hand.map((code): Choice => ({
                label: 'choice.discard',
                params: { card: playerCardDef(code)?.name ?? code },
                target: { type: 'hand', code },
                then: [
                  { type: 'DiscardFromHand', investigator, card: code },
                  next(playerCardDef(code)?.cost ?? 0),
                ],
              })),
            ],
          },
        })
      }
    }
    return state
  },
})

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

registerAgenda({
  code: CODES.madnessCoils,
  // Reverso: hay que salir del trance (o desmayarse y añadir 1 perdición al plan 2).
  onAdvance: () => [specific('dimCoils')],
  afterAdvance: (state) => (meta(state, FAINTED) === 1 ? [{ type: 'PlaceDoom', amount: 1 }] : []),
})

registerAgenda({
  code: CODES.madnessDrowns,
  // Reverso: la Bestia de Aldebarán aparece en el palacio; los descartes vuelven al mazo.
  onAdvance: (state) => [
    ...(state.locations[CODES.palaceOfTheKing]
      ? [
          {
            type: 'SpawnSetAsideEnemy',
            code: SETS.beastOfAldebaran,
            location: CODES.palaceOfTheKing,
          } as Message,
        ]
      : []),
    specific('dimShuffleDiscard'),
  ],
})

registerAgenda({
  code: CODES.madnessDies,
  // Reverso: más Convicciones (o igual) → R4; más Dudas → R5.
  onAdvance: (state) => [
    {
      type: 'EndScenario',
      outcome: resolution(carcosaBelief(state.campaignLog) === 'doubt' ? 5 : 4),
    },
  ],
})

// ---------------------------------------------------------------------------
// Actos
// ---------------------------------------------------------------------------

const man = (state: GameState) =>
  Object.values(state.enemies).find((e) => e.code === THE_MAN_IN_THE_PALLID_MASK)

registerAct({
  code: CODES.inLostCarcosa,
  // Reverso: El hombre de la máscara pálida aparece en el palacio del Rey.
  onAdvance: (state) => {
    const card = state.setAside.find((c) => c.code === THE_MAN_IN_THE_PALLID_MASK)
    const owner = meta(state, BEARER)
    return card && state.locations[CODES.palaceOfTheKing]
      ? [
          {
            type: 'SpawnEnemy',
            card,
            location: CODES.palaceOfTheKing,
            engageWith: null,
            ...(typeof owner === 'string' ? { owner } : {}),
          } as Message,
        ]
      : []
  },
})

registerAct({
  code: CODES.searchV1,
  objectiveMet: () => false,
  // [action][action][action]: el jefe, en el Lugar del hombre, hace avanzar el acto.
  abilities: (state, _self, investigator) => {
    const stranger = man(state)
    const lead = leadInvestigator(state)
    return stranger &&
      lead?.id === investigator &&
      getInvestigator(state, investigator).location === stranger.location
      ? [
          {
            key: `${CODES.searchV1}:advance`,
            label: 'ability.dim.advanceV1',
            actions: 3,
            provokes: true,
            then: [{ type: 'AdvanceAct', paid: true }],
          },
        ]
      : []
  },
  // Reverso (La máscara pálida): el jefe la controla; aparece Hastur (El Rey Andrajoso).
  onAdvance: (state) => {
    const lead = leadInvestigator(state)
    const stranger = man(state)
    return [
      ...(lead
        ? [
            {
              type: 'PutAssetIntoPlay',
              investigator: lead.id,
              code: CODES.thePallidMask,
            } as Message,
            specific('dimPossessionCheck', { investigator: lead.id }),
          ]
        : []),
      ...(stranger ? [{ type: 'RemoveEnemyFromGame', enemy: stranger.id } as Message] : []),
      {
        type: 'SpawnSetAsideEnemy',
        code: CODES.hasturTatteredKing,
        location: CODES.palaceOfTheKing,
      },
    ]
  },
})

registerAct({
  code: CODES.searchV2,
  objectiveMet: () => false,
  // Reverso: Hastur (El Rey de Amarillo) junto al acto, sin Lugar.
  onAdvance: (state) => {
    const stranger = man(state)
    return [
      specific('dimKingEnters'),
      ...(stranger ? [{ type: 'RemoveEnemyFromGame', enemy: stranger.id } as Message] : []),
    ]
  },
})

registerAct({
  code: CODES.searchV3,
  objectiveMet: () => false,
  // Reverso: Hastur (Señor de Carcosa) aparece donde estaba el hombre.
  onAdvance: (state) => {
    const stranger = man(state)
    const location = stranger?.location ?? CODES.palaceOfTheKing
    return [
      ...(stranger ? [{ type: 'RemoveEnemyFromGame', enemy: stranger.id } as Message] : []),
      { type: 'SpawnSetAsideEnemy', code: CODES.hasturLordOfCarcosa, location },
    ]
  },
})

registerAct({
  code: CODES.theKingInTatters,
  objectiveMet: (state) => typeof meta(state, DEFEATED) === 'string',
  // [fast] Sin pistas en tu Lugar: retira las pistas de los investigadores y dale la vuelta.
  abilities: (state, _self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (!here || state.locations[here]!.clues > 0 || !canFlip(state, here)) return []
    return [
      {
        key: `${CODES.theKingInTatters}:flip`,
        label: 'ability.dim.flip',
        actions: 0,
        provokes: false,
        target: { type: 'location', id: here },
        then: [specific('dimFlip', { investigator, location: here })],
      },
    ]
  },
  onAdvance: (state) => {
    const defeated = meta(state, DEFEATED)
    const number =
      defeated === CODES.hasturTatteredKing ? 1 : defeated === CODES.hasturKingInYellow ? 2 : 3
    return [{ type: 'EndScenario', outcome: resolution(number) }]
  },
})

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

const firstOf = (state: GameState, kind: Kind) =>
  Object.keys(state.locations).filter((id) => kindOf(id) === kind)

registerEnemy({
  code: CODES.creatureOutOfDemhe,
  spawn: (state) => firstOf(state, 'depths'),
})

registerEnemy({
  code: CODES.wingedOne,
  spawn: (state) => firstOf(state, 'bleak'),
})

// ---------------------------------------------------------------------------
// Traiciones
// ---------------------------------------------------------------------------

registerTreachery({
  code: CODES.dismalCurse,
  // [willpower] (3), +2 sin cordura restante; si fallas, 2 daño (4 si tu horror es más del
  // doble de tu cordura).
  revelation: (state, investigator) => [
    effectTest(
      investigator,
      'Dismal Curse',
      'willpower',
      remainingSanity(state, investigator) === 0 ? 5 : 3,
      { onFail: [damage(investigator, overwhelmed(state, investigator) ? 4 : 2)] },
    ),
  ],
})

registerTreachery({
  code: CODES.realmOfMadness,
  revelation: (state, investigator) => [
    specific('dimRealm', {
      investigator,
      remaining: getInvestigator(state, investigator).horror,
      discarded: false,
    }),
  ],
})

registerTreachery({
  code: CODES.theFinalAct,
  // Oleada. Sin cordura restante: 2 perdición en el plan (puede hacerlo avanzar).
  revelation: (state, investigator) =>
    remainingSanity(state, investigator) === 0
      ? [{ type: 'PlaceDoom', amount: 2 }, { type: 'CheckAgenda' }]
      : [],
})

const inHand = (self: { placement: { type: string; investigator?: string } }, id: string) =>
  self.placement.type === 'threatArea' && self.placement.investigator === id

for (const code of POSSESSIONS)
  registerTreachery({
    code,
    // Oculta: en secreto a tu mano (se trata como si estuviera en tu zona de amenaza).
    revelation: (_state, investigator, self) => [
      {
        type: 'PlaceTreachery',
        treachery: self.id,
        placement: { type: 'threatArea', investigator },
        hidden: true,
      },
      specific('dimPossessionCheck', { investigator }),
    ],
    ...(code === CODES.possessionTraitorous
      ? {
          // Puedes comprometerla a una prueba de tu Lugar: la prueba falla automáticamente.
          testOptions: (state, test, self) => {
            if (self.placement.type !== 'threatArea') return []
            const holder = self.placement.investigator
            const at = getInvestigator(state, holder).location
            if (at === null || at !== getInvestigator(state, test.investigator).location) return []
            return [
              {
                key: `${self.id}:commit`,
                investigator: holder,
                label: 'ability.dim.commitTraitorous',
                then: [
                  { type: 'ForceSkillTestFailure' },
                  { type: 'DiscardTreachery', treachery: self.id, own: true },
                ],
              },
            ]
          },
        }
      : {
          abilities: (state, self, investigator) => {
            if (!inHand(self, investigator)) return []
            const me = getInvestigator(state, investigator)
            if (code === CODES.possessionTorturous)
              return me.resources >= 5
                ? [
                    {
                      key: `${self.id}:discard`,
                      label: 'ability.dim.torturous',
                      actions: 1,
                      provokes: true,
                      costs: [{ type: 'LoseResources', investigator, amount: 5 }],
                      then: [{ type: 'DiscardTreachery', treachery: self.id, own: true }],
                    },
                  ]
                : []
            // Asesina: 2 daño a un investigador de tu Lugar.
            return activeInvestigators(state)
              .filter((i) => i.location === me.location)
              .map((i) => ({
                key: `${self.id}:discard`,
                label: 'ability.dim.murderous',
                params: { name: i.name },
                actions: 1,
                provokes: true,
                target: { type: 'investigator', id: i.id },
                then: [
                  damage(i.id, 2),
                  { type: 'DiscardTreachery', treachery: self.id, own: true } as Message,
                ],
              }))
          },
        }),
  })
