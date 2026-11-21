/**
 * La fiesta del Valle de la Cicuta, Escenario: Escrito en la roca (guía, pp. 10–13).
 * Lote 3b: preparación y acto 1 (Cuevas, chatarra, Puesto de control). El interludio
 * «El derrumbe» y el acto 2 (raíles y Vagoneta) llegan en el lote 3c.
 */
import {
  activeInvestigators,
  getInvestigator,
  playerCardDef,
  printedCode,
  push,
  registerAct,
  registerAgenda,
  registerLocation,
  registerScenario,
  seedRng,
  shuffle,
  valleyTime,
  type Choice,
  type EncounterCard,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type Message,
  type ScenarioDefinition,
  type StoryEntry,
  type TokenEffect,
} from '@lcg/engine'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import type { ScenarioContext } from '../campaign-definition'
import { hemlockValeChaosBag } from './chaos-bag'
import {
  crystalParasite,
  crystalParasiteFight,
  daySetDeck,
  empyreanNight,
  empyreanTest,
  horrorsInTheRockDeck,
  refractionsDeck,
} from './rock-encounters'
import { RESIDENTS } from './welcome'

export const WRITTEN_IN_ROCK = 'hemlock-vale-written-in-rock'

export const ROCK = {
  referenceEasy: '10501',
  referenceHard: '10502',
  undergroundSurvey: '10503',
  dangerousRide: '10504',
  descentIntoTheMines: '10505',
  theUndergroundMaze: '10506',
  controlStation: '10508',
  dryBurrow: '10716',
  alkalineForest: '10717',
  iridescentPassage: '10718',
  overgrownTunnel: '10719',
  mineralTunnel: '10720',
} as const

/** Posición del acto 1: fila inferior (la guía numera las columnas de izquierda a derecha). */
const ROW = 5

const cave = (id: string, name: string, shroud: number, clueValue: number): LocationCard => ({
  id,
  name,
  shroud,
  clueValue,
  cluesPerInvestigator: true,
  connections: [],
})

/** Los 6 Lugares Cueva de Horrores en la roca. */
export const CAVES: LocationCard[] = [
  cave(ROCK.dryBurrow, 'Dry Burrow', 2, 1),
  cave(`${ROCK.dryBurrow}~2`, 'Dry Burrow', 2, 1),
  cave(ROCK.alkalineForest, 'Alkaline Forest', 2, 2),
  cave(ROCK.iridescentPassage, 'Iridescent Passage', 3, 2),
  cave(ROCK.overgrownTunnel, 'Overgrown Tunnel', 3, 1),
  cave(ROCK.mineralTunnel, 'Mineral Tunnel', 0, 1),
]

export const controlStation: LocationCard = {
  id: ROCK.controlStation,
  name: 'Control Station',
  shroud: 1,
  clueValue: 2,
  cluesPerInvestigator: true,
  // Reverso: entrar desde un Lugar adyacente cuesta 2 pistas por investigador, en grupo.
  enterCost: 2,
  connections: [],
  position: [5, ROW],
}

const entry = (key: string): StoryEntry => ({
  title: `story.hemlockVale.writtenInRock.${key}.title`,
  body: `story.hemlockVale.writtenInRock.${key}.body`,
})
const read = (state: GameState, key: string): Message[] =>
  state.interactive ? [{ type: 'Story', entry: entry(key) }] : []

const meta = (state: GameState, key: string) => Number(state.scenarioMeta?.[key] ?? 0)
const setMeta = (key: string, value: number): Message => ({ type: 'SetScenarioMeta', key, value })
export const scrap = (state: GameState) => meta(state, 'scrap')
const actOne = (state: GameState) => state.acts[state.actIndex]?.code === ROCK.descentIntoTheMines

const column = (state: GameState, investigator: InvestigatorId) => {
  const here = getInvestigator(state, investigator).location
  return here === null ? 0 : (state.locations[here]?.position?.[0] ?? 0)
}

const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})

// ---------------------------------------------------------------------------
// Cuevas (Horrores en la roca)
// ---------------------------------------------------------------------------

const isNight = (state: GameState) => valleyTime(state.campaignLog)?.time === 'night'

for (const id of [ROCK.dryBurrow]) {
  registerLocation({
    code: id,
    // (Día) [rápida]: Moverte (límite de grupo: una vez por ronda).
    abilities: (state, self, investigator) =>
      isNight(state) || state.activeTurn !== investigator
        ? []
        : [
            {
              key: `${self.id}:move`,
              label: 'ability.hemlockVale.dryBurrowMove',
              actions: 0,
              provokes: false,
              actionKind: 'move',
              limit: { per: 'round', group: true },
              target: { type: 'location', id: self.id },
              then: [{ type: 'ChooseMove', investigator, mandatory: true }],
            },
          ],
    // (Noche) Obligado: después de terminar tu turno aquí, recibe 1 de horror.
    forced: (state, trigger, self) =>
      isNight(state) &&
      trigger.type === 'turnEnds' &&
      getInvestigator(state, trigger.investigator).location === self.id
        ? [{ type: 'TakeDamage', investigator: trigger.investigator, damage: 0, horror: 1 }]
        : [],
  })
}

registerLocation({
  code: ROCK.alkalineForest,
  // Obligado: después de revelarlo, 1 de horror directo o descarta 2 cartas al azar.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterRevealLocation' && trigger.location === self.id && trigger.investigator
      ? [
          ask(trigger.investigator, 'prompt.chooseEffect', [
            {
              label: 'choice.hemlockVale.directHorror',
              then: [
                {
                  type: 'TakeDamage',
                  investigator: trigger.investigator,
                  damage: 0,
                  horror: 1,
                  direct: true,
                },
              ],
            },
            {
              label: 'choice.hemlockVale.discardRandomTwo',
              then: [
                { type: 'DiscardRandomFromHand', investigator: trigger.investigator, amount: 2 },
              ],
            },
          ]),
        ]
      : [],
})

registerLocation({
  code: ROCK.iridescentPassage,
  // Obligado: después de fallar una prueba al investigar aquí, elige y descarta 1 carta.
  forced: (state, trigger, self) => {
    if (
      trigger.type !== 'afterSkillTest' ||
      trigger.kind !== 'investigate' ||
      trigger.succeeded ||
      trigger.location !== self.id
    )
      return []
    const hand = getInvestigator(state, trigger.investigator).hand.length
    return hand
      ? [{ type: 'DiscardDownTo', investigator: trigger.investigator, size: hand - 1 }]
      : []
  },
})

registerLocation({ code: ROCK.overgrownTunnel })
registerLocation({ code: ROCK.mineralTunnel })

// Puesto de control: [rápida] durante tu turno, intercambia 2 Lugares Ferrocarril adyacentes
// (límite de grupo: una vez por partida). Solo tiene sentido en el acto 2 (lote 3c).
registerLocation({ code: ROCK.controlStation })

// ---------------------------------------------------------------------------
// Plan 1, acto 1 y tarjeta de referencia
// ---------------------------------------------------------------------------

registerAgenda({
  code: ROCK.undergroundSurvey,
  // [acción] Roba la carta superior del mazo de Encuentros: mueve 1 recurso de tu Lugar a la
  // tarjeta de referencia como chatarra. Si era una traición [[Power]], obtén 5 recursos.
  abilities: (state, _self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (here === null || !(state.locations[here]?.resources ?? 0)) return []
    const top = state.encounterDeck[0]
    const power = top?.kind === 'treachery' && !!top.traits?.includes('Power')
    return [
      {
        key: 'undergroundSurvey:scrap',
        label: 'ability.hemlockVale.collectScrap',
        actions: 1,
        provokes: true,
        costs: [{ type: 'DrawEncounterCard', investigator }],
        then: [
          { type: 'ScenarioSpecific', key: 'collectScrap', data: { location: here } },
          ...(power ? [{ type: 'GainResources', investigator, amount: 5 } as Message] : []),
        ],
      },
    ]
  },
  // Obligado: cuando avanza, toda su perdición pasa al plan siguiente. Reverso (si no lo
  // avanza el acto 1): daño, Puesto de control y se pierden las pistas.
  onAdvance: (state): Message[] => [
    ...(state.doom ? [{ type: 'PlaceDoom', amount: state.doom } as Message] : []),
    ...(state.scenarioMeta?.skipAgendaReverse
      ? []
      : ([
          ...activeInvestigators(state).flatMap((i): Message[] => [
            { type: 'TakeDamage', investigator: i.id, damage: 2, horror: 0 },
            ...Object.values(state.assets)
              .filter((a) => a.owner === i.id && playerAlly(a.code))
              .map((a): Message => ({ type: 'DamageAsset', asset: a.id, damage: 1, horror: 0 })),
          ]),
          { type: 'RevealLocation', location: ROCK.controlStation } as Message,
          { type: 'ScenarioSpecific', key: 'toControlStation' },
          { type: 'ScenarioSpecific', key: 'loseClues', data: { keep: 0 } },
          { type: 'AdvanceAct' },
        ] as Message[])),
  ],
})

const playerAlly = (code: string) => !!playerCardDef(code)?.traits?.includes('Ally')

registerAgenda({ code: ROCK.dangerousRide })

registerAct({
  code: ROCK.descentIntoTheMines,
  // Objetivo: al final de la ronda, si cada investigador superviviente está en el Puesto de
  // control, avanza.
  forced: (state, trigger) => {
    if (trigger.type !== 'roundEnds') return []
    const players = activeInvestigators(state)
    return players.length && players.every((i) => i.location === ROCK.controlStation)
      ? [{ type: 'AdvanceAct' }]
      : []
  },
  onAdvance: (state): Message[] => [
    ...Object.values(state.locations)
      .filter((l) => CAVES.some((c) => c.id === l.id))
      .map((l): Message => ({ type: 'RemoveLocation', location: l.id, discardContents: true })),
    // River Hawthorne en juego y sin controlar abandona la partida.
    ...Object.values(state.placedAssets ?? {})
      .filter((a) => a.code === RESIDENTS.riverHawthorne.code)
      .map((a): Message => ({ type: 'RemovePlacedAsset', placed: a.id })),
    { type: 'ScenarioSpecific', key: 'loseClues', data: { keep: 2 } },
    // Con el plan 1a en juego, se pasa directamente al 2a (sin resolver el 1b).
    ...(state.agendas[state.agendaIndex]?.code === ROCK.undergroundSurvey
      ? [setMeta('skipAgendaReverse', 1), { type: 'AdvanceAgenda' } as Message]
      : []),
    // La chatarra pasa al otro lado de la tarjeta de referencia como agujas.
    { type: 'ScenarioSpecific', key: 'scrapToSwitches' },
    { type: 'ScenarioSpecific', key: 'caveIn' },
  ],
})

registerAct({ code: ROCK.theUndergroundMaze })

/** Fichas de la tarjeta de referencia, acto 1 (10501/10502, anverso). */
function actOneToken(state: GameState, token: string, investigator: InvestigatorId): TokenEffect {
  const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
  const x = column(state, investigator)
  const damage: Message = { type: 'TakeDamage', investigator, damage: 1, horror: 0 }
  const gain = setMeta('scrap', scrap(state) + 1)
  const lose = setMeta('scrap', Math.max(0, scrap(state) - 1))
  switch (token) {
    case 'skull':
      return { modifier: -(hard ? 2 * x : x) }
    case 'cultist':
      return hard ? { modifier: -3, onSuccess: [gain] } : { modifier: -1, immediate: [gain] }
    case 'tablet':
      return hard ? { modifier: -4, immediate: [lose] } : { modifier: -2, onFail: [lose] }
    case 'elderThing':
      return hard ? { modifier: -5, immediate: [damage] } : { modifier: -3, onFail: [damage] }
  }
  return { modifier: 0 }
}

registerScenario({
  id: WRITTEN_IN_ROCK,
  leaveCost: (state, location) =>
    // Túnel cubierto de vegetación: con pistas, salir cuesta 1 acción adicional.
    printedCode(location) === ROCK.overgrownTunnel && (state.locations[location]?.clues ?? 0) > 0
      ? 1
      : 0,
  shroudModifier: (state, location) => {
    // Túnel mineral: +1 de velo por carta en la mano de quien investiga (máx. +6 en Fácil/Normal).
    if (printedCode(location.id) !== ROCK.mineralTunnel || !state.activeTurn) return 0
    const hand = getInvestigator(state, state.activeTurn).hand.length
    return state.difficulty === 'easy' || state.difficulty === 'standard' ? Math.min(6, hand) : hand
  },
  enemyStat: (state, enemy, stat) =>
    stat === 'fight' ? crystalParasiteFight(state, enemy.code, enemy.damage) : 0,
  tokenEffect: (state, token, investigator) =>
    actOne(state) ? actOneToken(state, token, investigator) : { modifier: 0 },
  specific: (state, key, data) => {
    switch (key) {
      case 'collectScrap': {
        const location = String(data.location)
        const here = state.locations[location]
        if (!here?.resources) return state
        return {
          ...state,
          locations: { ...state.locations, [location]: { ...here, resources: here.resources - 1 } },
          scenarioMeta: { ...state.scenarioMeta, scrap: scrap(state) + 1 },
        }
      }
      case 'toControlStation':
        return push(
          state,
          ...activeInvestigators(state).map((i): Message => ({
            type: 'MoveTo',
            investigator: i.id,
            location: ROCK.controlStation,
          })),
        )
      case 'loseClues': {
        const keep = Number(data.keep ?? 0)
        return {
          ...state,
          investigators: state.investigators.map((i) =>
            i.eliminated ? i : { ...i, clues: Math.min(i.clues, keep) },
          ),
        }
      }
      case 'scrapToSwitches':
        return {
          ...state,
          scenarioMeta: { ...state.scenarioMeta, scrap: 0, switch: scrap(state) },
        }
      case 'initScrap':
        // 1 recurso en cada Lugar, como chatarra.
        return {
          ...state,
          locations: Object.fromEntries(
            Object.entries(state.locations).map(([id, l]) => [id, { ...l, resources: 1 }]),
          ),
        }
      case 'removeDiscarded': {
        const index = state.encounterDiscard.map((c) => c.code).lastIndexOf(String(data.code))
        if (index < 0) return state
        return {
          ...state,
          encounterDiscard: state.encounterDiscard.filter((_, i) => i !== index),
        }
      }
      case 'empyreanNight':
        return push(state, ...empyreanNight(state, String(data.investigator)))
      case 'empyreanTest':
        return push(state, ...empyreanTest(state, String(data.investigator)))
      case 'codex':
        return push(state, ...codex(state, Number(data.n), String(data.investigator)))
      case 'caveIn':
        // Interludio «El derrumbe» y acto 2: lote 3c.
        return state
    }
    return state
  },
})

/** Códice de Escrito en la roca (p. 12). Lote 3b: River Hawthorne. */
function codex(state: GameState, n: number, investigator: InvestigatorId): Message[] {
  if (n === RESIDENTS.riverHawthorne.codex) {
    const river = Object.values(state.placedAssets ?? {}).find(
      (a) => a.code === RESIDENTS.riverHawthorne.code,
    )
    return [
      setMeta(`codex:${n}`, 1),
      ...read(state, 'codex5'),
      ...(river
        ? [{ type: 'TakeControlOfPlaced', placed: river.id, investigator } as Message]
        : []),
    ]
  }
  return []
}

/** Cartas de encuentro del acto 1; las de Escrito en la roca esperan apartadas al acto 2. */
function encounterCards(day: 1 | 2 | 3): EncounterCard[] {
  return [
    ...horrorsInTheRockDeck,
    ...refractionsDeck,
    ...ENCOUNTER_SETS.chillingCold,
    ...ENCOUNTER_SETS.ghouls,
    ...daySetDeck(day),
  ]
}

/** Preparación (pp. 10–11). */
export function writtenInRock(context: ScenarioContext): ScenarioDefinition {
  const time = context.log.valley ?? { day: 1 as const, time: 'day' as const }
  // Se retiran 2 de las 6 Cuevas al azar.
  const [caves] = shuffle(CAVES, seedRng(context.seed))
  const placed = caves
    .slice(0, 4)
    .map((c, i) => ({ ...c, position: [i + 1, ROW] as [number, number] }))
  const day = time.day
  const isDay = time.time === 'day'
  const river = isDay && day === 1 && placed[2]
  return {
    id: WRITTEN_IN_ROCK,
    intro: entry('intro'),
    setupInstructions: entry('setup'),
    grid: true,
    locations: [...placed, controlStation],
    startingLocation: placed[0]!.id,
    agendas: [
      { code: ROCK.undergroundSurvey, name: 'Underground Survey', doomThreshold: 5 },
      { code: ROCK.dangerousRide, name: 'Dangerous Ride', doomThreshold: 14 },
    ],
    acts: [
      {
        code: ROCK.descentIntoTheMines,
        name: 'Descent into the Mines',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: ROCK.theUndergroundMaze,
        name: 'The Underground Maze',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: encounterCards(day),
    setAside: [crystalParasite, { ...crystalParasite }],
    chaosBag: hemlockValeChaosBag(context),
    tokenValues: {},
    setup: [
      { type: 'SetValleyTime', day, time: time.time },
      { type: 'ScenarioSpecific', key: 'initScrap' },
      ...(river
        ? [
            {
              type: 'PlaceAsset',
              code: RESIDENTS.riverHawthorne.code,
              name: RESIDENTS.riverHawthorne.name,
              placement: { type: 'location', location: river.id },
            } as Message,
          ]
        : []),
    ],
  }
}
