import { effectiveVitals, getInvestigator, registerPlayerCard } from '@lcg/engine'
import approvals from './approvals.json'

export function registerConditionalCommit(code: string): void {
  const entry = approvals.cards.find((c) => c.code === code)
  if (!entry) throw new Error('Unreviewed conditional skill: ' + code)
  registerPlayerCard({
    code,
    canCommit: (s, test, by) => {
      const investigator = getInvestigator(s, by)
      if (entry.family === 'desperate')
        return effectiveVitals(s, investigator).sanity - investigator.horror <= 3
      if (entry.family === 'clue')
        return (
          investigator.location !== null && (s.locations[investigator.location]?.clues ?? 0) > 0
        )
      return by === test.investigator && test.difficulty >= investigator.skills[test.skill] + 2
    },
  })
}
