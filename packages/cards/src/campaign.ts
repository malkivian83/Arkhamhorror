/**
 * Partida de campaña: lo que dura entre escenarios. El registro de campaña lo
 * escribe el motor durante cada escenario (notas, experiencia, trauma…); aquí
 * se guarda, se usa para preparar el siguiente escenario y se gasta la
 * experiencia en mejorar los mazos (reglamento, "Deck Customization", y guía de
 * campaña, "Earning and Spending Experience").
 */
import {
  createGame,
  emptyCampaignLog,
  playerCardBehavior,
  type CampaignLog,
  type CardCode,
  type GameState,
  type InvestigatorId,
  type PlayerCardDef,
  type ScenarioDefinition,
  type ScenarioOutcome,
} from '@lcg/engine'
import { BRETHREN_OF_ASH, type Difficulty } from './brethren-of-ash/campaign'
import { queenOfAsh } from './brethren-of-ash/queen-of-ash'
import { smokeAndMirrors } from './brethren-of-ash/smoke-and-mirrors'
import { DR_ARMITAGE, spreadingFlames } from './brethren-of-ash/spreading-flames'
import {
  code,
  investigatorSetup,
  playerCards,
  starterDeck,
  STARTER_DECKS,
} from './core-2026/player-cards'
// Comportamiento de las cartas: hace falta para saber cuáles se pueden comprar.
import './core-2026/cards'
import './core-2026/investigators'
import './core-2026/upgrades'
import './core-2026/weaknesses'

export type DeckKey = keyof typeof STARTER_DECKS

export interface CampaignInvestigator {
  id: InvestigatorId
  /** Mazo actual (sin los apoyos de historia, que se añaden al empezar cada escenario). */
  deck: CardCode[]
}

export interface ScenarioResult {
  scenario: string
  outcome: ScenarioOutcome
  /** Experiencia ganada en el escenario por cada investigador. */
  xp: Record<InvestigatorId, number>
}

export interface Campaign {
  id: typeof BRETHREN_OF_ASH.id
  difficulty: Difficulty
  /** Escenario que toca jugar (índice en BRETHREN_OF_ASH.scenarios). */
  scenarioIndex: number
  investigators: CampaignInvestigator[]
  log: CampaignLog
  results: ScenarioResult[]
}

interface ScenarioEntry {
  build: (campaign: Campaign, seed: number, players: number) => ScenarioDefinition
  /** Apoyos de historia que el escenario pone en juego en vez de barajarlos en el mazo. */
  storyAssetsInPlay?: CardCode[]
}

/** Escenarios de Brethren of Ash que ya se pueden jugar. */
const SCENARIOS: Record<string, ScenarioEntry> = {
  'spreading-flames': { build: (c) => spreadingFlames(c.difficulty) },
  'smoke-and-mirrors': {
    build: (c, seed, players) =>
      smokeAndMirrors({ difficulty: c.difficulty, log: c.log, seed, players }),
    storyAssetsInPlay: [DR_ARMITAGE],
  },
  'queen-of-ash': {
    build: (c, seed) =>
      queenOfAsh({
        difficulty: c.difficulty,
        log: c.log,
        seed,
        investigators: activeMembers(c).map((i) => i.id),
      }),
  },
}

export function newCampaign(decks: DeckKey[], difficulty: Difficulty): Campaign {
  const investigators = decks.map((key) => {
    const list = STARTER_DECKS[key]
    if (!list) throw new Error(`Mazo desconocido: ${key}`)
    return { id: code(list.investigator), deck: starterDeck(key) }
  })
  return {
    id: BRETHREN_OF_ASH.id,
    difficulty,
    scenarioIndex: 0,
    investigators,
    log: emptyCampaignLog(investigators.map((i) => i.id)),
    results: [],
  }
}

/** Id del escenario que toca jugar, o null si la campaña ha terminado. */
export function currentScenario(campaign: Campaign): string | null {
  return BRETHREN_OF_ASH.scenarios[campaign.scenarioIndex] ?? null
}

/** Investigadores que siguen en la campaña (ni muertos ni enloquecidos). */
export function activeMembers(campaign: Campaign): CampaignInvestigator[] {
  return campaign.investigators.filter((i) => {
    const record = campaign.log.investigators[i.id]
    return !record?.killed && !record?.insane
  })
}

/** El escenario que toca ya se puede jugar. */
export function canPlayNext(campaign: Campaign): boolean {
  const id = currentScenario(campaign)
  return id !== null && id in SCENARIOS && activeMembers(campaign).length > 0
}

/** Prepara el escenario que toca con el estado de la campaña (trauma, bolsa del caos). */
export function startScenario(campaign: Campaign, seed: number, interactive = true): GameState {
  const id = currentScenario(campaign)
  const entry = id ? SCENARIOS[id] : undefined
  if (!entry) throw new Error(`Escenario no disponible: ${id}`)
  const members = activeMembers(campaign)
  const scenario = entry.build(campaign, seed, members.length)
  return createGame({
    seed,
    difficulty: campaign.difficulty,
    interactive,
    campaignLog: campaign.log,
    // Reglamento: en campaña, la bolsa del caos sigue como acabó el escenario anterior.
    scenario: { ...scenario, chaosBag: [...scenario.chaosBag, ...campaign.log.chaosTokens] },
    investigators: members.map((i) => {
      const record = campaign.log.investigators[i.id]
      // Los apoyos de historia y debilidades ganados van en el mazo (salvo los que el
      // escenario pone en juego).
      const earned = (record?.storyAssets ?? []).filter(
        (code) => !entry.storyAssetsInPlay?.includes(code),
      )
      return {
        ...investigatorSetup(i.id, [...i.deck, ...earned]),
        physicalTrauma: record?.physicalTrauma ?? 0,
        mentalTrauma: record?.mentalTrauma ?? 0,
      }
    }),
  })
}

/** Cierra el escenario terminado: guarda su registro y pasa al siguiente. */
export function finishScenario(campaign: Campaign, game: GameState): Campaign {
  if (!game.outcome) throw new Error('El escenario aún no ha terminado')
  const log = game.campaignLog ?? campaign.log
  const xp = Object.fromEntries(
    campaign.investigators.map((i) => [
      i.id,
      (log.investigators[i.id]?.xp ?? 0) - (campaign.log.investigators[i.id]?.xp ?? 0),
    ]),
  )
  return {
    ...campaign,
    scenarioIndex: campaign.scenarioIndex + 1,
    log,
    results: [...campaign.results, { scenario: game.scenarioId, outcome: game.outcome, xp }],
  }
}

// ---------------------------------------------------------------------------
// Mejorar el mazo con experiencia
// ---------------------------------------------------------------------------

/** Tamaño del mazo de los investigadores de la caja básica (sin contar debilidades). */
export const DECK_SIZE = 30

interface DeckOption {
  classes: string[]
  maxLevel: number
}

/** Opciones de construcción del reverso de cada investigador (datos públicos de ArkhamDB). */
const DECK_OPTIONS: Record<CardCode, DeckOption[]> = {
  '12001': [
    { classes: ['guardian', 'neutral'], maxLevel: 5 },
    { classes: ['survivor'], maxLevel: 2 },
  ],
  '12004': [
    { classes: ['seeker', 'neutral'], maxLevel: 5 },
    { classes: ['guardian'], maxLevel: 2 },
  ],
  '12007': [
    { classes: ['rogue', 'neutral'], maxLevel: 5 },
    { classes: ['seeker'], maxLevel: 2 },
  ],
  '12010': [
    { classes: ['mystic', 'neutral'], maxLevel: 5 },
    { classes: ['rogue'], maxLevel: 2 },
  ],
  '12013': [
    { classes: ['survivor', 'neutral'], maxLevel: 5 },
    { classes: ['mystic'], maxLevel: 2 },
  ],
}

/** Cartas exclusivas (y su debilidad): las dos que siguen a cada investigador en la caja. */
function isSignature(card: CardCode): boolean {
  const position = Number(card.slice(2))
  return Object.keys(DECK_OPTIONS).some((i) => {
    const p = Number(i.slice(2))
    return position === p + 1 || position === p + 2
  })
}

const byCode = (card: CardCode): PlayerCardDef | undefined =>
  playerCards.find((c) => c.code === card)
const level = (card: CardCode) => byCode(card)?.xp ?? 0

/** Cartas que ya funcionan en el motor: las de los mazos iniciales y las que tienen comportamiento. */
const STARTER_CARDS = new Set(Object.keys(STARTER_DECKS).flatMap((key) => starterDeck(key)))
export function isImplemented(card: CardCode): boolean {
  return STARTER_CARDS.has(card) || playerCardBehavior(card) !== undefined
}

/** Cuenta para el tamaño del mazo (ni las debilidades ni las cartas exclusivas obligatorias). */
const countsForSize = (card: CardCode) => !byCode(card)?.weakness && !isSignature(card)

/** Cartas del mazo que cuentan para su tamaño. */
export const deckSize = (deck: CardCode[]) => deck.filter(countsForSize).length

export interface PurchaseOption {
  code: CardCode
  name: string
  level: number
  /** Experiencia que cuesta. */
  cost: number
  /** Versión de menor nivel del mazo que se sustituye al mejorarla. */
  replaces?: CardCode
  /** Hace falta quitar otra carta para no pasar del tamaño del mazo. */
  needsRemoval: boolean
  implemented: boolean
}

function member(campaign: Campaign, investigator: InvestigatorId): CampaignInvestigator {
  const found = campaign.investigators.find((i) => i.id === investigator)
  if (!found) throw new Error(`Investigador fuera de la campaña: ${investigator}`)
  return found
}

/** Cartas que el investigador puede comprar o mejorar con su experiencia actual. */
export function purchaseOptions(
  campaign: Campaign,
  investigator: InvestigatorId,
): PurchaseOption[] {
  const { deck } = member(campaign, investigator)
  const xp = campaign.log.investigators[investigator]?.xp ?? 0
  const options = DECK_OPTIONS[investigator] ?? []
  const full = deckSize(deck) >= DECK_SIZE
  return playerCards
    .filter(
      (card) =>
        card.type !== 'investigator' &&
        !card.weakness &&
        !isSignature(card.code) &&
        options.some((o) => o.classes.includes(card.class) && (card.xp ?? 0) <= o.maxLevel),
    )
    .flatMap((card): PurchaseOption[] => {
      const base = {
        code: card.code,
        name: card.name,
        level: card.xp ?? 0,
        implemented: isImplemented(card.code),
      }
      const copies = deck.filter((c) => byCode(c)?.name === card.name)
      // Mejora: una copia de menor nivel del mismo título pasa a la nueva versión.
      const lower = copies.find((c) => level(c) < base.level)
      const upgrade: PurchaseOption[] = lower
        ? [{ ...base, cost: base.level - level(lower), replaces: lower, needsRemoval: false }]
        : []
      // Carta nueva: como máximo 2 copias por título; cuesta al menos 1 experiencia.
      const add: PurchaseOption[] =
        copies.length < 2 ? [{ ...base, cost: Math.max(1, base.level), needsRemoval: full }] : []
      return [...upgrade, ...add].filter((o) => o.cost <= xp)
    })
}

/** Cartas que se pueden quitar del mazo para hacer sitio (ni debilidades ni exclusivas). */
export function removableCards(campaign: Campaign, investigator: InvestigatorId): CardCode[] {
  const { deck } = member(campaign, investigator)
  return [...new Set(deck.filter(countsForSize))]
}

/**
 * Compra una carta (o mejora una de menor nivel) gastando experiencia. Si el
 * mazo está completo, `remove` es la carta que sale para hacer sitio.
 */
export function purchase(
  campaign: Campaign,
  investigator: InvestigatorId,
  card: CardCode,
  options: { remove?: CardCode; upgrade?: boolean } = {},
): Campaign {
  const option = purchaseOptions(campaign, investigator).find(
    (o) => o.code === card && !!o.replaces === !!options.upgrade,
  )
  if (!option) throw new Error(`No se puede comprar ${card}`)
  if (!option.implemented) throw new Error(`${option.name} aún no está implementada`)
  const out = option.replaces ?? (option.needsRemoval ? options.remove : undefined)
  if (option.needsRemoval && (!out || !removableCards(campaign, investigator).includes(out))) {
    throw new Error('Hay que quitar una carta para no pasar del tamaño del mazo')
  }
  const deck = [...member(campaign, investigator).deck]
  if (out) deck.splice(deck.indexOf(out), 1)
  deck.push(card)
  const record = campaign.log.investigators[investigator]
  if (!record) throw new Error(`Sin registro de campaña: ${investigator}`)
  return {
    ...campaign,
    investigators: campaign.investigators.map((i) => (i.id === investigator ? { ...i, deck } : i)),
    log: {
      ...campaign.log,
      investigators: {
        ...campaign.log.investigators,
        [investigator]: { ...record, xp: record.xp - option.cost },
      },
    },
  }
}
