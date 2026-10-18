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
  isPermanent,
  playerCardBehavior,
  playerCardDef,
  treacheryBehavior,
  investigatorBehavior,
  type CampaignLog,
  type CardCode,
  type Difficulty,
  type GameState,
  type InvestigatorId,
  type PlayerCardDef,
  type ScenarioOutcome,
  type ExperienceGain,
} from '@lcg/engine'
import { campaignDefinition, type CampaignScenario } from './campaign-definition'
import { withRandomBasicWeakness } from './decks'
import {
  code,
  investigatorSetup,
  playerCards,
  starterDeck,
  STARTER_DECKS,
} from './core-2026/player-cards'
// Campañas registradas.
import './brethren-of-ash/definition'
import './midwinter-gala/definition'
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
  experience?: ExperienceGain[]
}

export interface Campaign {
  /** Id de la definición de campaña. */
  id: string
  difficulty: Difficulty
  /** Escenario que toca jugar (índice en los escenarios de la definición). */
  scenarioIndex: number
  investigators: CampaignInvestigator[]
  log: CampaignLog
  results: ScenarioResult[]
}

/** Un investigador con su mazo: un mazo inicial de la caja o una lista propia. */
export type CampaignMember = DeckKey | { investigator: CardCode; cards: CardCode[] }

export function newCampaign(
  campaignId: string,
  members: CampaignMember[],
  difficulty: Difficulty,
  seed = 1,
): Campaign {
  campaignDefinition(campaignId)
  if (members.length < 1 || members.length > 4)
    throw new Error('La campaña necesita de 1 a 4 investigadores')
  const investigators = members.map((member, n) => {
    if (typeof member !== 'string') {
      // Un mazo propio sin debilidad básica recibe una al azar (reglamento).
      return { id: member.investigator, deck: withRandomBasicWeakness(member.cards, seed + n) }
    }
    const list = STARTER_DECKS[member]
    if (!list) throw new Error(`Mazo desconocido: ${member}`)
    return { id: code(list.investigator), deck: starterDeck(member) }
  })
  if (new Set(investigators.map((i) => i.id)).size !== investigators.length)
    throw new Error('Un investigador no puede repetirse')
  if (
    investigators.some((i) => !playerCardDef(i.id) || i.deck.some((code) => !playerCardDef(code)))
  )
    throw new Error('Contenido de mazo desconocido')
  return {
    id: campaignId,
    difficulty,
    scenarioIndex: 0,
    investigators,
    log: emptyCampaignLog(investigators.map((i) => i.id)),
    results: [],
  }
}

/** Escenario que toca jugar, o null si la campaña ha terminado. */
function scenarioEntry(campaign: Campaign): CampaignScenario | null {
  return campaignDefinition(campaign.id).scenarios[campaign.scenarioIndex] ?? null
}

/** Id del escenario que toca jugar, o null si la campaña ha terminado. */
export function currentScenario(campaign: Campaign): string | null {
  return scenarioEntry(campaign)?.id ?? null
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
  return !!scenarioEntry(campaign)?.build && activeMembers(campaign).length > 0
}

/** Prepara el escenario que toca con el estado de la campaña (trauma, bolsa del caos). */
export function startScenario(campaign: Campaign, seed: number, interactive = true): GameState {
  const entry = scenarioEntry(campaign)
  if (!entry?.build) throw new Error(`Escenario no disponible: ${entry?.id ?? '—'}`)
  const definition = campaignDefinition(campaign.id)
  const members = activeMembers(campaign)
  if (!members.length) throw new Error('No quedan investigadores que puedan continuar')
  const scenario = entry.build({
    difficulty: campaign.difficulty,
    log: campaign.log,
    seed,
    investigators: members.map((i) => i.id),
  })
  return createGame({
    seed,
    difficulty: campaign.difficulty,
    interactive,
    campaignLog: campaign.log,
    scenario: {
      ...scenario,
      ...(campaign.scenarioIndex === 0 && definition.prologue
        ? { prologue: definition.prologue }
        : {}),
      // Reglamento: en campaña, la bolsa del caos sigue como acabó el escenario anterior.
      chaosBag: [...scenario.chaosBag, ...campaign.log.chaosTokens],
    },
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
  if (game.scenarioId !== currentScenario(campaign) || game.difficulty !== campaign.difficulty)
    throw new Error('El resultado no pertenece al escenario actual de esta campaña')
  const played = game.campaignLog ?? campaign.log
  // La experiencia no baja de 0 (Dead Ends puede restar más de lo ganado).
  const log = {
    ...played,
    investigators: Object.fromEntries(
      Object.entries(played.investigators).map(([id, r]) => [id, { ...r, xp: Math.max(0, r.xp) }]),
    ),
  }
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
    results: [
      ...campaign.results,
      {
        scenario: game.scenarioId,
        outcome: game.outcome,
        xp,
        ...(game.experience ? { experience: game.experience } : {}),
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Mejorar el mazo con experiencia
// ---------------------------------------------------------------------------

/** Tamaño del mazo si la carta del investigador no lo indica (sin contar debilidades). */
export const DECK_SIZE = 30

/** Tamaño del mazo de un investigador (más lo que añaden sus cartas, como Collector). */
export const deckSizeOf = (investigator: InvestigatorId, deck: CardCode[] = []) =>
  (byCode(investigator)?.deckSize ?? DECK_SIZE) +
  [...new Set(deck)].reduce((n, code) => n + (playerCardDef(code)?.deckSizeBonus ?? 0), 0)

/** Cartas exclusivas (y debilidades exclusivas) de cualquier investigador. */
const SIGNATURES = new Set(playerCards.flatMap((c) => c.signatures ?? []))
const isSignature = (card: CardCode) => SIGNATURES.has(card)

const byCode = (card: CardCode): PlayerCardDef | undefined =>
  playerCards.find((c) => c.code === card)
const level = (card: CardCode) => byCode(card)?.xp ?? 0

/** Content with a registered implementation, including cards with printed data only. */
export function isImplemented(card: CardCode): boolean {
  return !!(playerCardBehavior(card) || treacheryBehavior(card) || investigatorBehavior(card))
}

/** Cuenta para el tamaño del mazo (ni debilidades, ni exclusivas, ni permanentes). */
const countsForSize = (card: CardCode) =>
  !byCode(card)?.weakness && !isSignature(card) && !isPermanent(card)

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
  const options = byCode(investigator)?.deckOptions ?? []
  const full = deckSize(deck) >= deckSizeOf(investigator, deck)
  return playerCards
    .filter(
      (card) =>
        card.type !== 'investigator' &&
        !card.weakness &&
        !card.reward &&
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
      const lower = copies.find((c) => level(c) < base.level && !isPermanent(c))
      const upgrade: PurchaseOption[] = lower
        ? [{ ...base, cost: base.level - level(lower), replaces: lower, needsRemoval: false }]
        : []
      // Carta nueva: como máximo 2 copias por título; cuesta al menos 1 experiencia.
      const add: PurchaseOption[] =
        copies.length < 2
          ? [
              {
                ...base,
                cost: Math.max(1, base.level),
                needsRemoval: full && !isPermanent(card.code),
              },
            ]
          : []
      return [...upgrade, ...add].filter((o) => o.cost <= xp)
    })
}

/**
 * Cartas que se pueden quitar del mazo para hacer sitio: las que cuentan para su
 * tamaño (las permanentes no se pueden quitar una vez añadidas, FAQ).
 */
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
