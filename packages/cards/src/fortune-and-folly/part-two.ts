/**
 * Fortuna e insensatez, parte II: el golpe (guía ES pp. 16–18 y 26). Se prepara siempre
 * «desde cero» con lo anotado en el Punto de control de la parte I (valores `fof:*` del
 * registro de campaña).
 */
import {
  getInvestigator,
  leadInvestigator,
  nextInt,
  playerCardDef,
  registerAct,
  registerAgenda,
  registerLocation,
  registerPlayerCard,
  registerScenario,
  seedRng,
  shuffle,
  turnStartedAt,
  type AbilityOption,
  type CampaignLog,
  type Choice,
  type Difficulty,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
  type ScenarioDefinition,
  type ScenarioOutcome,
} from '@lcg/engine'
import {
  chooseSkillTest,
  earnExperience,
  effectTest,
  endScenario,
  noteEffect,
  recordNote,
  resignAbility,
  resolution,
  storyEntries,
} from '../scenario-helpers'
import { ALARM, alarmOf, checkedIcons, checkIcons, CHECKED } from './check'
import {
  abarranUnleashed,
  BUSY_PUBLIC_LOCATIONS,
  casinoGuard,
  CHAOS_BAGS,
  CODES,
  dimensionalShambler,
  DISFAVOR,
  fortuneAndFollySet,
  fortunesChosenSet,
  GUARDS,
  isCasino,
  PART_TWO,
  PART_TWO_CODES,
  PATROLS,
  planInShamblesSet,
  RESTRICTED,
  RESTRICTED_LOCATIONS,
  securityPatrol,
  UNIQUE_ENEMIES,
} from './cards'
import {
  casinoAloof,
  commonSpecific,
  dealerTax,
  leadChooses,
  metaList,
  players,
  ROLE,
  setStoryClues,
  specific,
  tokenEffect,
  trackResources,
  agendaForced,
} from './common'
import { PACKAGE } from './encounter'
import { abarranHunts, DAGGER, DUPLICATE, MOVES, nearestExtradimensional } from './encounter-two'
import { gameAbility } from './games'
import { formatIcon, iconOf } from './icons'
import { STASH } from './part-one'

const entry = storyEntries('fof')

/** Tareas de El golpe (guía p. 26): notas del registro de campaña. */
export const HEIST_TASKS = [
  'fofWonACultistMedallion',
  'fofObservedTheStaff',
  'fofFoundAbarransSigil',
  'fofObtainedASchematic',
  'fofImpersonatedAGuard',
  'fofStayedOutOfSight',
  'fofDeliveredADecoyPackage',
  'fofIsamaraMesmerized',
] as const

/** Quién controla El manantial de fortuna (y dónde quedó si su portador fue derrotado). */
export const BEARER = 'fof:bearer'
const DROPPED = 'fof:wellspringAt'
/** Grupos de Lugares a oscuras (¡Se va la luz!): «public,restricted». */
const DARK = 'fof:dark'
const INJURY = 'fof:injury:'
const IGNORE_INJURY = 'fof:ignoreInjury:'
const TURN_ACTIONS = 'fof:turnActions:'
const SHAMBLER_TURN = 'fof:shamblerTurn'
const ENTANGLED = 'fof:entangled'
const CART = 'fof:cart:'
const PACKAGE_ASSET = 'fof:packageAsset'
const VENT_OPEN = 'fofVentOpen'

const noted = (state: GameState, note: string) => !!state.campaignLog?.notes.includes(note)
export const tasksDone = (state: GameState) =>
  HEIST_TASKS.filter((task) => noted(state, task)).length

const logValue = (log: CampaignLog | undefined, key: string) => log?.values[key]
const logNoted = (log: CampaignLog | undefined, note: string) => !!log?.notes.includes(note)

// ---------------------------------------------------------------------------
// Preparación desde cero (guía p. 17)
// ---------------------------------------------------------------------------

export function fortuneAndFollyPartTwo({
  difficulty = 'standard',
  seed = 1,
  players: count = 1,
  log,
}: {
  difficulty?: Difficulty
  seed?: number
  players?: number
  log?: CampaignLog
}): ScenarioDefinition {
  const guard = GUARDS[0]!
  const patrol = PATROLS[0]!
  const deck = fortuneAndFollySet().filter(
    (c) => c.code !== guard && c.code !== patrol && !UNIQUE_ENEMIES.includes(c.code),
  )
  const [encounterDeck] = shuffle(deck, seedRng(seed))
  const keys = logNoted(log, 'fofStoleAbarransKeys')
  return {
    id: PART_TWO,
    intro: [entry('part2Intro')],
    setupInstructions: { title: 'story.fof.setup2Title', body: 'story.fof.setup2' },
    locations: [
      ...RESTRICTED_LOCATIONS.map((l) =>
        // Con las llaves de Abarran, entrar en su despacho no cuesta pistas.
        l.id === CODES.ownersOffice && keys ? { ...l, enterCost: 0 } : { ...l },
      ),
      ...BUSY_PUBLIC_LOCATIONS.map((l) => ({ ...l })),
    ],
    startingLocation: CODES.casinoFloorBusy,
    agendas: [
      { code: CODES.openingHand, name: 'Opening Hand', doomThreshold: 5 },
      { code: CODES.theTurn, name: 'The Turn', doomThreshold: 3 },
      { code: CODES.allBetsDown, name: 'All Bets Down', doomThreshold: 12 },
    ],
    acts: [
      {
        code: CODES.theTake,
        name: 'The Take',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: CODES.theExit,
        name: 'The Exit',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck,
    setAside: [
      { ...abarranUnleashed },
      ...fortunesChosenSet(),
      { ...dimensionalShambler },
      ...planInShamblesSet(),
    ],
    chaosBag: [...CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      // El grupo público entra revelado (las caras de noche no son caras sin revelar).
      ...BUSY_PUBLIC_LOCATIONS.filter((l) => l.id !== CODES.casinoFloorBusy).map((l): Message => ({
        type: 'RevealLocation',
        location: l.id,
      })),
      {
        type: 'SpawnEnemy',
        card: casinoGuard(guard),
        location: CODES.highRollersTableBusy,
        engageWith: null,
      },
      {
        type: 'SpawnEnemy',
        card: securityPatrol(patrol),
        location: CODES.casinoFloorBusy,
        engageWith: null,
      },
      ...(logNoted(log, 'fofConvincedIsamara')
        ? [
            {
              type: 'PlaceAsset',
              code: PART_TWO_CODES.isamaraCrew,
              name: 'Isamara Ordoñez',
              placement: { type: 'location', location: CODES.casinoLoungeBusy },
            } as Message,
          ]
        : []),
      ...(logNoted(log, 'fofCleanedOutTheHouse')
        ? [
            {
              type: 'PlaceAsset',
              code: CODES.cashCart,
              name: 'Cash Cart',
              placement: { type: 'location', location: CODES.highRollersTableBusy },
            } as Message,
          ]
        : []),
      { type: 'PutStoryIntoPlay', code: PART_TWO_CODES.heist, name: 'The Heist' },
      { type: 'PutStoryIntoPlay', code: CODES.wellspring, name: 'The Wellspring of Fortune' },
      specific('fofSetupTwo', {
        wellspring: Number(logValue(log, 'fof:wellspring') ?? 7 * count),
      }),
      // Si los investigadores necesitan tiempo para descansar: 1 perdición en el plan 2a.
      ...(logNoted(log, 'fofNeedRest') ? [{ type: 'PlaceDoom', amount: 1 } as Message] : []),
    ],
  }
}

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

const groupOf = (location: string) => (RESTRICTED.includes(location) ? 'restricted' : 'public')
const isDark = (state: GameState, location: string) =>
  metaList(state, DARK).includes(groupOf(location))

/**
 * Habilidad [action] de un Lugar con sus costes adicionales: +1 acción con un Crupier
 * preparado y, a oscuras, +1 acción o 1 horror (a elegir: dos opciones).
 */
function locationAbility(
  state: GameState,
  location: string,
  investigator: InvestigatorId,
  ability: AbilityOption,
): AbilityOption[] {
  const base = { ...ability, actions: ability.actions + dealerTax(state, location) }
  if (!isDark(state, location)) return [base]
  return [
    { ...base, actions: base.actions + 1 },
    {
      ...base,
      label: `${ability.label}`,
      params: { ...ability.params, dark: 1 },
      costs: [...(base.costs ?? []), { type: 'TakeDamage', investigator, damage: 0, horror: 1 }],
    },
  ]
}

const cluesAt = (state: GameState, location: string) =>
  state.investigators
    .filter((i) => !i.eliminated && i.location === location)
    .reduce((sum, i) => sum + i.clues, 0)

const bearer = (state: GameState) => {
  const id = state.scenarioMeta?.[BEARER]
  return typeof id === 'string' ? id : null
}

const turnActions = (state: GameState, investigator: InvestigatorId): string[] => {
  const [turn, kinds] = String(state.scenarioMeta?.[`${TURN_ACTIONS}${investigator}`] ?? '').split(
    '|',
  )
  return Number(turn) === turnStartedAt(state) && kinds ? kinds.split(',') : []
}

const INJURY_ACTION: Record<string, string> = {
  '♥': 'move',
  '♦': 'investigate',
  '♣': 'fight',
  '♠': 'activate',
}

const withChecked = (state: GameState, count: number) => {
  const next = checkIcons(state, count)
  const icons = checkedIcons(next)
  return {
    state: { ...next, scenarioMeta: { ...next.scenarioMeta, [CHECKED]: '' } },
    icons,
    log: {
      type: 'Log',
      key: 'log.fof.checked',
      params: { icons: icons.map(formatIcon).join(' ') || '—' },
    } as Message,
  }
}

// ---------------------------------------------------------------------------
// Pasos propios
// ---------------------------------------------------------------------------

function fofSpecificTwo(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState {
  const common = commonSpecific(state, key, data)
  if (common) return common
  const push = (...messages: Message[]): GameState => ({
    ...state,
    queue: [...messages, ...state.queue],
  })
  const investigator = String(data.investigator ?? '')
  switch (key) {
    case 'fofSetupTwo': {
      // Nivel de alarma, Roles y escondite anotados; pistas del manantial.
      const log = state.campaignLog
      const meta: Record<string, string | number> = {}
      const roles: Message[] = []
      let next: GameState = state
      for (const i of state.investigators) {
        meta[`${ALARM}${i.id}`] = Number(log?.values[`${ALARM}${i.id}`] ?? 1)
        const recorded = String(log?.values[`${ROLE}${i.id}`] ?? '')
          .split(',')
          .filter(Boolean)
        meta[`${ROLE}${i.id}`] = recorded.join(',')
        roles.push(
          ...recorded.map((code): Message => ({
            type: 'PutAssetIntoPlay',
            investigator: i.id,
            code,
          })),
        )
        // Escondido: las cartas pasan del mazo a la mano inicial.
        for (const code of String(log?.values[`${STASH}${i.id}`] ?? '')
          .split(',')
          .filter(Boolean)) {
          const me = next.investigators.find((x) => x.id === i.id)!
          const at = me.deck.indexOf(code)
          if (at < 0) continue
          next = {
            ...next,
            investigators: next.investigators.map((x) =>
              x.id === i.id
                ? { ...x, deck: x.deck.filter((_, n) => n !== at), hand: [...x.hand, code] }
                : x,
            ),
          }
        }
      }
      const missing = state.investigators.findIndex((i) => !meta[`${ROLE}${i.id}`])
      next = setStoryClues(
        { ...next, scenarioMeta: { ...next.scenarioMeta, ...meta } },
        CODES.wellspring,
        Number(data.wellspring),
      )
      return {
        ...next,
        queue: [
          ...roles,
          // Sin Roles anotados (no se jugó la parte I con ese investigador): se eligen ahora.
          ...(missing >= 0 ? [specific('fofRoleAsk', { index: missing, extra: false })] : []),
          ...state.queue,
        ],
      }
    }
    case 'fofShuffleIn': {
      // La pila de descartes y un conjunto apartado vuelven al mazo, barajados.
      const codes: string[] =
        data.set === 'chosen'
          ? fortunesChosenSet().map((c) => c.code)
          : planInShamblesSet().map((c) => c.code)
      const moving = state.setAside.filter((c) => codes.includes(c.code))
      const [deck, rng] = shuffle(
        [...state.encounterDeck, ...state.encounterDiscard, ...moving],
        state.rng,
      )
      return {
        ...state,
        rng,
        encounterDeck: deck,
        encounterDiscard: [],
        setAside: state.setAside.filter((c) => !codes.includes(c.code)),
      }
    }
    case 'fofDisfavor': {
      // Desaprobación de la fortuna: una de las tres, al azar.
      const [pick, rng] = nextInt(state.rng, DISFAVOR.length)
      const code = DISFAVOR[pick]!
      const name =
        code === PART_TWO_CODES.lightsOut
          ? 'lightsOut'
          : code === PART_TWO_CODES.unlikelyInjuries
            ? 'unlikelyInjuries'
            : 'personalEntanglement'
      return {
        ...state,
        rng,
        queue: [
          { type: 'Story', entry: entry('disfavor') },
          { type: 'Story', entry: entry(name) },
          { type: 'PutStoryIntoPlay', code: `${code}b`, name },
          specific(`fof_${name}`),
          ...state.queue,
        ],
      }
    }
    case 'fof_lightsOut':
      return {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [DARK]: 'public,restricted' },
      }
    case 'fofRestorePower': {
      const dark = metaList(state, DARK).filter((g) => g !== data.group)
      return {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [DARK]: dark.join(',') },
        queue: [
          ...(dark.length
            ? []
            : [{ type: 'RemoveStory', code: `${PART_TWO_CODES.lightsOut}b` } as Message]),
          ...state.queue,
        ],
      }
    }
    case 'fof_unlikelyInjuries': {
      // Cada investigador comprueba 1 icono: su lesión depende del palo.
      let next = state
      const logs: Message[] = []
      for (const i of state.investigators.filter((i) => !i.eliminated)) {
        const checked = withChecked(next, 1)
        next = checked.state
        logs.push(checked.log)
        const suit = checked.icons[0]?.suit
        if (suit)
          next = {
            ...next,
            scenarioMeta: { ...next.scenarioMeta, [`${INJURY}${i.id}`]: suit },
          }
      }
      return { ...next, queue: [...logs, ...state.queue] }
    }
    case 'fof_personalEntanglement':
      return { ...state, scenarioMeta: { ...state.scenarioMeta, [ENTANGLED]: 0 } }
    case 'fofIgnoreInjury':
      return {
        ...state,
        scenarioMeta: {
          ...state.scenarioMeta,
          [`${IGNORE_INJURY}${investigator}`]: turnStartedAt(state),
        },
      }
    case 'fofAbarranStrikes': {
      // Abarran desatado: si sale ♦, te ataca.
      const { state: next, icons, log } = withChecked(state, 1)
      const attack = icons[0]?.suit === '♦'
      return {
        ...next,
        queue: [
          log,
          ...(attack && next.enemies[String(data.enemy)]
            ? [
                {
                  type: 'EnemyAttack',
                  enemy: String(data.enemy),
                  investigator,
                  exhaustAfter: false,
                } as Message,
              ]
            : []),
          ...state.queue,
        ],
      }
    }
    case 'fofCheckOne': {
      const { state: next, log } = withChecked(state, 1)
      return { ...next, queue: [log, ...state.queue] }
    }
    case 'fofDagger': {
      const { state: next, icons, log } = withChecked(state, 2)
      const clubs = icons.filter((i) => i.suit === '♣').length
      return {
        ...next,
        scenarioMeta: { ...next.scenarioMeta, [`${DAGGER}${String(data.enemy)}`]: clubs },
        queue: [log, ...state.queue],
      }
    }
    case 'fofDuplicate': {
      // La primera carta de tu mazo pasa a ser un enemigo 1/1/1 enfrentado contigo.
      const me = getInvestigator(state, investigator)
      const [top, ...rest] = me.deck
      if (!top || me.location === null) return state
      const moved = {
        ...state,
        investigators: state.investigators.map((i) =>
          i.id === investigator ? { ...i, deck: rest, discard: [...i.discard, top] } : i,
        ),
      }
      return {
        ...moved,
        queue: [
          {
            type: 'SpawnEnemy',
            card: {
              kind: 'enemy',
              code: PART_TWO_CODES.duplicators[0],
              name: 'Dimensional Duplicate',
              traits: ['Extradimensional'],
              fight: 1,
              health: 1,
              evade: 1,
              damage: 1,
              horror: 1,
              keywords: [],
            },
            location: me.location,
            engageWith: investigator,
          },
          specific('fofMarkDuplicate'),
          ...state.queue,
        ],
      }
    }
    case 'fofMarkDuplicate': {
      const fresh = Object.values(state.enemies).find(
        (e) => e.name === 'Dimensional Duplicate' && !state.scenarioMeta?.[`${DUPLICATE}${e.id}`],
      )
      return fresh
        ? { ...state, scenarioMeta: { ...state.scenarioMeta, [`${DUPLICATE}${fresh.id}`]: 1 } }
        : state
    }
    case 'fofTakeWellspring':
      return {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [BEARER]: investigator, [DROPPED]: '' },
        queue: [
          {
            type: 'Log',
            key: 'log.fof.wellspring',
            params: { name: getInvestigator(state, investigator).name },
          },
          { type: 'CheckActObjective' },
          ...state.queue,
        ],
      }
    case 'fofRelicRevealed': {
      // Sala de reliquias: las pistas del manantial pasan a ella.
      const story = state.stories?.[CODES.wellspring]
      const relic = state.locations[CODES.relicRoom]
      if (!story || !relic) return state
      return setStoryClues(
        {
          ...state,
          locations: {
            ...state.locations,
            [CODES.relicRoom]: { ...relic, clues: relic.clues + story.clues },
          },
        },
        CODES.wellspring,
        0,
      )
    }
    case 'fofSecurity': {
      // Oficina de seguridad: ¿algún icono coincide con el valor de un enemigo en juego?
      const n = Number(data.n)
      const { state: next, icons, log } = withChecked(state, n)
      const ranks = new Set(
        Object.values(state.enemies)
          .map((e) => iconOf(e.code)?.rank)
          .filter((r) => r !== undefined),
      )
      const total = icons.reduce((sum, i) => sum + (typeof i.rank === 'number' ? i.rank : 10), 0)
      const top = next.encounterDiscard[next.encounterDiscard.length - 1]
      return {
        ...next,
        queue: [
          log,
          ...(icons.some((i) => ranks.has(i.rank)) ? [recordNote('fofObservedTheStaff')] : []),
          ...(total >= 19 && top
            ? [{ type: 'DrawFromEncounterDiscard', investigator, code: top.code } as Message]
            : []),
          ...state.queue,
        ],
      }
    }
    case 'fofSpendResourcesAt': {
      // Los investigadores del Lugar gastan recursos en grupo: primero quien activa.
      let remaining = Number(data.amount)
      const order = [
        getInvestigator(state, investigator),
        ...state.investigators.filter(
          (i) => i.id !== investigator && !i.eliminated && i.location === data.location,
        ),
      ]
      const spend: Message[] = []
      for (const i of order) {
        const amount = Math.min(remaining, i.resources)
        if (amount > 0) spend.push({ type: 'SpendResources', investigator: i.id, amount })
        remaining -= amount
      }
      return push(...spend)
    }
    case 'fofVent':
      return {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [VENT_OPEN]: 1 },
        queue: [
          { type: 'MoveTo', investigator, location: CODES.guardRoom },
          ...(state.locations[CODES.staffAccessHallway]?.revealed
            ? []
            : [{ type: 'RevealLocation', location: CODES.staffAccessHallway } as Message]),
          // Las conexiones de Bar y Sala de guardias se recalculan.
          { type: 'RevealLocation', location: CODES.casinoLoungeBusy },
          ...state.queue,
        ],
      }
    case 'fofPackage': {
      // Entrega de paquete: un enemigo Casino del mazo o la pila de descartes aparece en la
      // Zona de juego del casino, pierde el rasgo Casino y va hacia la Puerta de la cámara.
      const isCasinoCard = (c: (typeof state.encounterDeck)[number]) =>
        c.kind === 'enemy' && isCasino(c.traits) && !UNIQUE_ENEMIES.includes(c.code)
      const fromDeck = state.encounterDeck.findIndex(isCasinoCard)
      const fromDiscard = state.encounterDiscard.findIndex(isCasinoCard)
      const card =
        fromDeck >= 0 ? state.encounterDeck[fromDeck] : state.encounterDiscard[fromDiscard]
      if (!card || card.kind !== 'enemy') return state
      return {
        ...state,
        encounterDeck: state.encounterDeck.filter((_, n) => n !== fromDeck),
        encounterDiscard:
          fromDeck >= 0
            ? state.encounterDiscard
            : state.encounterDiscard.filter((_, n) => n !== fromDiscard),
        queue: [
          {
            type: 'SpawnEnemy',
            card: { ...card, traits: (card.traits ?? []).filter((t) => t !== 'Casino') },
            location: CODES.casinoFloorBusy,
            engageWith: null,
          },
          specific('fofMarkPackage', { code: card.code }),
          {
            type: 'PutStoryIntoPlay',
            code: PART_TWO_CODES.packageDelivery,
            name: 'Package Delivery',
          },
          ...state.queue,
        ],
      }
    }
    case 'fofMarkPackage': {
      const enemy = Object.values(state.enemies).find(
        (e) => e.code === data.code && !isCasino(e.traits),
      )
      return enemy
        ? { ...state, scenarioMeta: { ...state.scenarioMeta, [PACKAGE]: enemy.id } }
        : state
    }
    case 'fofDelivered': {
      // El paquete llega: un investigador elige un Aliado u Objeto de su mazo.
      const enemy = String(data.enemy)
      const choices = state.investigators
        .filter((i) => !i.eliminated)
        .map((i): Choice => ({
          label: 'choice.investigator',
          params: { name: i.name },
          then: [specific('fofPackageSearch', { investigator: i.id })],
        }))
      return {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [PACKAGE]: '' },
        queue: [
          recordNote('fofDeliveredADecoyPackage'),
          { type: 'DiscardEnemy', enemy },
          ...leadChooses(state, 'prompt.fof.packageWho', choices),
          ...state.queue,
        ],
      }
    }
    case 'fofPackageSearch': {
      const me = getInvestigator(state, investigator)
      const options = [...new Set(me.deck)].filter((code) => {
        const def = playerCardDef(code)
        return def?.type === 'asset' && (def.traits.includes('Ally') || def.traits.includes('Item'))
      })
      return push({
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.fof.packageAsset',
          choices: [
            ...options.map((code) => ({
              label: 'choice.fof.packageAsset',
              params: { card: code },
              then: [specific('fofPackageChosen', { investigator, code })],
            })),
            { label: 'choice.skip', then: [] },
          ],
        },
      })
    }
    case 'fofPackageChosen': {
      const code = String(data.code)
      return {
        ...state,
        investigators: state.investigators.map((i) => {
          if (i.id !== investigator) return i
          const at = i.deck.indexOf(code)
          return at < 0 ? i : { ...i, deck: i.deck.filter((_, n) => n !== at) }
        }),
        scenarioMeta: { ...state.scenarioMeta, [PACKAGE_ASSET]: code },
      }
    }
    case 'fofCartProtect': {
      // Carro de dinero: el enemigo se desenfrenta y, hasta el final de la ronda, los
      // enemigos de este Lugar no pueden enfrentarse a ti.
      const enemy = state.enemies[String(data.enemy)]
      return {
        ...state,
        enemies: enemy
          ? { ...state.enemies, [enemy.id]: { ...enemy, engagedWith: null } }
          : state.enemies,
        scenarioMeta: { ...state.scenarioMeta, [`${CART}${investigator}`]: state.round },
      }
    }
    case 'placedDefeated': {
      const placed = state.placedAssets?.[String(data.placed)]
      if (!placed) return state
      return push(...(placed.code === CODES.cashCart ? [recordNote('fofStayedOutOfSight')] : []), {
        type: 'RemovePlacedAsset',
        placed: placed.id,
      })
    }
    case 'fofMesmerize': {
      // Isamara: evita a todos los Casino de tu Lugar; prueba [willpower] (3).
      const here = getInvestigator(state, investigator).location
      const casino = Object.values(state.enemies).filter(
        (e) => isCasino(e.traits) && e.location === here,
      )
      return push(
        ...casino.map((e): Message => ({ type: 'EvadeEnemy', enemy: e.id, by: investigator })),
        effectTest(investigator, PART_TWO_CODES.isamaraCrew, 'willpower', 3, {
          onFail: [{ type: 'LoseActions', investigator, amount: 2 }],
        }),
        ...(casino.length && here !== null && RESTRICTED.includes(here)
          ? [recordNote('fofIsamaraMesmerized')]
          : []),
      )
    }
    case 'fofEntanglement': {
      // Implicación personal: al final de la fase de Enemigos, horror sobre la carta.
      if (!state.stories?.[`${PART_TWO_CODES.personalEntanglement}b`]) return state
      const enemy = Object.values(state.enemies).some((e) => e.location === CODES.ownersOffice)
      const horror = Number(state.scenarioMeta?.[ENTANGLED] ?? 0) + (enemy ? 2 : 1)
      const lead = leadInvestigator(state)
      const tooLate = horror >= 6
      return {
        ...state,
        scenarioMeta: { ...state.scenarioMeta, [ENTANGLED]: horror },
        queue: [
          ...(tooLate
            ? [
                ...(lead
                  ? [{ type: 'SufferTrauma', investigator: lead.id, mental: 1 } as Message]
                  : []),
                ...state.investigators
                  .filter((i) => !i.eliminated)
                  .map((i): Message => ({
                    type: 'TakeDamage',
                    investigator: i.id,
                    damage: 0,
                    horror: 2,
                    direct: true,
                  })),
                {
                  type: 'RemoveStory',
                  code: `${PART_TWO_CODES.personalEntanglement}b`,
                } as Message,
              ]
            : []),
          ...state.queue,
        ],
      }
    }
    case 'fofTheTakeFallen': {
      // Abarran derrotado: el techo se desploma; prueba [agility] (3) o 2 daño.
      return push(
        ...state.investigators
          .filter((i) => !i.eliminated)
          .map((i) =>
            effectTest(i.id, CODES.theTake, 'agility', 3, {
              onFail: [{ type: 'TakeDamage', investigator: i.id, damage: 2, horror: 0 }],
            }),
          ),
      )
    }
  }
  return state
}

// ---------------------------------------------------------------------------
// Resoluciones y recompensas adicionales (guía p. 18)
// ---------------------------------------------------------------------------

function resolutionMessages(state: GameState, outcome: ScenarioOutcome): Message[] {
  const holder = bearer(state)
  const escaped =
    holder !== null &&
    state.acts[state.actIndex]?.code === CODES.theExit &&
    getInvestigator(state, holder).resigned
  const number =
    outcome.type === 'resolution'
      ? outcome.resolution
      : escaped
        ? 1
        : state.investigators.some((i) => i.resigned)
          ? 2
          : 3
  const tasks = tasksDone(state)
  const bonus = Math.max(0, tasks - 4)
  const isamara =
    Object.values(state.placedAssets ?? {}).some((p) => p.code === PART_TWO_CODES.isamaraCrew) ||
    Object.values(state.assets).some((a) => a.code === PART_TWO_CODES.isamaraCrew)
  const rewards = [
    ...(tasks >= 5 && isamara ? ['fofEarnedIsamara'] : []),
    ...(tasks >= 6 ? ['fofEarnedDeckOfPossibilities'] : []),
  ]
  return [
    ...(outcome.type === 'noResolution' && number === 3
      ? [{ type: 'Story', entry: entry('part2NoResolution') } as Message]
      : []),
    {
      type: 'Story',
      entry: entry(`part2Resolution${number}`, [
        ...(number === 1 ? [] : [noteEffect('fofBadLuck'), { key: 'story.fof.badLuckToken' }]),
        { key: 'story.effect.experience', params: { bonus } },
        { key: 'story.fof.tasksDone', params: { n: tasks } },
        ...rewards.map((note) => noteEffect(note)),
      ]),
    },
    ...(number === 1 ? [] : [recordNote('fofBadLuck')]),
    ...rewards.map((note) => recordNote(note)),
    earnExperience(bonus, true),
    endScenario(resolution(number)),
  ]
}

// ---------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------

registerScenario({
  id: PART_TWO,
  resolution: resolutionMessages,
  tokenEffect,
  enemyKeyword: (state, enemy, keyword) => {
    const exit = state.acts[state.actIndex]?.code === CODES.theExit
    // La salida: los Casino pierden Indiferente y ganan Cazador.
    if (exit && isCasino(enemy.traits) && (keyword === 'aloof' || keyword === 'hunter'))
      return keyword === 'hunter'
    if (keyword === 'hunter' && enemy.code === CODES.abarranUnleashed && abarranHunts(state))
      return true
    // Carro de dinero: los enemigos del Lugar no se enfrentan a quien se esconde esta ronda.
    if (
      keyword === 'aloof' &&
      state.investigators.some(
        (i) =>
          !i.eliminated &&
          i.location === enemy.location &&
          state.scenarioMeta?.[`${CART}${i.id}`] === state.round,
      )
    )
      return true
    return casinoAloof(state, enemy, keyword)
  },
  // Despacho del dueño: velo X (la alarma más alta allí). A oscuras: +1 velo.
  shroudModifier: (state, location) =>
    (location.id === CODES.ownersOffice
      ? Math.max(
          0,
          ...state.investigators
            .filter((i) => !i.eliminated && i.location === CODES.ownersOffice)
            .map((i) => alarmOf(state, i.id)),
        )
      : 0) + (isDark(state, location.id) ? 1 : 0),
  // Con el conducto abierto, el Bar y la Sala de guardias están conectados.
  connections: (state, location) =>
    state.scenarioMeta?.[VENT_OPEN] === 1
      ? location.id === CODES.casinoLoungeBusy
        ? [CODES.guardRoom]
        : location.id === CODES.guardRoom
          ? [CODES.casinoLoungeBusy]
          : []
      : [],
  canEnter: (state, _investigator, _from, to) => {
    const target = state.locations[to]
    if (!target || target.revealed) return true
    // Puerta de la cámara: hacen falta 4 tareas de El golpe. Sala de reliquias: no se entra.
    if (to === CODES.vaultDoor) return tasksDone(state) >= 4
    if (to === CODES.relicRoom) return false
    return true
  },
  // Hipnosis dimensional: salir del Lugar exige una prueba de [willpower] (3).
  beforeMove: (state, move) => {
    if (move.checked) return null
    const here = getInvestigator(state, move.investigator).location
    const hypnosis = Object.values(state.treacheries).find(
      (t) =>
        (PART_TWO_CODES.hypnosis as readonly string[]).includes(t.code) &&
        t.placement.type === 'location' &&
        t.placement.location === here,
    )
    if (!hypnosis || here === move.location) return null
    const nearest = nearestExtradimensional(state, move.investigator)
    return [
      effectTest(move.investigator, hypnosis.code, 'willpower', 3, {
        onSuccess: [{ ...move, checked: true }],
        onFail: [
          ...(nearest && here !== null
            ? [{ type: 'HuntOnce', enemy: nearest.id, toward: here, attack: false } as Message]
            : []),
          { type: 'DiscardTreachery', treachery: hypnosis.id },
        ],
      }),
    ]
  },
  // Lesiones improbables: una acción del tipo lesionado por turno.
  actionAllowed: (state, investigator, kind) => {
    const suit = state.scenarioMeta?.[`${INJURY}${investigator}`]
    if (typeof suit !== 'string' || INJURY_ACTION[suit] !== kind) return true
    if (state.scenarioMeta?.[`${IGNORE_INJURY}${investigator}`] === turnStartedAt(state))
      return true
    return !turnActions(state, investigator).includes(kind)
  },
  // Registro de acciones del turno; Vagabundo dimensional: la misma acción dos veces seguidas.
  afterAction: (state, investigator, kind) => {
    const previous = turnActions(state, investigator)
    const record: Message = {
      type: 'SetScenarioMeta',
      key: `${TURN_ACTIONS}${investigator}`,
      value: `${turnStartedAt(state)}|${[...previous, kind].join(',')}`,
    }
    const shambler = Object.values(state.enemies).find(
      (e) => e.code === PART_TWO_CODES.dimensionalShambler,
    )
    const here = getInvestigator(state, investigator).location
    const twice = previous[previous.length - 1] === kind
    if (
      !twice ||
      !shambler ||
      shambler.exhausted ||
      shambler.engagedWith !== null ||
      here === null ||
      state.scenarioMeta?.[SHAMBLER_TURN] === turnStartedAt(state)
    )
      return [record]
    return [
      record,
      { type: 'SetScenarioMeta', key: SHAMBLER_TURN, value: turnStartedAt(state) },
      { type: 'HuntOnce', enemy: shambler.id, toward: here, attack: false },
    ]
  },
  // Daga de la fortuna: +1 daño por cada ♣ comprobado al atacar.
  enemyDamageModifier: (state, enemy) =>
    (PART_TWO_CODES.fortunesDagger as readonly string[]).includes(enemy.code)
      ? Number(state.scenarioMeta?.[`${DAGGER}${enemy.id}`] ?? 0)
      : 0,
  abilities: (state, _self, investigator): AbilityOption[] => {
    const me = getInvestigator(state, investigator)
    const options: AbilityOption[] = []
    // El manantial caído con su portador derrotado: se recoge en su Lugar.
    if (state.scenarioMeta?.[DROPPED] && state.scenarioMeta[DROPPED] === me.location)
      options.push({
        key: `${CODES.wellspring}:take`,
        label: 'ability.fof.takeWellspring',
        actions: 1,
        provokes: true,
        then: [specific('fofTakeWellspring', { investigator })],
      })
    // Lesiones improbables: [fast] 1 daño o 1 horror para ignorar la lesión este turno.
    const suit = state.scenarioMeta?.[`${INJURY}${investigator}`]
    if (typeof suit === 'string')
      for (const kind of ['damage', 'horror'] as const)
        options.push({
          key: `${PART_TWO_CODES.unlikelyInjuries}:ignore`,
          label: `ability.fof.ignoreInjury.${kind}`,
          actions: 0,
          provokes: false,
          limit: { per: 'turn' },
          then: [
            {
              type: 'TakeDamage',
              investigator,
              damage: kind === 'damage' ? 1 : 0,
              horror: kind === 'horror' ? 1 : 0,
            },
            specific('fofIgnoreInjury', { investigator }),
          ],
        })
    // ¡Se va la luz!: en la Oficina de seguridad, 1 pista por investigador para devolverla.
    if (
      me.location === CODES.securityOffice &&
      metaList(state, DARK).length &&
      me.clues >= players(state)
    )
      options.push({
        key: `${PART_TWO_CODES.lightsOut}:restore`,
        label: 'ability.fof.restorePower',
        actions: 1,
        provokes: true,
        costs: [{ type: 'SpendClues', investigator, amount: players(state) }],
        then: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.fof.restorePower',
              choices: metaList(state, DARK).map((group) => ({
                label: `choice.fof.restore.${group}`,
                then: [specific('fofRestorePower', { group })],
              })),
            },
          },
        ],
      })
    // Implicación personal: en el Despacho del dueño, 1 pista por investigador en grupo.
    if (
      state.stories?.[`${PART_TWO_CODES.personalEntanglement}b`] &&
      me.location === CODES.ownersOffice &&
      cluesAt(state, CODES.ownersOffice) >= players(state)
    )
      options.push({
        key: `${PART_TWO_CODES.personalEntanglement}:rescue`,
        label: 'ability.fof.rescue',
        actions: 1,
        provokes: true,
        costs: [{ type: 'SpendGroupClues', amount: players(state) }],
        then: [{ type: 'RemoveStory', code: `${PART_TWO_CODES.personalEntanglement}b` }],
      })
    // Entrega de paquete: el Apoyo bajo la Puerta de la cámara.
    const parcel = state.scenarioMeta?.[PACKAGE_ASSET]
    if (typeof parcel === 'string' && parcel && me.location === CODES.vaultDoor)
      options.push({
        key: `${PART_TWO_CODES.packageDelivery}:take`,
        label: 'ability.fof.packageTake',
        params: { card: parcel },
        actions: 1,
        provokes: true,
        then: [
          { type: 'PutAssetIntoPlay', investigator, code: parcel },
          { type: 'SetScenarioMeta', key: PACKAGE_ASSET, value: '' },
          { type: 'RemoveStory', code: PART_TWO_CODES.packageDelivery },
        ],
      })
    return options
  },
  forced: (state, trigger) => {
    const tracked = trackResources(state, trigger)
    if (trigger.type === 'turnBegins')
      return [
        ...tracked,
        { type: 'SetScenarioMeta', key: `${MOVES}${trigger.investigator}`, value: 0 },
      ]
    if (tracked.length) return tracked
    if (trigger.type === 'afterMove')
      return [
        {
          type: 'SetScenarioMeta',
          key: `${MOVES}${trigger.investigator}`,
          value: Number(state.scenarioMeta?.[`${MOVES}${trigger.investigator}`] ?? 0) + 1,
        },
      ]
    // Entrega de paquete: el enemigo llega a la Puerta de la cámara.
    if (
      trigger.type === 'enemyEntersLocation' &&
      trigger.location === CODES.vaultDoor &&
      state.scenarioMeta?.[PACKAGE] === trigger.enemy
    )
      return [specific('fofDelivered', { enemy: trigger.enemy })]
    if (trigger.type === 'enemyDefeated' && state.scenarioMeta?.[PACKAGE] === trigger.enemy.id)
      return [
        { type: 'SetScenarioMeta', key: PACKAGE, value: '' },
        { type: 'RemoveStory', code: PART_TWO_CODES.packageDelivery },
      ]
    // El portador del manantial es derrotado: el manantial queda en su Lugar.
    if (trigger.type === 'investigatorDefeated' && bearer(state) === trigger.investigator) {
      const at = getInvestigator(state, trigger.investigator).location
      return [
        { type: 'SetScenarioMeta', key: BEARER, value: '' },
        { type: 'SetScenarioMeta', key: DROPPED, value: at ?? '' },
      ]
    }
    if (trigger.type === 'enemyPhaseEnds') return [specific('fofEntanglement')]
    // Duplicado dimensional: si deja de estar enfrentado, se descarta.
    if (trigger.type === 'afterEvade' || trigger.type === 'turnEnds')
      return Object.values(state.enemies)
        .filter((e) => state.scenarioMeta?.[`${DUPLICATE}${e.id}`] && e.engagedWith === null)
        .map((e): Message => ({ type: 'DiscardEnemy', enemy: e.id }))
    return []
  },
  // Sala de contar: tras investigarla con éxito por 2 o más, gana 2 recursos (1 vez por turno).
  reactions: (state, trigger) =>
    trigger.type === 'skillTestEnded' &&
    trigger.kind === 'investigate' &&
    trigger.succeeded &&
    trigger.margin >= 2 &&
    trigger.location === CODES.countingRoom
      ? [
          {
            key: `${CODES.countingRoom}:resources`,
            investigator: trigger.investigator,
            label: 'ability.fof.countingRoom',
            limit: { per: 'turn' },
            then: [{ type: 'GainResources', investigator: trigger.investigator, amount: 2 }],
          },
        ]
      : [],
  specific: fofSpecificTwo,
})

// ---------------------------------------------------------------------------
// Planes y actos
// ---------------------------------------------------------------------------

for (const code of [CODES.openingHand, CODES.theTurn, CODES.allBetsDown])
  registerAgenda({
    code,
    forced: (state, trigger) => agendaForced(state, trigger),
    onAdvance: (state) => {
      // Farol descubierto: el Vagabundo dimensional y Plan al garete.
      if (code === CODES.openingHand)
        return [
          { type: 'Story', entry: entry('bluffCalled') },
          {
            type: 'SpawnSetAsideEnemy',
            code: PART_TWO_CODES.dimensionalShambler,
            location: CODES.rouletteWheel,
          },
          specific('fofShuffleIn', { set: 'shambles' }),
          specific('fofRaiseAll', { amount: 1 }),
        ]
      // Caos improbable: una Desaprobación de la fortuna al azar.
      if (code === CODES.theTurn)
        return [specific('fofDisfavor'), specific('fofRaiseAll', { amount: 1 })]
      // Desplumados: los que no desistieron son derrotados y sufren 1 trauma físico (→R3).
      return [
        ...state.investigators
          .filter((i) => !i.eliminated)
          .map((i): Message => ({ type: 'SufferTrauma', investigator: i.id, physical: 1 })),
        { type: 'EndScenario', outcome: resolution(3) },
      ]
    },
  })

registerAct({
  code: CODES.theTake,
  objectiveMet: (state) => bearer(state) !== null,
  // Reliquia conseguida: Abarran va a la Sala de reliquias o, si fue derrotado, el techo cae.
  onAdvance: (state) => {
    const abarran = Object.values(state.enemies).find((e) => e.code === CODES.abarranUnleashed)
    if (abarran)
      return [
        { type: 'Story', entry: entry('relicAcquired') },
        { type: 'MoveEnemy', enemy: abarran.id, location: CODES.relicRoom },
        { type: 'CheckEngagement', location: CODES.relicRoom },
      ]
    if (state.victoryDisplay.includes(CODES.abarranUnleashed))
      return [{ type: 'Story', entry: entry('relicFallen') }, specific('fofTheTakeFallen')]
    return []
  },
})

registerAct({
  code: CODES.theExit,
  objectiveMet: (state) => {
    const holder = bearer(state)
    return holder !== null && getInvestigator(state, holder).resigned
  },
  // ¡Libertad!: los que no desistieron son derrotados y sufren 1 trauma físico (→R1).
  onAdvance: (state) => [
    ...state.investigators
      .filter((i) => !i.eliminated)
      .map((i): Message => ({ type: 'SufferTrauma', investigator: i.id, physical: 1 })),
    { type: 'EndScenario', outcome: resolution(1) },
  ],
})

// ---------------------------------------------------------------------------
// Lugares de la noche ajetreada
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.casinoFloorBusy,
  abilities: (state, self, investigator) => {
    const me = getInvestigator(state, investigator)
    const resign = resignAbility(investigator, `${self.id}:resign`)
    const delivery =
      noted(state, 'fofImpersonatedAHighRoller') &&
      alarmOf(state, investigator) <= 6 &&
      me.resources >= 2 &&
      !state.stories?.[PART_TWO_CODES.packageDelivery]
    return [
      ...locationAbility(state, self.id, investigator, resign),
      ...(delivery
        ? locationAbility(state, self.id, investigator, {
            key: `${self.id}:delivery`,
            label: 'ability.fof.delivery',
            actions: 1,
            provokes: true,
            limit: { per: 'game', group: true },
            costs: [{ type: 'SpendResources', investigator, amount: 2 }],
            then: [specific('fofPackage', { investigator })],
          })
        : []),
    ]
  },
})

registerLocation({
  code: CODES.highRollersTableBusy,
  abilities: (state, self, investigator) =>
    gameAbility(state, investigator, 'medallion', 0).flatMap((a) =>
      locationAbility(state, self.id, investigator, a),
    ),
})

for (const code of [CODES.pokerTable, CODES.rouletteWheel, CODES.baccaratTable, CODES.slotMachines])
  registerLocation({
    code,
    abilities: (state, self, investigator) => {
      const game =
        code === CODES.pokerTable
          ? 'poker'
          : code === CODES.rouletteWheel
            ? 'roulette'
            : code === CODES.baccaratTable
              ? 'baccarat'
              : 'slots'
      // Parte I: la registra part-one con el mismo código; aquí solo cambia la oscuridad.
      return gameAbility(state, investigator, game, 0).flatMap((a) =>
        state.scenarioId === PART_TWO
          ? locationAbility(state, self.id, investigator, a)
          : [{ ...a, actions: a.actions + dealerTax(state, self.id) }],
      )
    },
  })

registerLocation({
  code: CODES.casinoLoungeBusy,
  // [action] Si encontrasteis el conducto: 2 pistas por investigador en grupo para pasar a la
  // Sala de guardias, revelar el Pasillo y abrir el conducto (límite de grupo, 1 por partida).
  abilities: (state, self, investigator) =>
    noted(state, 'fofFoundAVent') && cluesAt(state, self.id) >= 2 * players(state)
      ? locationAbility(state, self.id, investigator, {
          key: `${self.id}:vent`,
          label: 'ability.fof.openVent',
          actions: 1,
          provokes: true,
          limit: { per: 'game', group: true },
          costs: [{ type: 'SpendGroupClues', amount: 2 * players(state) }],
          then: [specific('fofVent', { investigator })],
        })
      : [],
})

// ---------------------------------------------------------------------------
// Lugares Restringido
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.staffAccessHallway,
  // Al revelarse: Abarran desatado aparece en el Despacho del dueño y Los elegidos de la
  // fortuna se barajan en el mazo con la pila de descartes.
  onReveal: () => [
    { type: 'SpawnSetAsideEnemy', code: CODES.abarranUnleashed, location: CODES.ownersOffice },
    specific('fofShuffleIn', { set: 'chosen' }),
  ],
})

registerLocation({
  code: CODES.securityOffice,
  abilities: (state, self, investigator) =>
    locationAbility(state, self.id, investigator, {
      key: `${self.id}:watch`,
      label: 'ability.fof.security',
      actions: 1,
      provokes: true,
      then: [
        {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.fof.security',
            choices: [1, 2, 3].map((n) => ({
              label: 'choice.fof.checkN',
              params: { n },
              then: [specific('fofSecurity', { investigator, n })],
            })),
          },
        },
      ],
    }),
})

registerLocation({
  code: CODES.guardRoom,
  abilities: (state, self, investigator) =>
    !Object.values(state.enemies).some((e) => e.location === self.id) &&
    self.clues === 0 &&
    noted(state, 'fofObtainedAnEmployeeUniform') &&
    !noted(state, 'fofImpersonatedAGuard')
      ? locationAbility(state, self.id, investigator, {
          key: `${self.id}:disguise`,
          label: 'ability.fof.disguise',
          actions: 1,
          provokes: true,
          then: [recordNote('fofImpersonatedAGuard')],
        })
      : [],
})

registerLocation({
  code: CODES.ownersOffice,
  abilities: (state, self, investigator) =>
    self.clues === 0 && !noted(state, 'fofFoundAbarransSigil')
      ? locationAbility(state, self.id, investigator, {
          key: `${self.id}:sigil`,
          label: 'ability.fof.sigil',
          actions: 1,
          provokes: true,
          then: [recordNote('fofFoundAbarransSigil')],
        })
      : [],
})

registerLocation({
  code: CODES.countingRoom,
  // [action] Los investigadores de aquí gastan 10 recursos por investigador en grupo (5 si
  // encontrasteis el conducto): «conseguisteis un plano».
  abilities: (state, self, investigator) => {
    const cost = (noted(state, 'fofFoundAVent') ? 5 : 10) * players(state)
    const pool = state.investigators
      .filter((i) => !i.eliminated && i.location === self.id)
      .reduce((sum, i) => sum + i.resources, 0)
    return pool >= cost && !noted(state, 'fofObtainedASchematic')
      ? locationAbility(state, self.id, investigator, {
          key: `${self.id}:schematic`,
          label: 'ability.fof.schematic',
          params: { amount: cost },
          actions: 1,
          provokes: true,
          costs: [
            specific('fofSpendResourcesAt', { investigator, location: self.id, amount: cost }),
          ],
          then: [recordNote('fofObtainedASchematic')],
        })
      : []
  },
})

registerLocation({
  code: CODES.vaultDoor,
  abilities: (state, self, investigator) => {
    const options: AbilityOption[] = [
      // [action] Moverse: comprueba 1 icono (con el plano, cambiar cartas hasta dos veces).
      {
        key: `${self.id}:move`,
        label: 'ability.fof.vaultMove',
        actions: 1,
        provokes: true,
        then: [
          specific('fofCheck', {
            investigator,
            game: 'vault',
            mulligans: noted(state, 'fofObtainedASchematic') ? 2 : 0,
          }),
        ],
      },
    ]
    // Sala de reliquias sin revelar: prueba [willpower] o [agility] (4) para abrirla.
    if (state.locations[CODES.relicRoom] && !state.locations[CODES.relicRoom]!.revealed) {
      const sigil = noted(state, 'fofFoundAbarransSigil')
      const reveal: Message = {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.fof.openRelicRoom',
          choices: [
            {
              label: 'choice.fof.openRelicRoom',
              params: { amount: 4 * players(state) },
              then: [
                { type: 'SpendGroupClues', amount: 4 * players(state) },
                { type: 'RevealLocation', location: CODES.relicRoom },
              ],
            },
            { label: 'choice.skip', then: [] },
          ],
        },
      }
      options.push({
        key: `${self.id}:relic`,
        label: 'ability.fof.vaultRelic',
        actions: 1,
        provokes: true,
        costs: sigil ? [] : [{ type: 'TakeDamage', investigator, damage: 1, horror: 1 }],
        then: [
          chooseSkillTest(investigator, CODES.vaultDoor, ['willpower', 'agility'], 4, {
            onSuccess: cluesAt(state, self.id) >= 4 * players(state) ? [reveal] : [],
          }),
        ],
      })
    }
    return options.flatMap((o) => locationAbility(state, self.id, investigator, o))
  },
})

registerLocation({
  code: CODES.relicRoom,
  onReveal: () => [specific('fofRelicRevealed')],
  // [action] Sin pistas aquí: toma el control de El manantial de fortuna.
  abilities: (state, self, investigator) =>
    self.clues === 0 && bearer(state) === null && !state.scenarioMeta?.[DROPPED]
      ? locationAbility(state, self.id, investigator, {
          key: `${self.id}:wellspring`,
          label: 'ability.fof.takeWellspring',
          actions: 1,
          provokes: true,
          then: [specific('fofTakeWellspring', { investigator })],
        })
      : [],
})

// ---------------------------------------------------------------------------
// Isamara Ordoñez (Banda) y Carro de dinero
// ---------------------------------------------------------------------------

registerPlayerCard({
  code: PART_TWO_CODES.isamaraCrew,
  // [action] Negociar: toma el control de Isamara.
  placedAbilities: (_state, self, investigator) => [
    {
      key: `${self.id}:recruit`,
      label: 'ability.fof.recruitIsamara',
      actions: 1,
      provokes: false,
      parley: true,
      target: { type: 'placed', id: self.id },
      then: [{ type: 'TakeControlOfPlaced', placed: self.id, investigator }],
    },
  ],
  // [action] Si la controlas: Negociar. Evita a todos los Casino de tu Lugar y prueba
  // [willpower] (3) (si fallas, pierdes 2 acciones). Límite de grupo: 1 por partida.
  abilities: (state, self, investigator) =>
    self.owner === investigator
      ? [
          {
            key: `${PART_TWO_CODES.isamaraCrew}:song`,
            label: 'ability.fof.mesmerize',
            actions: 1,
            provokes: false,
            parley: true,
            limit: { per: 'game', group: true },
            then: [specific('fofMesmerize', { investigator })],
          },
        ]
      : [],
})

registerPlayerCard({
  code: CODES.cashCart,
  // [fast]: mueve el Carro de dinero a un Lugar conectado.
  placedAbilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (here === null || self.placement.type !== 'location') return []
    return [
      {
        key: `${self.id}:push`,
        label: 'ability.fof.pushCart',
        actions: 0,
        provokes: false,
        target: { type: 'placed', id: self.id },
        then: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.fof.pushCart',
              choices: (state.locations[here]?.connections ?? []).map((to: LocationId) => ({
                label: 'choice.location',
                params: { location: state.locations[to]?.name ?? to },
                target: { type: 'location' as const, id: to },
                then: [
                  {
                    type: 'MovePlacedAsset',
                    placed: self.id,
                    placement: { type: 'location', location: to },
                  } as Message,
                ],
              })),
            },
          },
        ],
      },
    ]
  },
  // Cuando un enemigo se enfrentaría a ti: 1 daño al carro y, hasta el final de la ronda, los
  // enemigos de este Lugar no pueden enfrentarse a ti (al aplicarse ya enfrentado, se desenfrenta).
  placedReactions: (state, trigger, self) => {
    if (trigger.type !== 'afterEngage' || self.placement.type !== 'location') return []
    const who = getInvestigator(state, trigger.investigator)
    if (who.location !== self.placement.location) return []
    return [
      {
        key: `${self.id}:hide`,
        investigator: who.id,
        label: 'ability.fof.hideInCart',
        then: [
          { type: 'DamagePlacedAsset', placed: self.id, damage: 1, horror: 0 },
          specific('fofCartProtect', { investigator: who.id, enemy: trigger.enemy }),
        ],
      },
    ]
  },
})
