/**
 * Mazos propios: lista de cartas de un investigador, su validación según las
 * reglas de construcción (reglamento, "Deck Customization") e importación desde
 * ArkhamDB.
 */
import { isPermanent, nextInt, seedRng, type CardCode, type PlayerCardDef } from '@lcg/engine'
import { isImplemented } from './campaign'
import { playerCards, starterDeck, STARTER_DECKS } from './core-2026/player-cards'

export interface DeckList {
  id: string
  name: string
  investigator: CardCode
  /** Todas las cartas del mazo, con las exclusivas y las debilidades. */
  cards: CardCode[]
}

const byCode = (code: CardCode): PlayerCardDef | undefined =>
  playerCards.find((c) => c.code === code)

/** Investigadores con reglas de construcción (los que se pueden elegir). */
export const investigatorCards = () =>
  playerCards.filter((c) => c.type === 'investigator' && c.deckOptions)

const SIGNATURES = new Set(playerCards.flatMap((c) => c.signatures ?? []))
const isWeakness = (code: CardCode) => !!byCode(code)?.weakness
const isBasicWeakness = (code: CardCode) => byCode(code)?.weakness === 'basicweakness'

/** Cartas que el jugador elige (ni exclusivas ni debilidades). */
export const isStandard = (code: CardCode) => !isWeakness(code) && !SIGNATURES.has(code)
/** Cuentan para el tamaño del mazo: las elegidas que no son permanentes. */
const countsForSize = (code: CardCode) => isStandard(code) && !isPermanent(code)

/** Cartas que este investigador puede incluir según sus opciones de construcción. */
export function cardPool(investigator: CardCode): PlayerCardDef[] {
  const options = byCode(investigator)?.deckOptions ?? []
  return playerCards.filter(
    (card) =>
      card.type !== 'investigator' &&
      isStandard(card.code) &&
      options.some((o) => o.classes.includes(card.class) && (card.xp ?? 0) <= o.maxLevel),
  )
}

export type DeckProblem =
  | { key: 'deck.problem.unknownInvestigator' }
  | { key: 'deck.problem.size'; params: { n: number; size: number } }
  | { key: 'deck.problem.notAllowed'; params: { card: string } }
  | { key: 'deck.problem.tooManyCopies'; params: { card: string; n: number } }
  | { key: 'deck.problem.missingSignature'; params: { card: string } }
  | { key: 'deck.problem.otherSignature'; params: { card: string } }
  | { key: 'deck.problem.levelAtStart'; params: { card: string } }
  | { key: 'deck.problem.unknownCard'; params: { card: string } }

export interface DeckCheck {
  /** Errores: el mazo no se puede usar. */
  problems: DeckProblem[]
  /** Cartas que aún no funcionan en el motor (se pueden llevar, pero no tendrán efecto). */
  unimplemented: CardCode[]
  /** Falta la debilidad básica: se añadirá una al azar al empezar la campaña. */
  needsBasicWeakness: boolean
  /** Cartas que cuentan para el tamaño. */
  size: number
}

/**
 * Comprueba un mazo con las reglas de construcción. `campaignStart`: al empezar
 * una campaña solo se admiten cartas de nivel 0.
 */
export function validateDeck(deck: DeckList, campaignStart = true): DeckCheck {
  const investigator = byCode(deck.investigator)
  if (!investigator?.deckOptions) {
    return {
      problems: [{ key: 'deck.problem.unknownInvestigator' }],
      unimplemented: [],
      needsBasicWeakness: false,
      size: 0,
    }
  }
  const problems: DeckProblem[] = []
  const name = (code: CardCode) => byCode(code)?.name ?? code
  const allowed = new Set(cardPool(deck.investigator).map((c) => c.code))
  const own = new Set(investigator.signatures ?? [])

  for (const code of new Set(deck.cards)) {
    const card = byCode(code)
    if (!card) {
      problems.push({ key: 'deck.problem.unknownCard', params: { card: code } })
      continue
    }
    if (SIGNATURES.has(code) && !own.has(code)) {
      problems.push({ key: 'deck.problem.otherSignature', params: { card: card.name } })
    } else if (isStandard(code) && !allowed.has(code)) {
      problems.push({ key: 'deck.problem.notAllowed', params: { card: card.name } })
    } else if (campaignStart && isStandard(code) && (card.xp ?? 0) > 0) {
      problems.push({ key: 'deck.problem.levelAtStart', params: { card: card.name } })
    }
  }

  // Máximo 2 copias por título (cuentan juntas las versiones de distinto nivel).
  const perTitle = new Map<string, number>()
  for (const code of deck.cards.filter(isStandard)) {
    const title = name(code)
    perTitle.set(title, (perTitle.get(title) ?? 0) + 1)
  }
  for (const [title, n] of perTitle) {
    if (n > 2) problems.push({ key: 'deck.problem.tooManyCopies', params: { card: title, n } })
  }

  for (const signature of own) {
    if (!deck.cards.includes(signature)) {
      problems.push({ key: 'deck.problem.missingSignature', params: { card: name(signature) } })
    }
  }

  const size = deck.cards.filter(countsForSize).length
  const required = investigator.deckSize ?? 30
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
    investigator: `12${String(list.investigator).padStart(3, '0')}`,
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
}

/** Id de un mazo de ArkhamDB a partir de su enlace (o del propio número). */
export function arkhamDbDeckId(input: string): { kind: 'decklist' | 'deck'; id: string } | null {
  const text = input.trim()
  const url = text.match(/arkhamdb\.com\/(decklist|deck)\/(?:view\/)?(\d+)/)
  if (url) return { kind: url[1] === 'decklist' ? 'decklist' : 'deck', id: url[2]! }
  return /^\d+$/.test(text) ? { kind: 'decklist', id: text } : null
}

/**
 * Convierte un mazo de ArkhamDB. Las cartas que no son de esta caja se devuelven
 * aparte (`unknown`), igual que un investigador que no está disponible.
 */
export function deckFromArkhamDb(
  data: ArkhamDbDeck,
  id: string,
): { deck: DeckList | null; unknown: string[] } {
  const unknown: string[] = []
  const cards: CardCode[] = []
  for (const [code, count] of Object.entries(data.slots)) {
    if (!byCode(code)) {
      unknown.push(code)
      continue
    }
    for (let n = 0; n < count; n++) cards.push(code)
  }
  if (!byCode(data.investigator_code)?.deckOptions) {
    return { deck: null, unknown: [data.investigator_code, ...unknown] }
  }
  return { deck: { id, name: data.name, investigator: data.investigator_code, cards }, unknown }
}
