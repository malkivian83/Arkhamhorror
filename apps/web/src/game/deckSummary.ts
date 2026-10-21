import { isStandard, type DeckList } from '@lcg/cards'
import { isPermanent, playerCardDef } from '@lcg/engine'

export const DECK_CARD_TYPES = ['asset', 'event', 'skill'] as const

/** Cuenta copias reales; conserva las desconocidas y separa exclusivas y debilidades. */
export function deckSummary(deck: DeckList) {
  const types = { asset: 0, event: 0, skill: 0 }
  const classes = new Map<string, number>()
  const copies = new Map<string, number>()
  let fixed = 0
  let unknown = 0
  let experience = 0
  const costs: number[] = []

  for (const code of deck.cards) {
    copies.set(code, (copies.get(code) ?? 0) + 1)
    const card = playerCardDef(code)
    if (!card) {
      unknown++
      continue
    }
    if (!isStandard(code)) {
      fixed++
      continue
    }
    if (card.type === 'asset' || card.type === 'event' || card.type === 'skill') types[card.type]++
    classes.set(card.class, (classes.get(card.class) ?? 0) + 1)
    experience += card.xp ?? 0
    if (
      (card.type === 'asset' || card.type === 'event') &&
      !isPermanent(code) &&
      typeof card.cost === 'number' &&
      card.cost >= 0
    ) {
      costs.push(card.cost)
    }
  }

  return {
    types,
    fixed,
    unknown,
    experience,
    averageCost: costs.length ? costs.reduce((sum, cost) => sum + cost, 0) / costs.length : null,
    classes: [...classes].map(([faction, count]) => ({ faction, count })),
    cards: [...copies].map(([code, quantity]) => ({ code, quantity })),
  }
}
