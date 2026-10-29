/**
 * Mazos propios: lista de cartas de un investigador, su validación según las
 * reglas de construcción (reglamento, "Deck Customization") e importación desde
 * ArkhamDB.
 */
import {
  allPlayerCardDefs,
  customizedCard,
  customizationCost,
  validCustomizations,
  type Customizations,
  deckOptionAllows,
  isPermanent,
  nextInt,
  offClassAllowed,
  playerCardDef,
  seedRng,
  type CardCode,
  type ExtraDeckOption,
  type PlayerCardDef,
} from '@lcg/engine'
import { isImplemented } from './campaign'
import { playerCards, starterDeck, STARTER_DECKS } from './core-2026/player-cards'
import { onePrintingEach } from './reprints'
import { startingExperience, startingExperienceSpent } from './survivor-deck/card-08125'

export interface DeckList {
  customizations?: Customizations
  id: string
  name: string
  investigator: CardCode
  /** Todas las cartas del mazo, con las exclusivas y las debilidades. */
  cards: CardCode[]
}

const byCode = (code: CardCode): PlayerCardDef | undefined =>
  playerCards.find((c) => c.code === code) ?? playerCardDef(code)

/** Investigadores con reglas de construcción (los que se pueden elegir). */
export const investigatorCards = () =>
  allPlayerCardDefs().filter((c) => c.type === 'investigator' && c.deckOptions)

const SIGNATURES = new Set(allPlayerCardDefs().flatMap((c) => c.signatures ?? []))
const isWeakness = (code: CardCode) => !!byCode(code)?.weakness
const isBasicWeakness = (code: CardCode) => byCode(code)?.weakness === 'basicweakness'
/** ArkhamDB placeholder, replaced by an actual weakness when starting a campaign. */
export const RANDOM_BASIC_WEAKNESS = '01000'

/** Cartas que el jugador elige (ni exclusivas ni debilidades). */
export const isStandard = (code: CardCode) =>
  code !== RANDOM_BASIC_WEAKNESS &&
  !isWeakness(code) &&
  !SIGNATURES.has(code) &&
  !byCode(code)?.story
/** Cuentan para el tamaño del mazo: las elegidas que no son permanentes. */
const countsForSize = (code: CardCode) => isStandard(code) && !isPermanent(code)

/** Lo que amplía las cartas permitidas: recompensas ganadas y cartas ya en el mazo. */
export interface PoolExtras {
  /** Cartas de recompensa ganadas en campañas. */
  rewards?: CardCode[]
  /** Cartas del mazo (las que dan opciones de construcción adicionales, como Collector). */
  deck?: CardCode[]
}

/** Opciones de construcción adicionales que dan las cartas del mazo. */
const extraOptions = (deck: CardCode[]): ExtraDeckOption[] =>
  [...new Set(deck)].flatMap((code) => {
    const option = byCode(code)?.extraDeckOption
    return option ? [option] : []
  })

const matchesExtra = (card: PlayerCardDef, option: ExtraDeckOption) =>
  card.type === option.type &&
  (card.xp ?? 0) <= option.maxLevel &&
  card.traits.some((t) => option.traits.includes(t))

/** Permitida por las opciones de clase y nivel del investigador. */
function byClass(investigator: CardCode, card: PlayerCardDef): boolean {
  const def = byCode(investigator)
  return (
    card.type !== 'investigator' &&
    isStandard(card.code) &&
    !card.reward &&
    !!def &&
    !card.traits.some((trait) => def.excludedDeckTraits?.includes(trait)) &&
    ((def.deckOptions ?? []).some((o) => deckOptionAllows(o, card)) || offClassAllowed(def, card))
  )
}

/**
 * Cartas que este investigador puede incluir: las de sus opciones de construcción,
 * las recompensas ganadas y las que permiten las opciones adicionales del mazo.
 */
export function cardPool(investigator: CardCode, extras: PoolExtras = {}): PlayerCardDef[] {
  const options = extraOptions(extras.deck ?? [])
  const rewards = new Set(extras.rewards ?? [])
  const all = [
    ...playerCards,
    ...allPlayerCardDefs().filter((c) => !playerCards.some((p) => p.code === c.code)),
  ]
  return onePrintingEach(
    all.filter(
      (card) =>
        isImplemented(card.code) &&
        !card.traits.some((trait) => byCode(investigator)?.excludedDeckTraits?.includes(trait)) &&
        (byClass(investigator, card) ||
          (card.reward && rewards.has(card.code)) ||
          (isStandard(card.code) && !card.reward && options.some((o) => matchesExtra(card, o)))),
    ),
  )
}

/** Cartas de mazo que pide el investigador más las que añaden sus cartas (Collector). */
export function requiredDeckSize(investigator: CardCode, deck: CardCode[] = []): number {
  const bonus = [...new Set(deck)].reduce((n, code) => n + (byCode(code)?.deckSizeBonus ?? 0), 0)
  return (byCode(investigator)?.deckSize ?? 30) + bonus
}

export type DeckProblem =
  | { key: 'deck.problem.customizations' }
  | { key: 'deck.problem.unimplemented'; params: { card: string } }
  | { key: 'deck.problem.unknownInvestigator' }
  | { key: 'deck.problem.size'; params: { n: number; size: number } }
  | { key: 'deck.problem.notAllowed'; params: { card: string } }
  | { key: 'deck.problem.offClassLimit'; params: { n: number } }
  | { key: 'deck.problem.classMinimum'; params: { count: number; min: number } }
  | { key: 'deck.problem.tooManyCopies'; params: { card: string; n: number } }
  | { key: 'deck.problem.missingSignature'; params: { card: string } }
  | { key: 'deck.problem.otherSignature'; params: { card: string } }
  | { key: 'deck.problem.levelAtStart'; params: { card: string } }
  | { key: 'deck.problem.unknownCard'; params: { card: string } }
  | { key: 'deck.problem.rewardNotEarned'; params: { card: string } }

export interface DeckCheck {
  /** Errores: el mazo no se puede usar. */
  problems: DeckProblem[]
  /** Cartas pendientes: se conservan en la lista, pero bloquean el inicio. */
  unimplemented: CardCode[]
  /** Falta la debilidad básica: se añadirá una al azar al empezar la campaña. */
  needsBasicWeakness: boolean
  /** Cartas que cuentan para el tamaño. */
  size: number
}

/**
 * Comprueba un mazo con las reglas de construcción. `campaignStart`: al empezar
 * una campaña los niveles deben caber en la experiencia inicial concedida.
 * `rewards`: recompensas ganadas.
 */
export function validateDeck(
  deck: DeckList,
  campaignStart = true,
  rewards: CardCode[] = [],
): DeckCheck {
  const investigator = byCode(deck.investigator)
  if (!investigator?.deckOptions || !isImplemented(investigator.code)) {
    return {
      problems: [{ key: 'deck.problem.unknownInvestigator' }],
      unimplemented: [],
      needsBasicWeakness: false,
      size: 0,
    }
  }
  const problems: DeckProblem[] = []
  if (!validCustomizations(deck.cards, deck.customizations))
    problems.push({ key: 'deck.problem.customizations' })
  const cardFor = (code: string) => {
    const card = byCode(code)
    return card ? customizedCard(card, deck.customizations) : undefined
  }
  const overStartingBudget =
    campaignStart &&
    startingExperienceSpent(deck.cards, deck.customizations) > startingExperience(deck.cards)
  const name = (code: CardCode) => byCode(code)?.name ?? code
  const own = new Set(investigator.signatures ?? [])
  // Opciones adicionales (Collector): cuántas cartas fuera de clase puede llevar.
  let extraSlots = extraOptions(deck.cards).reduce((n, o) => n + o.count, 0)
  const offClass = investigator.offClassLevelZeroLimit
  if (offClass !== undefined) {
    const count = deck.cards.filter((code) => {
      const c = cardFor(code)
      return (
        c &&
        isStandard(code) &&
        !c.reward &&
        !investigator.deckOptions!.some((o) => deckOptionAllows(o, c))
      )
    }).length
    if (count > offClass)
      problems.push({ key: 'deck.problem.offClassLimit', params: { n: offClass } })
  }
  const extraFor = (card: PlayerCardDef) => {
    const options = extraOptions(deck.cards)
    const copies = deck.cards.filter((c) => c === card.code).length
    if (!options.some((o) => matchesExtra(card, o)) || copies > extraSlots) return false
    extraSlots -= copies
    return true
  }

  for (const code of new Set(deck.cards)) {
    if (code === RANDOM_BASIC_WEAKNESS) continue
    const card = cardFor(code)
    if (!card) {
      problems.push({ key: 'deck.problem.unknownCard', params: { card: code } })
      continue
    }
    if (!isImplemented(code)) {
      problems.push({ key: 'deck.problem.unimplemented', params: { card: card.name } })
    }
    if (SIGNATURES.has(code) && !own.has(code)) {
      problems.push({ key: 'deck.problem.otherSignature', params: { card: card.name } })
    } else if (card.traits.some((trait) => investigator.excludedDeckTraits?.includes(trait))) {
      problems.push({ key: 'deck.problem.notAllowed', params: { card: card.name } })
    } else if (card.reward) {
      if (!rewards.includes(code)) {
        problems.push({ key: 'deck.problem.rewardNotEarned', params: { card: card.name } })
      }
    } else if (isStandard(code) && !byClass(deck.investigator, card) && !extraFor(card)) {
      problems.push({ key: 'deck.problem.notAllowed', params: { card: card.name } })
    } else if (overStartingBudget && isStandard(code) && (card.xp ?? 0) > 0) {
      problems.push({ key: 'deck.problem.levelAtStart', params: { card: card.name } })
    }
  }

  // Máximo 2 copias por título (o el límite de la carta); cuentan juntas las
  // versiones de distinto nivel.
  const perTitle = new Map<string, { n: number; limit: number }>()
  for (const code of deck.cards.filter(isStandard)) {
    const title = name(code)
    const limit = byCode(code)?.deckLimit ?? 2
    const seen = perTitle.get(title)
    perTitle.set(title, { n: (seen?.n ?? 0) + 1, limit: Math.min(seen?.limit ?? limit, limit) })
  }
  for (const [title, { n, limit }] of perTitle) {
    if (n > limit) problems.push({ key: 'deck.problem.tooManyCopies', params: { card: title, n } })
  }

  // Lola Hayes: al menos `min` cartas de cada una de `count` clases distintas.
  const minimum = investigator.classMinimum
  if (minimum) {
    const reached = minimum.classes.filter(
      (cls) =>
        deck.cards.filter((code) => {
          const c = byCode(code)
          return !!c && isStandard(code) && (c.classes ?? [c.class]).includes(cls)
        }).length >= minimum.min,
    )
    if (reached.length < minimum.count)
      problems.push({
        key: 'deck.problem.classMinimum',
        params: { count: minimum.count, min: minimum.min },
      })
  }

  for (const signature of own) {
    const required = (investigator.signatures ?? []).filter((c) => c === signature).length
    if (deck.cards.filter((c) => c === signature).length < required) {
      problems.push({ key: 'deck.problem.missingSignature', params: { card: name(signature) } })
    } else {
      const copies = deck.cards.filter((c) => c === signature).length
      if (copies > (byCode(signature)?.deckLimit ?? 1))
        problems.push({
          key: 'deck.problem.tooManyCopies',
          params: { card: name(signature), n: copies },
        })
    }
  }

  const size = deck.cards.filter(countsForSize).length
  const required = requiredDeckSize(deck.investigator, deck.cards)
  if (size !== required) {
    problems.push({ key: 'deck.problem.size', params: { n: size, size: required } })
  }

  return {
    problems,
    unimplemented: [...new Set(deck.cards)].filter((c) => byCode(c) && !isImplemented(c)),
    needsBasicWeakness: !deck.cards.some(isBasicWeakness),
    size,
  }
}

/** Añade una debilidad básica al azar si el mazo no tiene ninguna (reglamento). */
export function withRandomBasicWeakness(cards: CardCode[], seed: number): CardCode[] {
  cards = cards.filter((code) => code !== RANDOM_BASIC_WEAKNESS)
  if (cards.some(isBasicWeakness)) return cards
  const pool = playerCards.filter((c) => c.weakness === 'basicweakness')
  const [index] = nextInt(seedRng(seed), pool.length)
  return [...cards, pool[index]!.code]
}

/** Mazo nuevo para un investigador: solo con sus cartas exclusivas. */
export function emptyDeck(investigator: CardCode, id: string, name: string): DeckList {
  return { id, name, investigator, cards: [...(byCode(investigator)?.signatures ?? [])] }
}

/** Mazo inicial de la caja como mazo editable. */
export function starterDeckList(key: string, id: string, name: string): DeckList {
  const list = STARTER_DECKS[key]
  if (!list) throw new Error(`Mazo desconocido: ${key}`)
  return {
    id,
    name,
    investigator: list.investigatorCode ?? `12${String(list.investigator).padStart(3, '0')}`,
    cards: starterDeck(key),
  }
}

// ---------------------------------------------------------------------------
// ArkhamDB
// ---------------------------------------------------------------------------

/** Lo que devuelve la API pública de ArkhamDB para un mazo (solo lo que usamos). */
export interface ArkhamDbDeck {
  name: string
  investigator_code: string
  slots: Record<string, number>
  meta?: string
}

/** Id de un mazo de ArkhamDB a partir de su enlace (o del propio número). */
export function arkhamDbDeckId(input: string): { kind: 'decklist' | 'deck'; id: string } | null {
  const text = input.trim()
  const url = text.match(/arkhamdb\.com\/(decklist|deck)\/(?:view\/)?(\d+)/)
  if (url) return { kind: url[1] === 'decklist' ? 'decklist' : 'deck', id: url[2]! }
  return /^\d+$/.test(text) ? { kind: 'decklist', id: text } : null
}

/**
 * Conserva códigos y cantidades, salvo el marcador de debilidad aleatoria.
 * `unknown` informa de las definiciones pendientes sin sustituir ediciones.
 */
export function deckFromArkhamDb(
  data: ArkhamDbDeck,
  id: string,
): { deck: DeckList; unknown: string[] } {
  if (
    !data ||
    typeof data.name !== 'string' ||
    typeof data.investigator_code !== 'string' ||
    !data.slots ||
    typeof data.slots !== 'object' ||
    Array.isArray(data.slots)
  )
    throw new Error('Invalid ArkhamDB deck')
  const unknown: string[] = []
  const cards: CardCode[] = []
  for (const [code, count] of Object.entries(data.slots)) {
    if (!Number.isSafeInteger(count) || count < 0 || count > 1000 || cards.length + count > 1000)
      throw new Error(`Invalid ArkhamDB quantity: ${code}`)
    if (code === RANDOM_BASIC_WEAKNESS) continue
    if (count > 0 && !byCode(code)) unknown.push(code)
    for (let n = 0; n < count; n++) cards.push(code)
  }
  if (!byCode(data.investigator_code)?.deckOptions) {
    unknown.unshift(data.investigator_code)
  }
  const customizations: Customizations = {}
  if (data.meta) {
    const meta = JSON.parse(data.meta) as Record<string, unknown>
    for (const [key, value] of Object.entries(meta)) {
      // ArkhamDB app.deck.js: cus_<code>, comma-separated index|checkbox-count entries.
      if (!key.startsWith('cus_') || typeof value !== 'string') continue
      const code = key.slice(4)
      if (!cards.includes(code)) continue
      const options = Object.keys(byCode(code)?.customizable ?? {})
      if (!options.length) throw new Error(`Unsupported customization: ${code}`)
      const sheet: Record<string, number> = {}
      for (const part of value.split(',').filter(Boolean)) {
        const [index, boxes] = part.split('|').map(Number)
        const option = options[index!]
        if (!option || boxes === undefined || Object.hasOwn(sheet, option))
          throw new Error('Invalid customization')
        sheet[option] = boxes
      }
      if (customizationCost(sheet)) customizations[code] = sheet
    }
  }
  if (!validCustomizations(cards, customizations)) throw new Error('Invalid customization')
  return {
    deck: {
      id,
      name: data.name,
      investigator: data.investigator_code,
      cards,
      ...(Object.keys(customizations).length ? { customizations } : {}),
    },
    unknown,
  }
}
