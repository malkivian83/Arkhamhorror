import { playerCardDef } from './content'
import type { CardCode, PlayerCardDef } from './types'

export type Customizations = Record<CardCode, Record<string, number>>

export function customizationCost(sheet: Record<string, number> = {}): number {
  return Object.values(sheet).reduce((n, boxes) => n + boxes, 0)
}

/** RR Customizable: incomplete options count toward level, but grant no ability. */
export function customizedCard(card: PlayerCardDef, sheets: Customizations = {}): PlayerCardDef {
  return card.customizable
    ? { ...card, xp: Math.ceil(customizationCost(sheets[card.code]) / 2) }
    : card
}

export function validCustomizations(cards: CardCode[], sheets: Customizations = {}): boolean {
  if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) return false
  return Object.entries(sheets).every(([code, sheet]) => {
    const options = playerCardDef(code)?.customizable
    return (
      cards.includes(code) &&
      !!options &&
      typeof sheet === 'object' &&
      sheet !== null &&
      !Array.isArray(sheet) &&
      Object.entries(sheet).every(
        ([key, n]) =>
          Object.hasOwn(options, key) && Number.isSafeInteger(n) && n >= 0 && n <= options[key]!,
      ) &&
      customizationCost(sheet) <= 10
    )
  })
}

export function retainedCustomizations(
  cards: CardCode[],
  sheets: Customizations = {},
): Customizations {
  return Object.fromEntries(Object.entries(sheets).filter(([code]) => cards.includes(code)))
}
