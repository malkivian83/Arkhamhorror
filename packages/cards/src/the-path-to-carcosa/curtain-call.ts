/**
 * Escenario I de El camino a Carcosa: "Se cierra el telón" (03043–03060).
 * Guía de campaña revisada ES, pp. 4–6; cartas del conjunto Se cierra el telón.
 *
 * Los códigos son los de la expansión. El texto de las cartas está en el catálogo
 * EN/ES; aquí solo su comportamiento.
 */
import {
  activeInvestigators,
  getInvestigator,
  investigatorsAt,
  leadInvestigator,
  nextInt,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerScenario,
  seedRng,
  shroudOf,
  shuffle,
  withinLimit,
  type AbilityLimit,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type LocationId,
  type Message,
  type ScenarioDefinition,
  type ScenarioOutcome,
  type SkillType,
  type Trigger,
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
  resolution,
  storyEntries,
} from '../scenario-helpers'
import { CARCOSA_CHAOS_BAGS } from './campaign'
import { ENCOUNTER_SETS, SETS, atOrConnected, kingsEdictFight } from './encounter-sets'
import { applyCarcosaMark, CARCOSA_COUNTERS, markCarcosa } from './log'
import {
  STRANGER_DEFEATS,
  THE_MAN_IN_THE_PALLID_MASK,
  theManInThePallidMask,
} from './the-man-in-the-pallid-mask'

export const CURTAIN_CALL = 'curtain-call'

export const CODES = {
  theThirdAct: '03044',
  encore: '03045',
  awakening: '03046',
  cityAflame: '03047a',
  pathIsMine: '03047b',
  shoresOfHali: '03047c',
  curtainCall: '03048',
  theatre: '03049',
  lobby: '03050',
  balcony: '03051',
  backstage: '03052',
  lightingBox: '03053',
  boxOffice: '03054',
  greenRoom: '03055',
  dressingRoom: '03056',
  rehearsalRoom: '03057',
  trapRoom: '03058',
  royalEmissary: '03060',
} as const

export const STRANGERS = [CODES.cityAflame, CODES.pathIsMine, CODES.shoresOfHali] as const
const LOBBY_DOORWAYS = [CODES.lightingBox, CODES.boxOffice, CODES.greenRoom]
const BACKSTAGE_DOORWAYS = [CODES.dressingRoom, CODES.rehearsalRoom, CODES.trapRoom]
/** Lugares [[Private]]: las seis Puertas. */
const PRIVATE: string[] = [...LOBBY_DOORWAYS, ...BACKSTAGE_DOORWAYS]

/** Variante del acto 2 que ha avanzado: qué representa el horror de los Lugares. */
export const STRANGER_VARIANT = 'carcosa:stranger'
export const STOLE_FROM_BOX_OFFICE = 'carcosa:stoleFromBoxOffice'
const VARIANTS: Record<string, 'aflame' | 'path' | 'hali'> = {
  [CODES.cityAflame]: 'aflame',
  [CODES.pathIsMine]: 'path',
  [CODES.shoresOfHali]: 'hali',
}

// ---------------------------------------------------------------------------
// Datos de las cartas
// ---------------------------------------------------------------------------

export const royalEmissary: EnemyCard = enemy({
  code: CODES.royalEmissary,
  name: 'Royal Emissary',
  traits: ['Monster', 'Elite'],
  fight: 4,
  health: 4,
  evade: 2,
  damage: 2,
  horror: 0,
  keywords: ['massive', 'hunter', 'retaliate'],
  prey: { type: 'lowestSkill', skill: 'willpower' },
  victory: 2,
})

const location = (card: LocationCard): LocationCard => card
const doorway = (
  card: Omit<LocationCard, 'symbol' | 'connectsTo' | 'connections' | 'unrevealedName'>,
  lobby: boolean,
): LocationCard => ({
  ...card,
  symbol: lobby ? 'plus' : 'moon',
  connectsTo: [lobby ? 'triangle' : 'diamond'],
  connections: [],
  unrevealedName: lobby ? 'Lobby Doorway' : 'Backstage Doorway',
})

/** Conexiones por los símbolos de las cartas; posiciones de la distribución sugerida (p. 4). */
export const locationCards = {
  theatre: location({
    id: CODES.theatre,
    name: 'Theatre',
    position: [2, 1],
    symbol: 'circle',
    connectsTo: ['diamond', 'triangle'],
    shroud: 2,
    clueValue: 0,
    cluesPerInvestigator: false,
    connections: [],
  }),
  lobby: location({
    id: CODES.lobby,
    name: 'Lobby',
    position: [1, 1],
    symbol: 'triangle',
    connectsTo: ['circle', 'square', 'plus'],
    shroud: 4,
    clueValue: 1,
    cluesPerInvestigator: false,
    connections: [],
  }),
  balcony: location({
    id: CODES.balcony,
    name: 'Balcony',
    position: [2, 0],
    symbol: 'square',
    connectsTo: ['circle', 'triangle'],
    shroud: 2,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [],
    victory: 1,
  }),
  backstage: location({
    id: CODES.backstage,
    name: 'Backstage',
    position: [3, 1],
    symbol: 'diamond',
    connectsTo: ['circle', 'moon'],
    shroud: 3,
    clueValue: 1,
    cluesPerInvestigator: false,
    connections: [],
  }),
  lightingBox: doorway(
    {
      id: CODES.lightingBox,
      name: 'Lighting Box',
      position: [0, 0],
      shroud: 4,
      clueValue: 1,
      cluesPerInvestigator: true,
      victory: 1,
    },
    true,
  ),
  boxOffice: doorway(
    {
      id: CODES.boxOffice,
      name: 'Box Office',
      position: [0, 1],
      shroud: 2,
      clueValue: 0,
      cluesPerInvestigator: false,
    },
    true,
  ),
  greenRoom: doorway(
    {
      id: CODES.greenRoom,
      name: 'Green Room',
      position: [0, 2],
      shroud: 5,
      clueValue: 1,
      cluesPerInvestigator: true,
      victory: 1,
    },
    true,
  ),
  dressingRoom: doorway(
    {
      id: CODES.dressingRoom,
      name: 'Dressing Room',
      position: [4, 0],
      shroud: 4,
      clueValue: 0,
      cluesPerInvestigator: false,
    },
    false,
  ),
  rehearsalRoom: doorway(
    {
      id: CODES.rehearsalRoom,
      name: 'Rehearsal Room',
      position: [4, 1],
      shroud: 1,
      clueValue: 1,
      cluesPerInvestigator: true,
      victory: 1,
    },
    false,
  ),
  trapRoom: doorway(
    {
      id: CODES.trapRoom,
      name: 'Trap Room',
      position: [4, 2],
      shroud: 3,
      clueValue: 1,
      cluesPerInvestigator: true,
      victory: 1,
    },
    false,
  ),
}

/** Mazo de encuentros: siete conjuntos sin las cartas apartadas (32 cartas). */
export const encounterDeck = [
  ...ENCOUNTER_SETS.evilPortents,
  ...ENCOUNTER_SETS.delusions,
  ...ENCOUNTER_SETS.hauntings,
  ...ENCOUNTER_SETS.cultOfTheYellowSign,
  ...ENCOUNTER_SETS.strikingFear,
  ...ENCOUNTER_SETS.rats,
]

const STRANGER_NAME = 'The Stranger'

/** Guía ES p. 4, "Preparación". Lola Hayes (Bastidores) aún no es un investigador jugable. */
export function curtainCall({
  difficulty,
  seed = 0,
}: Pick<ScenarioContext, 'difficulty'> & { seed?: number }): ScenarioDefinition {
  const { theatre, lobby, balcony, backstage, ...doorways } = locationCards
  // Acto 2: una de sus tres copias al azar; las otras se retiran sin mirarlas. Elegirla
  // ya en la preparación es equivalente (nadie la ve hasta que avanza el acto 1).
  const stranger = STRANGERS[nextInt(seedRng(seed), STRANGERS.length)[0]]!
  return {
    id: CURTAIN_CALL,
    intro: { title: 'story.curtainCall.introTitle', body: 'story.curtainCall.intro' },
    setupInstructions: { title: 'story.curtainCall.setupTitle', body: 'story.curtainCall.setup' },
    locations: [theatre, lobby, balcony, backstage],
    setAsideLocations: Object.values(doorways),
    startingLocation: CODES.theatre,
    agendas: [
      { code: CODES.theThirdAct, name: 'The Third Act', doomThreshold: 6 },
      { code: CODES.encore, name: 'Encore', doomThreshold: 6 },
    ],
    acts: [
      {
        code: CODES.awakening,
        name: 'Awakening',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      {
        code: stranger,
        name: STRANGER_NAME,
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: CODES.curtainCall,
        name: 'Curtain Call',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck,
    setAside: [{ ...theManInThePallidMask }, { ...royalEmissary }],
    chaosBag: [...CARCOSA_CHAOS_BAGS[difficulty]],
    tokenValues: {},
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

const horrorAt = (state: GameState, location: LocationId | null) =>
  location === null ? 0 : (state.locations[location]?.horror ?? 0)

const variant = (state: GameState) => state.scenarioMeta?.[STRANGER_VARIANT]

const manInPlay = (state: GameState) =>
  Object.values(state.enemies).find((e) => e.code === THE_MAN_IN_THE_PALLID_MASK)

/** Una habilidad forzada con "Límite de una vez por ronda", registrada como uso. */
function limitedForced(
  state: GameState,
  investigator: InvestigatorId,
  key: string,
  then: Message[],
): Message[] {
  const limit: AbilityLimit = { per: 'round' }
  if (!withinLimit(state, key, investigator, limit)) return []
  return [{ type: 'UseAbility', investigator, key, actions: 0, provokes: false, limit, then }]
}

const test = (
  investigator: InvestigatorId,
  source: string,
  skill: SkillType,
  difficulty: number,
  onFail: Message[],
  onSuccess: Message[] = [],
) => effectTest(investigator, source, skill, difficulty, { onFail, onSuccess })

/** Las Puertas apartadas de un grupo que siguen fuera de juego. */
const setAsideOf = (state: GameState, group: string[]) =>
  group.filter((code) => state.setAsideLocations[code])

// ---------------------------------------------------------------------------
// Resoluciones (guía ES pp. 5–6)
// ---------------------------------------------------------------------------

const entry = storyEntries('curtainCall')

function resolutionStory(state: GameState, outcome: ScenarioOutcome): Message[] {
  // Acto 3, Objetivo: si cada investigador no derrotado se ha retirado, avanza: el
  // grupo decide entre R1 y R2 (reverso "Huyendo del teatro").
  const act = state.acts[state.actIndex]
  if (
    outcome.type === 'noResolution' &&
    act?.code === CODES.curtainCall &&
    state.investigators.some((i) => i.resigned)
  )
    return [
      {
        type: 'Story',
        entry: entry('escaping'),
        choices: [1, 2].map((n) => ({
          label: `story.curtainCall.decide${n}`,
          then: resolutionMessages(state, resolution(n)),
        })),
      },
    ]
  return resolutionMessages(state, outcome)
}

function resolutionMessages(state: GameState, outcome: ScenarioOutcome): Message[] {
  const number = outcome.type === 'resolution' ? outcome.resolution : 0
  if (number !== 0 && number !== 1 && number !== 2)
    throw new Error('Invalid Curtain Call resolution')
  const key = number === 0 ? 'noResolution' : `resolution${number}`
  const belief = number === 1 ? 'conviction' : 'doubt'
  const policeNote = number === 1 ? 'carcosaWarnedPolice' : 'carcosaAvoidedPolice'
  // Guía ES pp. 5–6: sospechas por robo solo en R1; la referencia también las añade en R2.
  const suspicious = number === 1 && state.scenarioMeta?.[STOLE_FROM_BOX_OFFICE] === 1
  const marks = number === 0 ? Number(state.scenarioMeta?.[STRANGER_DEFEATS] ?? 0) : 2
  const lead = leadInvestigator(state) ?? state.investigators[0]
  if (!lead) throw new Error('Curtain Call needs a lead investigator')
  return [
    {
      type: 'Story',
      entry: entry(key, [
        ...(number
          ? [
              noteEffect(policeNote),
              { key: `story.carcosa.mark${number === 1 ? 'Conviction' : 'Doubt'}` },
            ]
          : []),
        ...(suspicious ? [noteEffect('carcosaPoliceSuspicious')] : []),
        noteEffect('carcosaStrangerIsOnToYou'),
        { key: 'story.carcosa.strangerBearer', params: { name: lead.name } },
        { key: 'story.carcosa.chasingMarks', params: { n: marks } },
        { key: 'story.effect.experience', params: { bonus: 0 } },
        { key: 'story.effect.proceed', params: { scenario: 'story.carcosa.nextScenario' } },
      ]),
    },
    ...(number ? [recordNote(policeNote), markCarcosa(belief)] : []),
    ...(suspicious ? [recordNote('carcosaPoliceSuspicious')] : []),
    recordNote('carcosaStrangerIsOnToYou'),
    { type: 'AddStoryAsset', investigator: lead.id, code: THE_MAN_IN_THE_PALLID_MASK },
    markCarcosa('chasing', marks),
    earnExperience(0, true),
    endScenario(outcome),
  ]
}

// ---------------------------------------------------------------------------
// Tarjeta de referencia, horror de los Lugares y mensajes propios
// ---------------------------------------------------------------------------

/** Efectos que el reverso del acto 2 da a cada Lugar con horror. */
function locationHorrorForced(state: GameState, trigger: Trigger): Message[] {
  const mode = variant(state)
  if (mode === 'aflame') {
    // Llamas: tras entrar o terminar tu turno aquí, agilidad (3); si fallas, 1 daño (1/ronda).
    const who =
      trigger.type === 'afterMove' || trigger.type === 'turnEnds' ? trigger.investigator : null
    if (who === null) return []
    const here = getInvestigator(state, who).location
    if (here === null || horrorAt(state, here) === 0) return []
    return limitedForced(state, who, `carcosa:aflame:${here}`, [
      test(who, STRANGER_NAME, 'agility', 3, [damage(who, 1)]),
    ])
  }
  if (mode === 'path' && trigger.type === 'afterMove' && trigger.from) {
    // Cieno: después de salir de aquí, agilidad (4); si fallas, 1 horror y 1 daño.
    if (horrorAt(state, trigger.from) === 0) return []
    const who = trigger.investigator
    return [test(who, STRANGER_NAME, 'agility', 4, [damage(who, 1, 1)])]
  }
  return []
}

registerScenario({
  id: CURTAIN_CALL,
  resolution: resolutionStory,
  tokenEffect: (state, token, investigator) => {
    const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
    const self = getInvestigator(state, investigator)
    if (token === 'skull')
      return { modifier: -(hard ? Math.max(1, self.horror) : self.horror >= 3 ? 3 : 1) }
    if (token === 'cultist' || token === 'tablet' || token === 'elderThing')
      return {
        modifier: hard ? -5 : -4,
        // Se evalúa al resolver, antes del resultado de la prueba, para evitar cifras obsoletas.
        immediate: [specific('carcosaSymbol', { investigator })],
      }
    return { modifier: 0 }
  },
  // Cabina de luces: +2 al coste de las cartas de tu mano mientras estás en ella.
  cardCostModifier: (state, investigator) =>
    getInvestigator(state, investigator).location === CODES.lightingBox ? 2 : 0,
  // Bastidores: cada traición Oculta de tu mano cuenta como 3 cartas.
  hiddenHandWeight: (state, investigator) =>
    getInvestigator(state, investigator).location === CODES.backstage ? 3 : 1,
  enemyStat: kingsEdictFight,
  forced: locationHorrorForced,
  // Agua: al ir a salir de un Lugar con horror, agilidad (2); si fallas, 1 daño y no te
  // mueves (límite de una vez por ronda).
  beforeMove: (state, move) => {
    if (variant(state) !== 'hali') return null
    const from = getInvestigator(state, move.investigator).location
    if (from === null || from === move.location || horrorAt(state, from) === 0) return null
    const who = move.investigator
    const forced = limitedForced(state, who, `carcosa:hali:${from}`, [
      test(who, STRANGER_NAME, 'agility', 2, [damage(who, 1)], [{ ...move, checked: true }]),
    ])
    return forced.length ? forced : null
  },
  specific: (state, key, data) => {
    if (
      key === 'carcosaMark' &&
      typeof data.counter === 'string' &&
      Object.hasOwn(CARCOSA_COUNTERS, data.counter)
    )
      return applyCarcosaMark(
        state,
        data.counter as keyof typeof CARCOSA_COUNTERS,
        Number(data.amount),
      )
    const push = (...messages: Message[]): GameState => ({
      ...state,
      queue: [...messages, ...state.queue],
    })
    const investigator = typeof data.investigator === 'string' ? data.investigator : null
    switch (key) {
      case 'carcosaSymbol': {
        // Con horror en tu Lugar recibes 1 horror; si no tiene, se coloca 1 en él.
        if (investigator === null) return state
        const here = getInvestigator(state, investigator).location
        if (here === null || !state.locations[here]) return state
        return horrorAt(state, here) > 0
          ? push(damage(investigator, 0, 1))
          : push({ type: 'PlaceLocationTokens', location: here, horror: 1 })
      }
      case 'carcosaAwakening': {
        // Un Lugar apartado al azar entra en juego con El hombre de la máscara pálida.
        const aside = Object.keys(state.setAsideLocations)
        const [at, rng] = nextInt(state.rng, Math.max(1, aside.length))
        const where = aside[at]
        return {
          ...state,
          rng,
          queue: [
            ...(where
              ? ([
                  { type: 'PutLocationIntoPlay', location: where },
                  { type: 'SpawnSetAsideEnemy', code: THE_MAN_IN_THE_PALLID_MASK, location: where },
                ] as Message[])
              : []),
            ...state.queue,
          ],
        }
      }
      case 'carcosaDoorways': {
        // Dos de las Puertas apartadas de ese grupo, al azar.
        const group = data.group === 'lobby' ? LOBBY_DOORWAYS : BACKSTAGE_DOORWAYS
        const [shuffled, rng] = shuffle(setAsideOf(state, group), state.rng)
        return {
          ...state,
          rng,
          queue: [
            ...shuffled
              .slice(0, 2)
              .map((code): Message => ({ type: 'PutLocationIntoPlay', location: code })),
            ...state.queue,
          ],
        }
      }
      case 'carcosaStrangerToLobby': {
        // En lugar de descartarlo, se mueve al Vestíbulo (sin daño: ha sido derrotado).
        const man = manInPlay(state)
        if (!man || !state.locations[CODES.lobby]) return state
        return push(
          { type: 'HealEnemy', enemy: man.id, amount: man.damageTaken },
          { type: 'MoveEnemy', enemy: man.id, location: CODES.lobby },
        )
      }
      case 'carcosaEmissary': {
        // Del área de apartadas o de la zona de victoria, aparece en el Teatro.
        if (state.setAside.some((c) => c.code === CODES.royalEmissary))
          return push({
            type: 'SpawnSetAsideEnemy',
            code: CODES.royalEmissary,
            location: CODES.theatre,
          })
        const index = state.victoryDisplay.lastIndexOf(CODES.royalEmissary)
        if (index < 0) return state
        return {
          ...state,
          victoryDisplay: state.victoryDisplay.filter((_, n) => n !== index),
          victoryPoints: Math.max(0, (state.victoryPoints ?? 0) - (royalEmissary.victory ?? 0)),
          queue: [
            {
              type: 'SpawnEnemy',
              card: { ...royalEmissary },
              location: CODES.theatre,
              engageWith: null,
            },
            ...state.queue,
          ],
        }
      }
      case 'carcosaResetAgenda':
        return { ...state, agendaIndex: 0 }
      case 'carcosaRats': {
        // Busca en el mazo y el descarte de encuentros copias de Swarm of Rats y las pone
        // en juego enfrentadas contigo; si se buscó en el mazo, se baraja.
        if (investigator === null) return state
        const here = getInvestigator(state, investigator).location
        if (here === null) return state
        let wanted = Number(data.count) || 1
        let deck = state.encounterDeck
        let discard = state.encounterDiscard
        const found: EnemyCard[] = []
        for (const from of ['deck', 'discard'] as const) {
          const pile = from === 'deck' ? deck : discard
          const keep = pile.filter((c) => {
            if (wanted > 0 && c.code === SETS.swarmOfRats && c.kind === 'enemy') {
              found.push(c)
              wanted--
              return false
            }
            return true
          })
          if (from === 'deck') deck = keep
          else discard = keep
        }
        const [shuffled, rng] = shuffle(deck, state.rng)
        return {
          ...state,
          rng,
          encounterDeck: shuffled,
          encounterDiscard: discard,
          queue: [
            ...found.map((card): Message => ({
              type: 'SpawnEnemy',
              card,
              location: here,
              engageWith: investigator,
            })),
            ...state.queue,
          ],
        }
      }
      case 'carcosaDiscardHand': {
        if (investigator === null) return state
        const me = getInvestigator(state, investigator)
        return push(
          ...me.hand.map((card): Message => ({ type: 'DiscardFromHand', investigator, card })),
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
  code: CODES.theThirdAct,
  // Reverso: busca al Emisario real entre las apartadas y en la zona de victoria; aparece
  // en el Teatro.
  onAdvance: () => [specific('carcosaEmissary')],
})

registerAgenda({
  code: CODES.encore,
  // Forzado: después de que el Emisario real vaya a la zona de victoria, se retira toda la
  // perdición, el mazo de planes vuelve al plan 1a y se colocan 3 perdiciones en él.
  forced: (state, trigger) =>
    trigger.type === 'enemyDefeated' &&
    trigger.enemy.code === CODES.royalEmissary &&
    state.victoryDisplay.includes(CODES.royalEmissary)
      ? [
          { type: 'RemoveAllDoom' },
          specific('carcosaResetAgenda'),
          { type: 'PlaceDoom', amount: 3 },
        ]
      : [],
  // Reverso: cada investigador recibe 100 de horror (no se puede evitar).
  onAdvance: (state) =>
    activeInvestigators(state).map((i): Message => ({
      type: 'TakeDamage',
      investigator: i.id,
      damage: 0,
      horror: 100,
      direct: true,
    })),
})

// ---------------------------------------------------------------------------
// Actos
// ---------------------------------------------------------------------------

registerAct({
  code: CODES.awakening,
  onAdvance: () => [specific('carcosaAwakening')],
})

for (const code of STRANGERS) {
  registerAct({
    code,
    // Reverso: El hombre de la máscara pálida va al Vestíbulo, 2 fichas a la bolsa (solo
    // en este escenario) y 1 horror en los Lugares que indique la variante.
    onAdvance: (state) => {
      const token =
        code === CODES.cityAflame ? 'cultist' : code === CODES.pathIsMine ? 'tablet' : 'elderThing'
      const where =
        code === CODES.cityAflame
          ? [CODES.theatre]
          : code === CODES.pathIsMine
            ? [manInPlay(state)?.location].filter((l): l is string => !!l)
            : PRIVATE.filter((l) => state.locations[l])
      return [
        { type: 'AddChaosTokens', tokens: [token, token], scenarioOnly: true },
        ...where.map((l): Message => ({ type: 'PlaceLocationTokens', location: l, horror: 1 })),
        { type: 'SetScenarioMeta', key: STRANGER_VARIANT, value: VARIANTS[code]! },
        specific('carcosaStrangerToLobby'),
      ]
    },
  })
}

registerAct({
  code: CODES.curtainCall,
  // Sin El hombre de la máscara pálida en juego, el Vestíbulo gana "[action]: Retirarse".
  abilities: (state, _self, investigator) =>
    getInvestigator(state, investigator).location === CODES.lobby && !manInPlay(state)
      ? [
          {
            key: 'act:resign',
            label: 'ability.resign',
            actions: 1,
            provokes: false,
            target: { type: 'location', id: CODES.lobby },
            then: [{ type: 'Resign', investigator }],
          },
        ]
      : [],
  // Forzado: al final de la ronda, 1 horror en cada Lugar sin horror conectado a uno con horror.
  forced: (state, trigger) => {
    if (trigger.type !== 'roundEnds') return []
    return Object.values(state.locations)
      .filter((l) => !l.horror && l.connections.some((c) => horrorAt(state, c) > 0))
      .map((l): Message => ({ type: 'PlaceLocationTokens', location: l.id, horror: 1 }))
  },
})

// ---------------------------------------------------------------------------
// Lugares
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.lobby,
  onReveal: () => [specific('carcosaDoorways', { group: 'lobby' })],
  // [action] [action]: robar 3 cartas.
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:draw`,
      label: 'ability.drawCards',
      params: { n: 3 },
      actions: 2,
      provokes: true,
      then: [{ type: 'DrawCards', investigator, amount: 3 }],
    },
  ],
})

registerLocation({
  code: CODES.backstage,
  onReveal: () => [specific('carcosaDoorways', { group: 'backstage' })],
})

registerLocation({
  code: CODES.balcony,
  // Forzado: después de una acción de movimiento de los Palcos al Teatro, 2 de daño.
  forced: (state, trigger, self) =>
    trigger.type === 'afterMove' &&
    trigger.moveAction &&
    trigger.from === self.id &&
    getInvestigator(state, trigger.investigator).location === CODES.theatre
      ? [damage(trigger.investigator, 2)]
      : [],
})

registerLocation({
  code: CODES.boxOffice,
  // [action]: ganar 5 recursos y recordar que robasteis en la taquilla (límite de grupo 1).
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:steal`,
      label: 'ability.stealFromBoxOffice',
      actions: 1,
      provokes: true,
      limit: { per: 'game', group: true },
      then: [
        { type: 'GainResources', investigator, amount: 5 },
        { type: 'SetScenarioMeta', key: STOLE_FROM_BOX_OFFICE, value: 1 },
      ],
    },
  ],
})

registerLocation({
  code: CODES.greenRoom,
  // [action] Investigar con +3 [intellect]; al terminar la prueba, descartas tu mano.
  abilities: (state, self, investigator) => [
    {
      key: `${self.id}:investigate`,
      label: 'ability.greenRoomInvestigate',
      actions: 1,
      provokes: true,
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          skill: 'intellect',
          difficulty: shroudOf(state, self.id),
          modifier: 3,
          tags: ['investigate'],
          kind: { type: 'investigate', location: self.id },
        },
        specific('carcosaDiscardHand', { investigator }),
      ],
    },
  ],
})

registerLocation({
  code: CODES.dressingRoom,
  // [action] [action] [action]: curar 3 de horror.
  abilities: (state, self, investigator) =>
    getInvestigator(state, investigator).horror > 0
      ? [
          {
            key: `${self.id}:heal`,
            label: 'ability.dressingRoomHeal',
            actions: 3,
            provokes: true,
            then: [{ type: 'Heal', investigator, damage: 0, horror: 3 }],
          },
        ]
      : [],
})

registerLocation({
  code: CODES.rehearsalRoom,
  // Forzado: después de superar por 2 o más una investigación aquí, recibes 1 horror.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.kind === 'investigate' &&
    trigger.location === self.id &&
    trigger.succeeded &&
    trigger.margin >= 2
      ? [damage(trigger.investigator, 0, 1)]
      : [],
})

registerLocation({
  code: CODES.trapRoom,
  // Forzado: después de revelarlo, Swarm of Rats enfrentadas contigo (2 con 3–4 jugadores).
  onReveal: (state, self) => {
    const who = investigatorsAt(state, self.id)[0] ?? leadInvestigator(state)
    if (!who) return []
    return [
      specific('carcosaRats', {
        investigator: who.id,
        count: state.startingInvestigatorCount >= 3 ? 2 : 1,
      }),
    ]
  },
})

// ---------------------------------------------------------------------------
// Emisario real
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.royalEmissary,
  // Forzado: al final de la fase de enemigos, 1 horror a cada investigador de su Lugar o
  // de uno conectado.
  forced: (state, trigger, self) =>
    trigger.type === 'enemyPhaseEnds'
      ? atOrConnected(state, self.location).map((i) => damage(i.id, 0, 1))
      : [],
})
