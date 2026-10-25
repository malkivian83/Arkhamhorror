/**
 * Iconos de juego de Fortuna e insensatez (guía ES p. 4): cada carta de Encuentro lleva
 * un palo (♥, ♦, ♠ o ♣) y un valor (4–10, J, Q o K). Las cartas con valor «A» no van al
 * mazo de Encuentros, así que nunca se comprueban.
 */
export type Suit = '♥' | '♦' | '♠' | '♣'
export type Rank = 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A'
export interface GameIcon {
  suit: Suit
  rank: Rank
}

/** Icono impreso de cada carta (catálogo `fortune-cards`, campo `gameIcon`). */
const PRINTED: Record<string, string> = {
  '88034a': '♦A',
  '88034b': '♦A',
  '88035a': '♣Q',
  '88035b': '♣J',
  '88035c': '♥10',
  '88036a': '♥9',
  '88036b': '♣9',
  '88037a': '♥Q',
  '88037b': '♥J',
  '88037c': '♣10',
  '88038a': '♠9',
  '88038b': '♦9',
  '88038c': '♠8',
  '88038d': '♦8',
  '88039a': '♠Q',
  '88039b': '♠J',
  '88039c': '♠10',
  '88040a': '♦Q',
  '88040b': '♦J',
  '88040c': '♦10',
  '88041a': '♣8',
  '88041b': '♠7',
  '88041c': '♣7',
  '88042a': '♥8',
  '88042b': '♦7',
  '88042c': '♥7',
  '88046a': '♠K',
  '88046b': '♥K',
  '88047a': '♣K',
  '88047b': '♦K',
  '88048': '♠A',
  '88049a': '♠6',
  '88049b': '♣6',
  '88050a': '♦6',
  '88050b': '♥6',
  '88051a': '♠5',
  '88051b': '♣5',
  '88051c': '♠4',
  '88052a': '♦5',
  '88052b': '♥5',
  '88052c': '♦4',
  '88053a': '♣4',
  '88053b': '♥4',
}

export const SUITS: Suit[] = ['♥', '♦', '♠', '♣']
export const RANKS: Rank[] = [4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K']

/** Lee un icono escrito como «♣Q» o «♥10». */
export function parseIcon(text: string): GameIcon {
  const suit = text[0] as Suit
  const raw = text.slice(1)
  const rank = (/^\d+$/.test(raw) ? Number(raw) : raw) as Rank
  if (!SUITS.includes(suit) || !(RANKS as unknown[]).concat('A').includes(rank))
    throw new Error(`Icono de juego no válido: ${text}`)
  return { suit, rank }
}

export const formatIcon = (icon: GameIcon) => `${icon.suit}${icon.rank}`

/** Icono de una carta de Encuentro, o null si no tiene. */
export function iconOf(code: string): GameIcon | null {
  const printed = PRINTED[code]
  return printed ? parseIcon(printed) : null
}

/** Valor numérico: J, Q y K valen 10. */
export const valueOf = (rank: Rank): number => (typeof rank === 'number' ? rank : 10)

/** ♥ y ♦ son rojos; ♠ y ♣, negros. */
export const colorOf = (suit: Suit): 'red' | 'black' =>
  suit === '♥' || suit === '♦' ? 'red' : 'black'

/** Orden de los valores para el «valor secuencial» (4, 5… 10, J, Q, K). */
const order = (rank: Rank) => (rank === 'A' ? 14 : RANKS.indexOf(rank))

/** Todos los valores son consecutivos («seguidos»), sin repetir. */
export function sequential(icons: GameIcon[]): boolean {
  const sorted = icons.map((i) => order(i.rank)).sort((a, b) => a - b)
  return sorted.every((n, i) => i === 0 || n === sorted[i - 1]! + 1)
}

export const sameSuit = (icons: GameIcon[]) => icons.every((i) => i.suit === icons[0]?.suit)

/** Cuántas cartas comparten el valor más repetido. */
export function mostOfARank(icons: GameIcon[]): number {
  const counts = new Map<Rank, number>()
  for (const i of icons) counts.set(i.rank, (counts.get(i.rank) ?? 0) + 1)
  return Math.max(0, ...counts.values())
}

/** Suma de los valores numéricos. */
export const totalValue = (icons: GameIcon[]) => icons.reduce((sum, i) => sum + valueOf(i.rank), 0)
