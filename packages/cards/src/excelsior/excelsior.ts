/**
 * Asesinato en el hotel Excelsior: preparación, bolsas del caos, tarjeta de
 * referencia, restricciones de movimiento, mensajes comunes y resoluciones.
 */
import {
  activeInvestigators,
  allPlayerCardDefs,
  getInvestigator,
  leadInvestigator,
  nextInt,
  playerCardBehavior,
  playerCardDef,
  push,
  registerScenario,
  seedRng,
  shuffle,
  treacheryBehavior,
  type ChaosToken,
  type Choice,
  type Difficulty,
  type GameState,
  type Message,
  type ScenarioBehavior,
  type ScenarioDefinition,
  type ScenarioOutcome,
  type StoryEntry,
} from '@lcg/engine'
import { effectTest, endScenario, noteEffect, recordNote, resolution } from '../scenario-helpers'
import {
  CODES,
  EXCELSIOR,
  LEADS,
  LOCATIONS,
  SET_ASIDE_LOCATIONS,
  encounterDeck,
  setAsideCards,
} from './cards'
import {
  ask,
  enemiesWith,
  hard,
  inVictory,
  investigatorsHere,
  isLead,
  leadAsset,
  leadAssets,
  leadId,
  log,
  perInv,
  remembered,
  onSpecific,
  runSpecific,
  scenarioForced,
  scenarioReactions,
  specific,
  type Data,
} from './helpers'

// ---------------------------------------------------------------------------
// Bolsa del caos (escenario independiente: Normal y Difícil)
// ---------------------------------------------------------------------------

const NORMAL: ChaosToken[] = [
  1,
  0,
  -1,
  -1,
  -2,
  -3,
  -3,
  -4,
  'skull',
  'skull',
  'cultist',
  'tablet',
  'elderThing',
  'autoFail',
  'elderSign',
]
const HARD: ChaosToken[] = [
  0,
  -1,
  -2,
  -3,
  -4,
  -4,
  -5,
  -6,
  'skull',
  'skull',
  'cultist',
  'tablet',
  'elderThing',
  'autoFail',
  'elderSign',
]

/** Solo hay dos modos: Fácil y Normal usan la bolsa Normal; Difícil y Experto, la Difícil. */
export const CHAOS_BAGS: Record<Difficulty, ChaosToken[]> = {
  easy: NORMAL,
  standard: NORMAL,
  hard: HARD,
  expert: HARD,
}

// ---------------------------------------------------------------------------
// Preparación
// ---------------------------------------------------------------------------

export const story = (key: string, effects: StoryEntry['effects'] = []): StoryEntry => ({
  title: `story.excelsior.${key}Title`,
  body: `story.excelsior.${key}`,
  ...(effects.length ? { effects } : {}),
})

/** Prepara el escenario (reglamento, páginas 8 y 9). */
export function murderAtTheExcelsiorHotel(options: {
  difficulty?: Difficulty
  seed?: number
  players: number
}): ScenarioDefinition {
  const { difficulty = 'standard', seed = 1, players } = options
  const [leads] = shuffle([...LEADS], seedRng(seed))
  return {
    id: EXCELSIOR,
    intro: [story('intro1'), story(players === 1 ? 'intro2' : 'intro3'), story('intro4')],
    setupInstructions: story('setup'),
    locations: [
      LOCATIONS.room225,
      LOCATIONS.suiteBalcony,
      LOCATIONS.secondFloorHall,
      LOCATIONS.restaurant,
      LOCATIONS.foyer,
    ],
    setAsideLocations: SET_ASIDE_LOCATIONS,
    // El jefe empieza en la Habitación 225 y los demás en el Vestíbulo.
    startingLocation: CODES.foyer,
    leadStartingLocation: CODES.room225,
    agendas: [
      // Con 1 investigador, +1 al umbral de perdición.
      { code: CODES.theMurder, name: 'The Murder', doomThreshold: players === 1 ? 4 : 3 },
      { code: CODES.specialInvestigation, name: 'Special Investigation', doomThreshold: 12 },
    ],
    acts: [
      {
        code: CODES.whatHappened,
        name: 'What Happened...?',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: CODES.followingLeads,
        name: 'Following Leads',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'endOfRound',
      },
    ],
    encounterDeck: encounterDeck(),
    setAside: setAsideCards(),
    chaosBag: [...CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [specific('setup', { leads: leads.join(',') })],
  }
}

/** El jefe toma la Daga manchada de sangre; los Indicios forman su propio mazo. */
onSpecific('setup', (state, data) => {
  const lead = leadInvestigator(state)
  const next: GameState = {
    ...state,
    scenarioDecks: { ...(state.scenarioDecks ?? {}), leads: String(data.leads).split(',') },
  }
  return lead
    ? push(next, {
        type: 'PutAssetIntoPlay',
        investigator: lead.id,
        code: CODES.bloodstainedDagger,
      })
    : next
})

// ---------------------------------------------------------------------------
// Mensajes comunes
// ---------------------------------------------------------------------------

/**
 * "Mueve a X cualquier cantidad de pistas controladas por los investigadores de
 * este Lugar": quien activa la capacidad decide cuántas aporta cada uno (hasta
 * `max` en total, si lo hay).
 */
onSpecific('transferClues', (state, data) => {
  const chooser = String(data.chooser)
  const target = leadAsset(state, String(data.target))
  const location = String(data.location)
  const done = String(data.done ?? '')
    .split(',')
    .filter(Boolean)
  const max = data.max === undefined ? Infinity : Number(data.max)
  if (!target || max <= 0) return state
  const next = investigatorsHere(state, location).find((i) => i.clues > 0 && !done.includes(i.id))
  if (!next) return state
  const limit = Math.min(next.clues, max)
  const card = playerCardDef(target.code)?.name ?? target.code
  return push(
    state,
    ask(
      chooser,
      'prompt.excelsior.moveClues',
      Array.from({ length: limit + 1 }, (_, n): Choice => ({
        label: 'choice.excelsior.moveClues',
        params: { n, name: next.name, card },
        then: [
          ...(n > 0
            ? [
                {
                  type: 'MoveClues',
                  from: { type: 'investigator', id: next.id },
                  to: { type: 'asset', id: target.id },
                  amount: n,
                } as Message,
              ]
            : []),
          specific('transferClues', {
            ...data,
            done: [...done, next.id].join(','),
            ...(data.max === undefined ? {} : { max: max - n }),
          }),
        ],
      })),
      { name: next.name, card },
    ),
  )
})

/** Un punto más por el que se ha superado la prueba (para las capacidades "por cada punto"). */
onSpecific('countMargin', (state) => ({
  ...state,
  scenarioMeta: {
    ...(state.scenarioMeta ?? {}),
    margin: Number(state.scenarioMeta?.margin ?? 0) + 1,
  },
}))

/** Un apoyo sin dueño derrotado (el Sargento Monroe en el Vestíbulo) abandona el juego. */
onSpecific('placedDefeated', (state, data) =>
  push(state, { type: 'RemovePlacedAsset', placed: String(data.placed) }),
)

/** Da el control de un apoyo a otro investigador. */
onSpecific('setOwner', (state, data) => {
  const asset = state.assets[String(data.asset)]
  if (!asset) return state
  return {
    ...state,
    assets: { ...state.assets, [asset.id]: { ...asset, owner: String(data.investigator) } },
  }
})

/** Apoyo Indicio: "Cuando seas derrotado: dale el control a otro investigador". */
onSpecific('giveLead', (state, data) => {
  const asset = state.assets[String(data.asset)]
  if (!asset) return state
  const others = activeInvestigators(state).filter((i) => i.id !== asset.owner)
  if (others.length === 0) return state
  return push(
    state,
    ask(
      asset.owner,
      'prompt.excelsior.giveLead',
      others.map((i): Choice => ({
        label: 'choice.investigator',
        params: { name: i.name },
        target: { type: 'investigator', id: i.id },
        then: [specific('setOwner', { asset: asset.id, investigator: i.id })],
      })),
      { card: playerCardDef(asset.code)?.name ?? asset.code },
    ),
  )
})

/** Añade la pila de descartes de Encuentros al mazo y lo baraja. */
onSpecific('shuffleDiscardIntoEncounter', (state) => {
  const [encounterDeck, rng] = shuffle(
    [...state.encounterDeck, ...state.encounterDiscard],
    state.rng,
  )
  return { ...state, rng, encounterDeck, encounterDiscard: [] }
})

/** El Vestíbulo: si fallas, gasta 1 acción adicional para salir o no te mueves. */
onSpecific('foyerFail', (state, data) => {
  const investigator = getInvestigator(state, String(data.investigator))
  if (investigator.actionsRemaining < 1)
    return push(state, log('foyerBlocked', { name: investigator.name }))
  return push(
    state,
    { type: 'LoseActions', investigator: investigator.id, amount: 1 },
    {
      type: 'MoveTo',
      investigator: investigator.id,
      location: String(data.location),
      checked: true,
    },
  )
})

// ---------------------------------------------------------------------------
// Tarjeta de referencia
// ---------------------------------------------------------------------------

const tokenEffect: ScenarioBehavior['tokenEffect'] = (state, token, investigator) => {
  const harder = hard(state)
  const innocents = inVictory(state, 'Innocent')
  switch (token) {
    case 'skull':
      return {
        modifier: -enemiesWith(state, harder ? 'Innocent' : 'Guest').length,
      }
    case 'cultist':
      return { modifier: harder ? -2 : -1, ...(innocents > 0 ? { revealAnother: true } : {}) }
    case 'tablet': {
      // Puedes colocar una de tus pistas en tu Lugar para que cuente como -1 (-2).
      const self = getInvestigator(state, investigator)
      return {
        modifier: harder ? -5 : -3,
        ...(self.clues > 0 && self.location
          ? {
              immediate: [
                ask(investigator, 'prompt.excelsior.tablet', [
                  {
                    label: 'choice.excelsior.tabletClue',
                    params: { n: harder ? -2 : -1 },
                    then: [
                      { type: 'PlaceCluesOnLocation', investigator, amount: 1 },
                      { type: 'BoostSkillTest', amount: harder ? 3 : 2 },
                    ],
                  },
                  { label: 'choice.skip', then: [] },
                ]),
              ],
            }
          : {}),
      }
    }
    case 'elderThing': {
      const horror = harder ? innocents : innocents > 0 ? 1 : 0
      return {
        modifier: -3,
        ...(horror > 0
          ? { onFail: [{ type: 'TakeDamage', investigator, damage: 0, horror } as Message] }
          : {}),
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Resoluciones
// ---------------------------------------------------------------------------

const firstPlay = (state: GameState) => !state.campaignLog?.values[`replayed:${EXCELSIOR}`]

/** El jefe al final de la partida (aunque todos hayan sido derrotados). */
const finalLead = (state: GameState) => leadInvestigator(state) ?? state.investigators[0]

/** Recompensas y Debilidades de las resoluciones (páginas 19, 21 y 23). */
onSpecific('rewards', (state, data) => {
  const lead = finalLead(state)
  if (!lead) return state
  const r = Number(data.resolution)
  const messages: Message[] = [
    { type: 'AddStoryAsset', investigator: lead.id, code: CODES.whatHaveYouDone },
    ask(lead.id, 'prompt.excelsior.addDagger', [
      {
        label: 'choice.excelsior.addDagger',
        then: [{ type: 'AddStoryAsset', investigator: lead.id, code: CODES.bloodstainedDagger }],
      },
      { label: 'choice.skip', then: [] },
    ]),
  ]
  if (r === 1 && remembered(state, 'policeOnYourSide')) {
    messages.push(
      ask(lead.id, 'prompt.excelsior.addMonroe', [
        ...state.investigators.map((i): Choice => ({
          label: 'choice.investigator',
          params: { name: i.name },
          then: [{ type: 'AddStoryAsset', investigator: i.id, code: CODES.sergeantMonroe }],
        })),
        { label: 'choice.skip', then: [] },
      ]),
    )
  }
  const policeInVictory = inVictory(state, 'Police') > 0
  if (r === 3 || (r === 1 && remembered(state, 'policeDontBelieveYou') && policeInVictory))
    messages.push(specific('randomMadness', { investigator: lead.id }))
  return push(state, ...messages)
})

/** Busca en la colección una Debilidad Detective o Locura al azar. */
onSpecific('randomMadness', (state, data) => {
  const pool = allPlayerCardDefs().filter(
    (c) =>
      c.weakness === 'basicweakness' &&
      (c.traits.includes('Detective') || c.traits.includes('Madness')) &&
      (!!treacheryBehavior(c.code) || !!playerCardBehavior(c.code)),
  )
  if (pool.length === 0) return push(state, log('noMadness'))
  const [index, rng] = nextInt(state.rng, pool.length)
  const card = pool[index]!
  return push(
    { ...state, rng },
    { type: 'AddStoryAsset', investigator: String(data.investigator), code: card.code },
    log('madnessAdded', { card: card.name }),
  )
})

/** Volver a jugar: no se anota nada más salvo el trauma ni se gana experiencia. */
onSpecific('replay', (state) => ({
  ...state,
  scenarioMeta: { ...(state.scenarioMeta ?? {}), replay: 1 },
}))

function lateResolution(state: GameState, r: 2 | 3): Message[] {
  const rest: Message[] = [
    recordNote('murdersContinueUnsolved'),
    { type: 'EarnExperience', amount: 0, victory: true },
    specific('rewards', { resolution: r }),
    endScenario(resolution(r)),
  ]
  if (!firstPlay(state)) return [{ type: 'Story', entry: story(`resolution${r}`) }, ...rest]
  return [
    {
      type: 'Story',
      entry: story(`resolution${r}`),
      choices: [
        {
          label: 'story.excelsior.playAgain',
          then: [specific('replay'), endScenario(resolution(r))],
        },
        { label: 'story.excelsior.leaveThingsAlone', then: rest },
      ],
    },
  ]
}

function resolutionStory(state: GameState, outcome: ScenarioOutcome): Message[] {
  if (outcome.type === 'noResolution') {
    const resigned = state.investigators.some((i) => i.resigned)
    return resigned
      ? [
          {
            type: 'Story',
            entry: story('noResolutionResigned', [
              noteEffect('investigatorsFledTheSceneOfTheCrime'),
            ]),
          },
          recordNote('investigatorsFledTheSceneOfTheCrime'),
          ...lateResolution(state, 3),
        ]
      : [
          {
            type: 'Story',
            entry: story('noResolution', [noteEffect('excelsiorClaimsAnotherVictim')]),
          },
          recordNote('excelsiorClaimsAnotherVictim'),
          ...lateResolution(state, 2),
        ]
  }
  switch (outcome.resolution) {
    case 1:
      return [
        {
          type: 'Story',
          entry: story('resolution1', [noteEffect('excelsiorIsQuietForNow')]),
        },
        recordNote('excelsiorIsQuietForNow'),
        { type: 'EarnExperience', amount: 0, victory: true },
        specific('rewards', { resolution: 1 }),
        endScenario(resolution(1)),
      ]
    case 2:
      return lateResolution(state, 2)
    default:
      return lateResolution(state, 3)
  }
}

// ---------------------------------------------------------------------------
// Comportamiento del escenario
// ---------------------------------------------------------------------------

registerScenario({
  id: EXCELSIOR,
  rulesVersion: 1,
  tokenEffect,
  specific: (state, key, data: Data) => runSpecific(state, key, data),
  forced: scenarioForced,
  reactions: scenarioReactions,
  resolution: resolutionStory,
  // Habitación 212 (sin revelar): no se puede entrar desde el Pasillo del segundo piso.
  // Despacho (sin revelar): no se puede entrar sin controlar la Llave del director.
  canEnter: (state, investigator, from, to) => {
    const location = state.locations[to]
    if (!location || location.revealed) return true
    if (to === CODES.room212) return from !== CODES.secondFloorHall
    if (to === CODES.office) return leadAsset(state, CODES.managersKey)?.owner === investigator
    return true
  },
  // Vestíbulo: al intentar salir con Clientes aquí, prueba de [agility] (X).
  beforeMove: (state, move) => {
    const mover = getInvestigator(state, move.investigator)
    if (mover.location !== CODES.foyer || move.location === CODES.foyer) return null
    const guests = enemiesWith(state, 'Guest').filter((e) => e.location === CODES.foyer).length
    if (guests === 0) return null
    return [
      effectTest(mover.id, 'Foyer', 'agility', guests, {
        onSuccess: [{ ...move, checked: true }],
        onFail: [specific('foyerFail', { investigator: mover.id, location: move.location })],
      }),
    ]
  },
  // Apoyos Indicio: al ser derrotado, das su control a otro investigador.
  assetLeavesPlay: (state, asset, reason) => {
    if (!isLead(asset.code) || reason !== 'defeated') return null
    if (!activeInvestigators(state).some((i) => i.id !== asset.owner)) return null
    return [specific('giveLead', { asset: asset.id })]
  },
  // Investigando indicios: cada Apoyo Indicio con al menos 1 pista por investigador.
  actAdvanceAllowed: (state) => {
    if (state.acts[state.actIndex]?.code !== CODES.followingLeads) return true
    return leadAssets(state).every((a) => (a.clues ?? 0) >= perInv(state, 1))
  },
})

export { leadId }
