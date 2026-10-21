/**
 * Reimpresiones: la misma carta con otro código (Básica, Básica revisada, mazos
 * de inicio, Núcleo 2026…). Las relaciones salen del catálogo de ArkhamDB
 * (`duplicateOf`); el catálogo del mazo muestra una sola copia de cada familia
 * y todas comparten imagen.
 */
import { type CardCode } from '@lcg/engine'
import { playerCards } from './core-2026/player-cards'
import duplicates from './data/duplicates.json'

const DUPLICATE_OF = new Map<CardCode, CardCode>(Object.entries(duplicates))

/** Carta original de una reimpresión (la propia carta si no lo es). */
export function reprintSource(code: CardCode): CardCode {
  const original = DUPLICATE_OF.get(code)
  return original ? reprintSource(original) : code
}

/** Todas las impresiones de una carta, empezando por la original. */
export function printingsOf(code: CardCode): CardCode[] {
  const source = reprintSource(code)
  return [
    source,
    ...[...DUPLICATE_OF.keys()].filter((c) => c !== source && reprintSource(c) === source),
  ]
}

/**
 * Deja una sola impresión de cada carta, en el orden de la lista: la del Núcleo
 * 2026 si está (tiene imagen); si no, la original; si no, la primera. `variant`
 * separa entradas de la misma carta que deben quedarse (comprar o mejorar).
 */
export function onePrintingEach<T extends { code: CardCode }>(
  cards: T[],
  variant: (card: T) => string = () => '',
): T[] {
  const rank = (card: T) =>
    playerCards.some((p) => p.code === card.code)
      ? 0
      : reprintSource(card.code) === card.code
        ? 1
        : 2
  const chosen = new Map<string, T>()
  for (const card of cards) {
    const key = `${reprintSource(card.code)}:${variant(card)}`
    const current = chosen.get(key)
    if (!current || rank(card) < rank(current)) chosen.set(key, card)
  }
  const kept = new Set(chosen.values())
  return cards.filter((card) => kept.has(card))
}
