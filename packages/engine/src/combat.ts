import { getInvestigator } from './state'
import type { GameState, SkillTest } from './types'

/** RR: Fight. Conditional damage is evaluated at resolution. */
export function attackDamage(state: GameState, test: SkillTest): number {
  if (test.kind.type !== 'fight') return 0
  const investigator = getInvestigator(state, test.investigator),
    kind = test.kind
  const margin = Math.max(0, (test.modifiedSkill ?? 0) - test.difficulty)
  return (
    1 +
    (kind.extraDamage ?? 0) +
    Math.min(kind.bonusPerSuccess ?? 0, margin) +
    (investigator.resources === 0 ? (kind.damageIfNoResources ?? 0) : 0) +
    Math.min(investigator.clues, kind.damageFromClues ?? 0)
  )
}
