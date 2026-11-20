// RR: Experience, Upgrading Cards. Discounts last only until the following scenario.
import { playerCardDef } from '@lcg/engine'
import type { CampaignInvestigator } from '../campaign'
export interface PlanningPeriod {
  arcane: number
  rabbit: boolean
  upgrades: number
  arcaneUsed?: boolean
  customized?: string[]
  swaps?: number
  pelt?: number
  peltUsed?: boolean
}
export const upgradeDiscount = (
  self: CampaignInvestigator,
  replaces: string,
  customizable = false,
): number => {
  const p = self.planning
  if (!p || (customizable && p.customized?.includes(replaces))) return 0
  return (
    (!p.arcaneUsed && playerCardDef(replaces)?.traits.includes('Spell') ? p.arcane : 0) +
    (p.rabbit && p.upgrades < 2 ? 1 : 0)
  )
}
export const afterUpgrade = (
  self: CampaignInvestigator,
  replaces: string,
  customizable = false,
): PlanningPeriod | undefined => {
  const p = self.planning
  if (!p || (customizable && p.customized?.includes(replaces))) return p
  return {
    ...p,
    upgrades: p.upgrades + 1,
    ...(playerCardDef(replaces)?.traits.includes('Spell') ? { arcaneUsed: true } : {}),
    ...(customizable ? { customized: [...(p.customized ?? []), replaces] } : {}),
  }
}
export const newCardSurcharge = (self: CampaignInvestigator) =>
  self.deck.includes('08059') ? 1 : 0
export const newCardDiscount = (self: CampaignInvestigator) =>
  self.planning?.peltUsed ? 0 : (self.planning?.pelt ?? 0)

export function planningCustomizationCost(
  base: number,
  self: Pick<CampaignInvestigator, 'deck' | 'planning'>,
  code: string,
  copies: number,
  level = 0,
): number {
  const member = { ...self, id: '' },
    owned = self.deck.includes(code)
  const extra = Math.max(0, copies - 1),
    extraBase = Math.max(1, level)
  const sheetCost = base - extra * extraBase
  const primary = owned
    ? Math.max(0, sheetCost - upgradeDiscount(member, code, true))
    : Math.max(1, sheetCost + newCardSurcharge(member) - newCardDiscount(member))
  const paidCopies = Array.from({ length: extra }, (_, n) =>
    Math.max(
      1,
      extraBase + newCardSurcharge(member) - (owned && n === 0 ? newCardDiscount(member) : 0),
    ),
  )
  return primary + paidCopies.reduce((n, price) => n + price, 0)
}
