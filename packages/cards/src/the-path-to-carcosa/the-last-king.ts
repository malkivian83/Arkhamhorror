/**
 * Escenario II de El camino a Carcosa: "El Último Rey" (03061–03083) y el Interludio I,
 * "La sombra de la realidad". Guía de campaña revisada ES, pp. 7–9.
 *
 * Los códigos son los de la expansión. El texto de las cartas está en el catálogo
 * EN/ES; aquí solo su comportamiento.
 */
import {
  getInvestigator,
  investigatorsAt,
  leadInvestigator,
  nextInt,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerPlayerCard,
  registerPlayerCards,
  registerScenario,
  registerTreachery,
  seedRng,
  shroudOf,
  shuffle,
  type AbilityOption,
  type Choice,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type LocationId,
  type Message,
  type PlacedAsset,
  type PlayerCardDef,
  type ScenarioDefinition,
  type ScenarioOutcome,
  type SkillType,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import {
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
  copies,
} from '../scenario-helpers'
import { CARCOSA_CHAOS_BAGS } from './campaign'
import {
  ENCOUNTER_SETS,
  encounterSpecific,
  hastursGiftFight,
  isLunatic,
  mostRemainingHealth,
  nextToAgendaCount,
} from './encounter-sets'
import { carcosaSpecific, markCarcosa, replaceSymbolTokens } from './log'

export const THE_LAST_KING = 'the-last-king'

export const CODES = {
  scenario: '03061',
  fashionablyLate: '03062',
  theTerrifyingTruth: '03063',
  discoveringTheTruth: '03064',
  foyer: '03070',
  ballroom: '03071',
  livingRoom: '03072',
  gallery: '03073',
  courtyard: '03074',
  diningRoom: '03075',
  dianneDevine: '03081',
  fineDining: '03082',
  toughCrowd: '03083',
} as const

type Requirement = 'resources' | 'hand' | null

interface Vip {
  /** Clave de las notas del registro (carcosaInterviewed<Clave>, carcosaSlain<Clave>). */
  key: string
  name: string
  /** Apoyo Transeúnte y su reverso de Historia (interrogado). */
  bystander: string
  interview: string
  /** Carta de Historia Realidad repulsiva y su reverso Enemigo Lunático. */
  sickening: string
  enemy: EnemyCard
  /** Negociar: prueba (null si no hay prueba), acciones y requisito. */
  skill: SkillType | null
  difficulty: number
  actions: number
  requirement: Requirement
}

const vipEnemy = (
  code: string,
  name: string,
  stats: { fight: number; health: number; evade: number; damage: number; horror: number },
  keywords: EnemyCard['keywords'] = ['hunter'],
): EnemyCard =>
  enemy({ code, name, traits: ['Monster', 'Lunatic', 'Elite'], ...stats, keywords, victory: 0 })

export const VIPS: Vip[] = [
  {
    key: 'Constance',
    name: 'Constance Dumaine',
    bystander: '03076a',
    interview: '03076b',
    sickening: '03065',
    enemy: vipEnemy('03065b', 'Constance Dumaine', {
      fight: 4,
      health: 6,
      evade: 1,
      damage: 2,
      horror: 0,
    }),
    skill: 'intellect',
    difficulty: 3,
    actions: 1,
    requirement: null,
  },
  {
    key: 'Jordan',
    name: 'Jordan Perry',
    bystander: '03077',
    interview: '03077b',
    sickening: '03066',
    enemy: vipEnemy('03066b', 'Jordan Perry', {
      fight: 2,
      health: 8,
      evade: 2,
      damage: 1,
      horror: 1,
    }),
    skill: 'intellect',
    difficulty: 2,
    actions: 1,
    requirement: 'resources',
  },
  {
    key: 'Haruko',
    name: 'Ishimaru Haruko',
    bystander: '03078',
    interview: '03078b',
    sickening: '03067',
    enemy: vipEnemy('03067b', 'Ishimaru Haruko', {
      fight: 6,
      health: 4,
      evade: 3,
      damage: 1,
      horror: 1,
    }),
    skill: 'willpower',
    difficulty: 2,
    actions: 1,
    requirement: 'hand',
  },
  {
    key: 'Sebastien',
    name: 'Sebastien Moreau',
    bystander: '03079',
    interview: '03079b',
    sickening: '03068',
    enemy: vipEnemy(
      '03068b',
      'Sebastien Moreau',
      { fight: 3, health: 5, evade: 3, damage: 2, horror: 2 },
      ['hunter', 'retaliate'],
    ),
    skill: 'willpower',
    difficulty: 3,
    actions: 1,
    requirement: null,
  },
  {
    key: 'Ashleigh',
    name: 'Ashleigh Clarke',
    bystander: '03080',
    interview: '03080b',
    sickening: '03069',
    enemy: vipEnemy('03069b', 'Ashleigh Clarke', {
      fight: 2,
      health: 5,
      evade: 4,
      damage: 0,
      horror: 2,
    }),
    skill: null,
    difficulty: 0,
    actions: 2,
    requirement: null,
  },
]

const vipByKey = (key: string) => VIPS.find((v) => v.key === key)
const vipOfBystander = (code: string) => VIPS.find((v) => v.bystander === code)

/** Metadatos: Realidades repulsivas que quedan bajo la referencia, y VIP interrogados. */
export const SICKENING = 'lastKing:sickening'
export const INTERVIEWED = 'lastKing:interviewed:'

registerPlayerCards(
  VIPS.map((v): PlayerCardDef => ({
    code: v.bystander,
    name: v.name,
    type: 'asset',
    class: 'neutral',
    traits: ['Bystander'],
    unique: true,
    story: true,
    slots: [],
  })),
)

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

export const dianneDevine: EnemyCard = enemy({
  code: CODES.dianneDevine,
  name: 'Dianne Devine',
  traits: ['Humanoid', 'Cultist', 'Elite'],
  fight: 2,
  health: 3,
  evade: 2,
  damage: 0,
  horror: 0,
  keywords: ['aloof'],
})

const location = (
  card: Omit<LocationCard, 'connections' | 'clueValue' | 'cluesPerInvestigator'> & {
    clues?: number
  },
) => {
  const { clues = 0, ...rest } = card
  return {
    ...rest,
    clueValue: clues,
    cluesPerInvestigator: clues > 0,
    connections: [],
  } as LocationCard
}

/** Conexiones por los símbolos de las cartas; distribución sugerida de la guía (p. 7). */
export const locationCards = {
  foyer: location({
    id: CODES.foyer,
    name: 'Foyer',
    position: [1, 2],
    symbol: 't',
    connectsTo: ['circle', 'square', 'equals'],
    shroud: 2,
    clues: 1,
  }),
  ballroom: location({
    id: CODES.ballroom,
    name: 'Ballroom',
    position: [0, 1],
    symbol: 'square',
    connectsTo: ['t', 'circle', 'squiggle'],
    shroud: 4,
  }),
  livingRoom: location({
    id: CODES.livingRoom,
    name: 'Living Room',
    position: [2, 1],
    symbol: 'equals',
    connectsTo: ['t', 'circle', 'plus'],
    shroud: 3,
  }),
  gallery: location({
    id: CODES.gallery,
    name: 'Gallery',
    position: [2, 0],
    symbol: 'plus',
    connectsTo: ['equals', 'circle'],
    shroud: 1,
  }),
  courtyard: location({
    id: CODES.courtyard,
    name: 'Courtyard',
    position: [1, 1],
    symbol: 'circle',
    connectsTo: ['squiggle', 'square', 't', 'equals', 'plus'],
    shroud: 5,
  }),
  diningRoom: location({
    id: CODES.diningRoom,
    name: 'Dining Room',
    position: [0, 0],
    symbol: 'squiggle',
    connectsTo: ['square', 'circle'],
    shroud: 2,
  }),
}

const card = (code: string, name: string, traits: string[], keywords: 'peril'[] = []) =>
  treachery({ code, name, traits, keywords })

/** Mazo de encuentros: los cinco conjuntos sin las cartas apartadas (22 cartas). */
export const encounterDeck = [
  ...copies(card(CODES.fineDining, 'Fine Dining', ['Terror'], ['peril']), 2),
  ...copies(card(CODES.toughCrowd, 'Tough Crowd', ['Hazard']), 2),
  ...ENCOUNTER_SETS.hastursGift,
  ...ENCOUNTER_SETS.decayAndFilth,
  ...ENCOUNTER_SETS.theStranger,
  ...ENCOUNTER_SETS.ancientEvils,
]

/** Guía ES p. 7, "Preparación". */
export function theLastKing({
  difficulty,
  seed = 0,
  players = 1,
}: Pick<ScenarioContext, 'difficulty'> & { seed?: number; players?: number }): ScenarioDefinition {
  const { foyer, ...rooms } = locationCards
  // Los 5 Transeúntes, uno al azar en cada Lugar salvo el Recibidor, con 1 pista más 1 por
  // investigador.
  const [bystanders] = shuffle(VIPS, seedRng(seed))
  const places = Object.values(rooms)
  return {
    id: THE_LAST_KING,
    intro: { title: 'story.theLastKing.introTitle', body: 'story.theLastKing.intro' },
    setupInstructions: { title: 'story.theLastKing.setupTitle', body: 'story.theLastKing.setup' },
    locations: [foyer, ...places],
    startingLocation: CODES.foyer,
    agendas: [
      { code: CODES.fashionablyLate, name: 'Fashionably Late', doomThreshold: 3 },
      { code: CODES.theTerrifyingTruth, name: 'The Terrifying Truth', doomThreshold: 3 },
    ],
    acts: [
      {
        code: CODES.discoveringTheTruth,
        name: 'Discovering the Truth',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck,
    setAside: [{ ...dianneDevine }, ...VIPS.map((v) => ({ ...v.enemy }))],
    chaosBag: [...CARCOSA_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      ...bystanders.map((v, n): Message => ({
        type: 'PlaceAsset',
        code: v.bystander,
        name: v.name,
        placement: { type: 'location', location: places[n]!.id },
        clues: 1 + players,
      })),
      { type: 'SetScenarioMeta', key: SICKENING, value: VIPS.map((v) => v.key).join(',') },
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

const entry = storyEntries('theLastKing')

/** Transeúntes (versión Apoyo) que siguen en juego. */
export const bystandersInPlay = (state: GameState): PlacedAsset[] =>
  Object.values(state.placedAssets ?? {}).filter((p) => !!vipOfBystander(p.code))

const placedAt = (p: PlacedAsset): LocationId | null =>
  p.placement.type === 'location' ? p.placement.location : null

/** Transeúntes con menos pistas (para Dianne Devine). */
function fewestClues(state: GameState): PlacedAsset[] {
  const all = bystandersInPlay(state)
  const least = Math.min(...all.map((p) => p.clues ?? 0))
  return all.filter((p) => (p.clues ?? 0) === least)
}

/** El jefe elige entre varias opciones; con una sola, se resuelve sin preguntar. */
function leadChooses(state: GameState, prompt: string, choices: Choice[]): Message[] {
  if (choices.length === 0) return []
  if (choices.length === 1) return choices[0]!.then
  const lead = leadInvestigator(state) ?? state.investigators[0]
  if (!lead) return []
  return [{ type: 'Ask', investigator: lead.id, question: { kind: 'chooseOne', prompt, choices } }]
}

const atBystander = (state: GameState, then: (where: LocationId) => Message[]) =>
  fewestClues(state).flatMap((p): Choice[] => {
    const where = placedAt(p)
    return where === null
      ? []
      : [
          {
            label: 'choice.card',
            params: { card: p.name },
            target: { type: 'placed', id: p.id },
            then: then(where),
          },
        ]
  })

// ---------------------------------------------------------------------------
// Transeúntes: Negociar
// ---------------------------------------------------------------------------

/** Pistas que se toman de un Transeúnte; al retirar la última, se le ha interrogado. */
function takeClue(investigator: InvestigatorId, placed: string): Message {
  return specific('lastKingTakeClue', { investigator, placed })
}

for (const vip of VIPS) {
  registerPlayerCard({
    code: vip.bystander,
    placedAbilities: (state, self, investigator) => {
      const me = getInvestigator(state, investigator)
      if (vip.requirement === 'resources' && me.resources < 10) return []
      if (vip.requirement === 'hand' && me.hand.length < 6) return []
      const here = me.location
      const take = takeClue(investigator, self.id)
      const ability: AbilityOption = {
        key: `${self.id}:parley`,
        label: 'ability.lastKing.parley',
        params: { card: self.name },
        // Un público difícil: 1 acción adicional por cada copia en juego.
        actions: vip.actions + nextToAgendaCount(state, CODES.toughCrowd),
        provokes: false,
        parley: true,
        target: { type: 'placed', id: self.id },
        then: [
          vip.skill
            ? {
                type: 'BeginSkillTest',
                investigator,
                skill: vip.skill,
                difficulty: vip.difficulty,
                tags: ['parley'],
                kind: {
                  type: 'effect',
                  source: vip.name,
                  onSuccess: [take],
                  onFail: [],
                  onFailEach: [],
                },
              }
            : take,
          { type: 'Reactions', trigger: { type: 'afterParley', investigator, location: here } },
        ],
      }
      return [ability]
    },
  })
}

// ---------------------------------------------------------------------------
// Fichas del caos, recompensas y registro
// ---------------------------------------------------------------------------

/** Retira todas las fichas de sectario, tablilla y primigenio de la bolsa y añade estas. */
const replaceTokens = replaceSymbolTokens

const interviewed = (state: GameState) =>
  VIPS.filter((v) => state.scenarioMeta?.[`${INTERVIEWED}${v.key}`] === 1)

/** VIP (Enemigos Lunático únicos) en la zona de victoria. */
const slain = (state: GameState) => VIPS.filter((v) => state.victoryDisplay.includes(v.enemy.code))

/** Por cada 2 pistas sobre el acto, 1 experiencia repartida lo más equitativamente posible. */
function clueExperience(state: GameState): Message[] {
  const bonus = Math.floor((state.actClues ?? 0) / 2)
  const all = state.investigators
  if (bonus === 0 || !all.length) return []
  const each = Math.floor(bonus / all.length)
  const rest = bonus % all.length
  return [
    ...(each > 0 ? [{ type: 'EarnExperience', amount: each } as Message] : []),
    ...(rest > 0 ? [specific('lastKingBonusXp', { remaining: rest, chosen: '' })] : []),
  ]
}

const ECHOES = 'story.carcosa.echoesOfThePast'

function resolutionStory(state: GameState, outcome: ScenarioOutcome): Message[] {
  // Sin resolución: con alguno retirado, R1; si todos fueron derrotados, R2.
  if (outcome.type === 'noResolution')
    return resolutionMessages(
      state,
      resolution(state.investigators.some((i) => i.resigned) ? 1 : 2),
    )
  return resolutionMessages(state, outcome)
}

function resolutionMessages(state: GameState, outcome: ScenarioOutcome): Message[] {
  const number = outcome.type === 'resolution' ? outcome.resolution : 0
  if (number !== 1 && number !== 2 && number !== 3)
    throw new Error('Invalid The Last King resolution')
  const talked = interviewed(state)
  const dead = slain(state)
  const bonus = Math.floor((state.actClues ?? 0) / 2)
  const tokens = number !== 1
  const effects = [
    ...talked.map((v) => noteEffect(`carcosaInterviewed${v.key}`)),
    ...(number === 3 && talked.length ? [{ key: 'story.theLastKing.forgotten' }] : []),
    ...dead.map((v) => noteEffect(`carcosaSlain${v.key}`)),
    { key: 'story.effect.experience', params: { bonus: 0 } },
    ...(bonus ? [{ key: 'story.theLastKing.clueXp', params: { n: bonus } }] : []),
    ...(tokens ? [{ key: 'story.theLastKing.tokensEach' }] : []),
    number === 1
      ? { key: 'story.theLastKing.toInterlude' }
      : { key: 'story.effect.proceed', params: { scenario: ECHOES } },
  ]
  const record: Message[] = [
    ...talked.map((v) => recordNote(`carcosaInterviewed${v.key}`)),
    ...(number === 3
      ? talked.map((v): Message => ({ type: 'CrossOutNote', note: `carcosaInterviewed${v.key}` }))
      : []),
    ...dead.map((v) => recordNote(`carcosaSlain${v.key}`)),
    earnExperience(0, true),
    ...clueExperience(state),
    ...(tokens ? [replaceTokens('cultist', 'tablet', 'elderThing')] : []),
  ]
  const end = endScenario(outcome)
  return [
    { type: 'Story', entry: entry(`resolution${number}`, effects) },
    ...record,
    ...(number === 1 ? [interlude()] : [end]),
  ]
  function interlude(): Message {
    // Interludio I: La sombra de la realidad (guía p. 9).
    const option = (n: 1 | 2 | 3) => {
      const slainNow = VIPS.filter((v) => !dead.includes(v))
      const steps: Record<
        1 | 2 | 3,
        { effects: { key: string; params?: Record<string, string> }[]; then: Message[] }
      > = {
        1: {
          effects: [noteEffect('carcosaSecretMeeting'), { key: 'story.carcosa.markDoubt' }],
          then: [
            recordNote('carcosaSecretMeeting'),
            markCarcosa('doubt'),
            replaceTokens('elderThing', 'elderThing'),
          ],
        },
        2: {
          effects: [noteEffect('carcosaFledTheParty')],
          then: [recordNote('carcosaFledTheParty'), replaceTokens('tablet', 'tablet')],
        },
        3: {
          effects: [
            noteEffect('carcosaSlewTheMonsters'),
            { key: 'story.carcosa.markConviction' },
            ...slainNow.map((v) => noteEffect(`carcosaSlain${v.key}`)),
          ],
          then: [
            recordNote('carcosaSlewTheMonsters'),
            markCarcosa('conviction'),
            ...slainNow.map((v) => recordNote(`carcosaSlain${v.key}`)),
            replaceTokens('cultist', 'cultist'),
          ],
        },
      }
      const { effects: shown, then } = steps[n]
      return {
        label: `story.theLastKing.interludeChoice${n}`,
        then: [
          {
            type: 'Story',
            entry: entry(`lunacysReward${n}`, [
              ...shown,
              { key: `story.theLastKing.tokens${n}` },
              { key: 'story.effect.proceed', params: { scenario: ECHOES } },
            ]),
          } as Message,
          ...then,
          end,
        ],
      }
    }
    return { type: 'Story', entry: entry('interlude'), choices: [option(1), option(2), option(3)] }
  }
}

// ---------------------------------------------------------------------------
// Escenario: fichas, estadísticas y mensajes propios
// ---------------------------------------------------------------------------

const hard = (state: GameState) => state.difficulty === 'hard' || state.difficulty === 'expert'

registerScenario({
  id: THE_LAST_KING,
  resolution: resolutionStory,
  tokenEffect: (state, token, investigator) => {
    const here = getInvestigator(state, investigator).location
    switch (token) {
      case 'skull':
        // Revela otra ficha; si fallas, 1 perdición en un Enemigo Lunático.
        return {
          modifier: 0,
          revealAnother: true,
          onFail: [specific('lastKingSkull', { investigator })],
        }
      case 'cultist': {
        const clue: Message = { type: 'PlaceCluesOnLocation', investigator, amount: 1 }
        return hard(state) ? { modifier: -3, immediate: [clue] } : { modifier: -2, onFail: [clue] }
      }
      case 'tablet':
        return hard(state)
          ? { modifier: -4, immediate: [damage(investigator, 0, 1)] }
          : { modifier: -4, onFail: [damage(investigator, 0, 1)] }
      case 'elderThing':
        return {
          modifier: -(here === null ? 0 : shroudOf(state, here)),
          ...(hard(state) ? { onFail: [damage(investigator, 1)] } : {}),
        }
    }
    return { modifier: 0 }
  },
  enemyStat: (state, e, stat) =>
    hastursGiftFight(state, e, stat) +
    // Constance Dumaine: +3 de combate mientras está agotada.
    (stat === 'fight' && e.code === '03065b' && e.exhausted ? 3 : 0),
  // Ashleigh Clarke: quien está en su Lugar no roba en la fase de Mantenimiento.
  skipsUpkeepDraw: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return Object.values(state.enemies).some((e) => e.code === '03069b' && e.location === here)
  },
  // Salón de baile y Sala de estar: tras negociar allí (límite de grupo una vez por fase).
  reactions: (_state, trigger) => {
    if (trigger.type !== 'afterParley') return []
    const who = trigger.investigator
    if (trigger.location === CODES.ballroom)
      return [
        {
          key: `${CODES.ballroom}:resources`,
          investigator: who,
          label: 'ability.lastKing.ballroom',
          limit: { per: 'round', group: true },
          then: [{ type: 'GainResources', investigator: who, amount: 2 }],
        },
      ]
    if (trigger.location === CODES.livingRoom)
      return [
        {
          key: `${CODES.livingRoom}:draw`,
          investigator: who,
          label: 'ability.lastKing.livingRoom',
          limit: { per: 'round', group: true },
          then: [{ type: 'DrawCards', investigator: who, amount: 1 }],
        },
      ]
    return []
  },
  specific: (state, key, data) => {
    const common = carcosaSpecific(state, key, data)
    if (common) return common
    const push = (...messages: Message[]): GameState => ({
      ...state,
      queue: [...messages, ...state.queue],
    })
    const shared = encounterSpecific(state, key, data)
    if (shared) return shared
    const investigator = typeof data.investigator === 'string' ? data.investigator : null
    switch (key) {
      case 'lastKingTakeClue': {
        const placed = state.placedAssets?.[String(data.placed)]
        const vip = placed && vipOfBystander(placed.code)
        if (!placed || !vip || investigator === null || !(placed.clues ?? 0)) return state
        const done = state.scenarioMeta?.[`${INTERVIEWED}${vip.key}`] === 1
        // Forzado: al retirar la última pista, se le da la vuelta (interrogado) y vuelve a
        // su cara de Apoyo. Límite de grupo una vez por partida.
        const last = (placed.clues ?? 0) === 1 && !done
        return push(
          {
            type: 'MoveClues',
            from: { type: 'placed', id: placed.id },
            to: { type: 'investigator', id: investigator },
            amount: 1,
          },
          ...(last ? [specific('lastKingInterview', { placed: placed.id })] : []),
        )
      }
      case 'lastKingInterview': {
        const placed = state.placedAssets?.[String(data.placed)]
        const vip = placed && vipOfBystander(placed.code)
        // Dianne Devine impide tomar la pista: entonces no se ha retirado la última.
        if (!placed || !vip || (placed.clues ?? 0) > 0) return state
        return push(
          {
            type: 'Story',
            entry: entry(`interview${vip.key}`, [noteEffect(`carcosaInterviewed${vip.key}`)]),
          },
          { type: 'SetScenarioMeta', key: `${INTERVIEWED}${vip.key}`, value: 1 },
        )
      }
      case 'lastKingSkull': {
        if (investigator === null) return state
        const lunatics = Object.values(state.enemies).filter(isLunatic)
        const targets = hard(state) ? mostRemainingHealth(state, lunatics) : lunatics
        const choices = targets.map((e): Choice => ({
          label: 'choice.enemy',
          params: { enemy: e.name },
          target: { type: 'enemy', id: e.id },
          then: [{ type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 1 }, { type: 'CheckAgenda' }],
        }))
        if (choices.length <= 1) return push(...(choices[0]?.then ?? []))
        return push({
          type: 'Ask',
          investigator,
          question: { kind: 'chooseOne', prompt: 'prompt.chooseEnemy', choices },
        })
      }
      case 'lastKingDianneArrives':
        // Plan 1b: aparece en el Lugar del Transeúnte con menos pistas.
        return push(
          ...leadChooses(
            state,
            'prompt.lastKing.dianne',
            atBystander(state, (where) => [
              { type: 'SpawnSetAsideEnemy', code: CODES.dianneDevine, location: where },
            ]),
          ),
          specific('lastKingShuffleDiscard'),
        )
      case 'lastKingShuffleDiscard': {
        const [deck, rng] = shuffle([...state.encounterDeck, ...state.encounterDiscard], state.rng)
        return { ...state, rng, encounterDeck: deck, encounterDiscard: [] }
      }
      case 'lastKingDianneMoves': {
        const dianne = state.enemies[String(data.enemy)]
        if (!dianne) return state
        const options = atBystander(state, (where) =>
          where === dianne.location
            ? []
            : [{ type: 'MoveEnemy', enemy: dianne.id, location: where }],
        )
        // Si ya está en el Lugar de uno de ellos, puede quedarse.
        if (options.some((o) => o.then.length === 0)) return state
        return push(...leadChooses(state, 'prompt.lastKing.dianne', options))
      }
      case 'lastKingSickening': {
        // Resuelve al azar una de las Realidades repulsivas que quedan.
        const left = String(state.scenarioMeta?.[SICKENING] ?? '')
          .split(',')
          .filter(Boolean)
        if (!left.length) return state
        const [index, rng] = nextInt(state.rng, left.length)
        const vip = vipByKey(left[index]!)!
        const rest = left.filter((_, n) => n !== index).join(',')
        return {
          ...state,
          rng,
          scenarioMeta: { ...state.scenarioMeta, [SICKENING]: rest },
          queue: [
            { type: 'Story', entry: entry(`sickening${vip.key}`) },
            specific('lastKingTurn', { vip: vip.key }),
            ...state.queue,
          ],
        }
      }
      case 'lastKingTurn': {
        const vip = vipByKey(String(data.vip))
        const placed = vip && bystandersInPlay(state).find((p) => p.code === vip.bystander)
        const where = placed && placedAt(placed)
        if (!vip || !placed || !where) return state
        return push(
          // Cada investigador de su Lugar recibe 1 horror; sus pistas pasan a su Lugar y la
          // carta se convierte en el Enemigo Lunático.
          ...investigatorsAt(state, where).map((i) => damage(i.id, 0, 1)),
          {
            type: 'MoveClues',
            from: { type: 'placed', id: placed.id },
            to: { type: 'location', id: where },
            amount: placed.clues ?? 0,
          },
          { type: 'RemovePlacedAsset', placed: placed.id },
          { type: 'SpawnSetAsideEnemy', code: vip.enemy.code, location: where },
        )
      }
      case 'lastKingCourtyard': {
        // Descarta la primera carta de Encuentros; si es un Enemigo, róbala.
        if (investigator === null) return state
        const [top] = state.encounterDeck
        if (!top) return state
        return push(
          top.kind === 'enemy'
            ? { type: 'DrawEncounterCard', investigator }
            : { type: 'DiscardTopEncounter' },
        )
      }
      case 'lastKingDining': {
        // Cúrate 1 horror; revela una ficha al azar: con calavera o fallo automático, 1
        // horror y 1 perdición en el Comedor.
        if (investigator === null || !state.chaosBag.length) return state
        const [index, rng] = nextInt(state.rng, state.chaosBag.length)
        const token = state.chaosBag[index]!
        const bad = token === 'skull' || token === 'autoFail'
        return {
          ...state,
          rng,
          log: [
            ...state.log,
            {
              key: 'log.lastKing.diningToken',
              params: { token: String(token) },
              round: state.round,
            },
          ],
          queue: [
            ...(bad
              ? ([
                  damage(investigator, 0, 1),
                  { type: 'PlaceLocationTokens', location: CODES.diningRoom, doom: 1 },
                  { type: 'CheckAgenda' },
                ] as Message[])
              : []),
            ...state.queue,
          ],
        }
      }
      case 'lastKingBonusXp': {
        // El jefe reparte el resto, 1 por investigador distinto.
        const remaining = Number(data.remaining)
        const chosen = String(data.chosen ?? '')
          .split(',')
          .filter(Boolean)
        const candidates = state.investigators.filter((i) => !chosen.includes(i.id))
        if (remaining <= 0 || !candidates.length) return state
        const lead = leadInvestigator(state) ?? state.investigators[0]!
        return push({
          type: 'Ask',
          investigator: lead.id,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.lastKing.bonusXp',
            promptParams: { n: remaining },
            choices: candidates.map((i) => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [
                { type: 'EarnExperience', amount: 1, investigator: i.id },
                specific('lastKingBonusXp', {
                  remaining: remaining - 1,
                  chosen: [...chosen, i.id].join(','),
                }),
              ],
            })),
          },
        })
      }
    }
    return state
  },
})

// ---------------------------------------------------------------------------
// Planes y acto
// ---------------------------------------------------------------------------

registerAgenda({
  code: CODES.fashionablyLate,
  // Reverso "La última invitada": Dianne Devine aparece junto al Transeúnte con menos pistas;
  // la pila de descartes de Encuentros se baraja en el mazo.
  onAdvance: () => [specific('lastKingDianneArrives')],
})

registerAgenda({
  code: CODES.theTerrifyingTruth,
  // Forzado: al ir a avanzar por su umbral, se retira toda la perdición y se resuelve al azar
  // una Realidad repulsiva; si no queda ninguna, avanza (→R3).
  insteadOfAdvance: (state) =>
    String(state.scenarioMeta?.[SICKENING] ?? '')
      ? [{ type: 'RemoveAllDoom' }, specific('lastKingSickening')]
      : null,
  onAdvance: () => [{ type: 'EndScenario', outcome: resolution(3) }],
})

registerAct({
  code: CODES.discoveringTheTruth,
  // Las pistas de un investigador eliminado van al acto. Objetivo: salir de la mansión (no
  // avanza nunca; el Recibidor permite retirarse).
  eliminatedCluesToAct: true,
  objectiveMet: () => false,
})

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.foyer,
  // [action]: Retirarse.
  abilities: (_state, self, investigator) => [resignAbility(investigator, `${self.id}:resign`)],
})

registerLocation({
  code: CODES.gallery,
  // Forzado: después de acabar tu turno aquí, voluntad (2); si fallas, dejas 1 de tus pistas.
  forced: (state, trigger, self) =>
    trigger.type === 'turnEnds' && getInvestigator(state, trigger.investigator).location === self.id
      ? [
          effectTest(trigger.investigator, 'Gallery', 'willpower', 2, {
            onFail: [
              { type: 'PlaceCluesOnLocation', investigator: trigger.investigator, amount: 1 },
            ],
          }),
        ]
      : [],
})

registerLocation({
  code: CODES.courtyard,
  // Forzado: después de entrar, descarta la primera carta de Encuentros; si es un Enemigo,
  // róbala.
  forced: (state, trigger, self) =>
    trigger.type === 'afterMove' &&
    trigger.from !== self.id &&
    getInvestigator(state, trigger.investigator).location === self.id
      ? [specific('lastKingCourtyard', { investigator: trigger.investigator })]
      : [],
})

registerLocation({
  code: CODES.diningRoom,
  // [action]: cúrate 1 horror y revela una ficha al azar.
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:heal`,
      label: 'ability.lastKing.diningRoom',
      actions: 1,
      provokes: true,
      then: [
        { type: 'Heal', investigator, damage: 0, horror: 1 },
        specific('lastKingDining', { investigator }),
      ],
    },
  ],
})

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.dianneDevine,
  // Los investigadores de su Lugar no pueden descubrir ni tomar pistas.
  blocksCluesHere: true,
  // Forzado: al comienzo de la fase de Enemigos, va al Lugar del Transeúnte con menos pistas.
  forced: (_state, trigger, self) =>
    trigger.type === 'enemyPhaseBegins'
      ? [specific('lastKingDianneMoves', { enemy: self.id })]
      : [],
})

registerEnemy({
  code: '03066b',
  // Jordan Perry. Forzado: al comienzo de la fase de Enemigos, se cura 1 daño.
  forced: (_state, trigger, self) =>
    trigger.type === 'enemyPhaseBegins' && self.damageTaken > 0
      ? [{ type: 'HealEnemy', enemy: self.id, amount: 1 }]
      : [],
})

registerEnemy({
  code: '03067b',
  // Ishimaru Haruko. Forzado: después de infligirle daño con un efecto que no sea un ataque,
  // robas la primera carta de Encuentros.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterDealDamage' && trigger.enemy === self.id && !trigger.attack
      ? [{ type: 'DrawEncounterCard', investigator: trigger.investigator }]
      : [],
})

registerEnemy({
  code: '03068b',
  // Sebastien Moreau: sus ataques no pueden cancelarse.
  attacksCannotBeCanceled: true,
})

// ---------------------------------------------------------------------------
// Traiciones de El Último Rey
// ---------------------------------------------------------------------------

registerTreachery({
  code: CODES.fineDining,
  // Peligro. Dejas 1 de tus pistas sobre un Transeúnte o recibes 1 daño y 1 horror.
  revelation: (state, investigator) => {
    const me = getInvestigator(state, investigator)
    const bystanders = bystandersInPlay(state)
    const hurt: Choice = { label: 'choice.damageAndHorror', then: [damage(investigator, 1, 1)] }
    const give: Choice[] =
      me.clues > 0
        ? bystanders.map((p) => ({
            label: 'choice.lastKing.clueOn',
            params: { card: p.name },
            target: { type: 'placed', id: p.id },
            then: [
              {
                type: 'MoveClues',
                from: { type: 'investigator', id: investigator },
                to: { type: 'placed', id: p.id },
                amount: 1,
              },
            ],
          }))
        : []
    if (!give.length) return hurt.then
    return [
      {
        type: 'Ask',
        investigator,
        question: { kind: 'chooseOne', prompt: 'prompt.chooseEffect', choices: [...give, hurt] },
      },
    ]
  },
})

registerTreachery({
  code: CODES.toughCrowd,
  // Junto al mazo de Plan: negociar cuesta 1 acción adicional. Se descarta al final de la ronda.
  revelation: (_state, _investigator, self) => [
    { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'agenda' } },
  ],
  forced: (_state, trigger, self) =>
    trigger.type === 'roundEnds' && self.placement.type === 'agenda'
      ? [{ type: 'DiscardTreachery', treachery: self.id }]
      : [],
})
