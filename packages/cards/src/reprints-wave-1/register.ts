import { playerCardBehavior, registerPlayerCard } from '@lcg/engine'
import approvals from './approvals.json'
// Only these reviewed callbacks are portable for this batch. Hand events and source-code
// continuations need a separate adapter and are deliberately absent from this selection.
const portable = new Set([
  'code',
  'play',
  'canPlay',
  'afterCommittedTest',
  'reactions',
  'handSize',
  'skillModifier',
])
export function registerReviewedReprint(code: string, behaviorSource: string): void {
  const approval = approvals.cards.find((c) => c.code === code)
  if (
    !approval ||
    approval.status !== 'verified' ||
    approval.behaviorSource !== behaviorSource ||
    !/^[a-f0-9]{64}$/.test(approval.equivalenceSha256)
  )
    throw new Error('Unreviewed reprint: ' + code)
  const source = playerCardBehavior(behaviorSource)
  if (!source || Object.keys(source).some((key) => !portable.has(key)))
    throw new Error('Unsupported reprint behavior: ' + behaviorSource)
  registerPlayerCard({ ...source, code })
}
