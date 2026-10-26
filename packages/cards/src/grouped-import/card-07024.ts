import { getInvestigator, registerPlayerCard, type GameState } from '@lcg/engine'
// FAQ 2.4 (July 2025): only an actual investigator turn. A temporary action
// still occurs during the actual turn; count the action enclosing this test.
export function planTiming(s: GameState): 'early' | 'middle' | 'late' | null {
  const root = s.immediateActions?.[0]
  const turn = root ? (root.endedTurn ? null : root.activeTurn) : s.activeTurn
  if (s.phase !== 'investigation' || !turn) return null
  const pending = s.queue.filter(
    (m) =>
      m.type === 'CompleteAction' &&
      m.investigator === turn &&
      m.phase === s.phase &&
      m.round === s.round,
  ).length
  const completed = Math.max(0, (getInvestigator(s, turn).actionsTaken ?? 0) - pending)
  if (completed === 0) return 'early'
  if (completed === 1 || (completed === 2 && pending === 0)) return 'middle'
  return 'late'
}
registerPlayerCard({
  code: '07024',
  additionalIcons: (s) => {
    const timing = planTiming(s)
    return timing === 'early'
      ? { willpower: 1, agility: 1 }
      : timing === 'late'
        ? { combat: 1, intellect: 1 }
        : {}
  },
  afterCommittedTest: (s, _t, success, by) =>
    success && planTiming(s) === 'middle'
      ? [{ type: 'DrawCards', investigator: by, amount: 1 }]
      : [],
})
