import { attachedAttackDamageBonus } from './asset-upgrades'
import { getInvestigator } from './state'
import { playerCardBehavior } from './content'
import type { GameState, SkillTest } from './types'

/** RR: Fight. Conditional damage is evaluated at resolution. */
export function attackDamage(state: GameState, test: SkillTest): number {
  if (test.kind.type !== 'fight') return 0
  const investigator = getInvestigator(state, test.investigator),
    kind = test.kind
  const margin = Math.max(0, (test.modifiedSkill ?? 0) - test.difficulty)
  // Shotgun: "instead of its standard damage" replaces only the base 1.
  const base = kind.damagePerSuccess ? Math.min(kind.damagePerSuccess.max, Math.max(1, margin)) : 1
  return (
    base +
    (kind.extraDamage ?? 0) +
    (test.effectSource
      ? (playerCardBehavior(test.effectSource)?.effectAttackDamage?.(state, test) ?? 0)
      : 0) +
    (kind.damageIfTokens && test.tokens.some((t) => kind.damageIfTokens!.tokens.includes(t))
      ? kind.damageIfTokens.amount
      : 0) +
    (test.succeeded
      ? test.committed.reduce(
          (sum, c) =>
            sum + (playerCardBehavior(c.code)?.committedAttackDamage?.(state, test, c.by) ?? 0),
          0,
        )
      : 0) +
    (test.succeeded && kind.damageIfSuccessBy && margin >= kind.damageIfSuccessBy.atLeast
      ? kind.damageIfSuccessBy.amount
      : 0) +
    Math.min(kind.bonusPerSuccess ?? 0, margin) +
    (investigator.resources === 0 ? (kind.damageIfNoResources ?? 0) : 0) +
    Math.min(investigator.clues, kind.damageFromClues ?? 0) +
    attachedAttackDamageBonus(state, test)
  )
}
