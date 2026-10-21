import { playerCardBehavior, registerPlayerCard } from '@lcg/engine'
import approvals from './approvals.json'
// The adapter translates only references to this card printing, never investigator,
// enemy or asset identifiers. Its results remain plain serializable messages.
export function rebindCard<T>(value: T, source: string, target: string): T {
  if (Array.isArray(value)) return value.map((v) => rebindCard(v, source, target)) as T
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        key === 'code' && v === source
          ? target
          : key === 'key' && v === 'hand:' + source
            ? 'hand:' + target
            : rebindCard(v, source, target),
      ]),
    ) as T
  return value
}
const portable = new Set([
  'code',
  'abilities',
  'play',
  'canPlay',
  'handReactions',
  'reactions',
  'onTokenRevealed',
  'permanent',
  'noAttacksOfOpportunity',
  'discardWhenEmpty',
])
export function registerReviewedReprint(code: string, behaviorSource: string): void {
  const approval = approvals.cards.find((c) => c.code === code),
    source = playerCardBehavior(behaviorSource)
  if (
    !approval ||
    approval.status !== 'verified' ||
    !/^[a-f0-9]{64}$/.test(approval.equivalenceSha256) ||
    approval.behaviorSource !== behaviorSource ||
    !source ||
    Object.keys(source).some((k) => !portable.has(k))
  )
    throw new Error('Unsupported reviewed reprint: ' + code)
  if (
    !!source.permanent !== ('adapter' in approval && approval.adapter === 'equivalent-permanent-v1')
  )
    throw new Error('Permanent adapter mismatch: ' + code)
  const bind = <T>(value: T) => rebindCard(value, behaviorSource, code)
  registerPlayerCard({
    ...source,
    code,
    ...(source.play ? { play: (s, i) => bind(source.play!(s, i)) } : {}),
    ...(source.abilities ? { abilities: (s, a, i) => bind(source.abilities!(s, a, i)) } : {}),
    ...(source.handReactions
      ? { handReactions: (s, t, i) => bind(source.handReactions!(s, t, i)) }
      : {}),
    ...(source.reactions ? { reactions: (s, t, a) => bind(source.reactions!(s, t, a)) } : {}),
    ...(source.onTokenRevealed
      ? { onTokenRevealed: (s, t, a) => bind(source.onTokenRevealed!(s, t, a)) }
      : {}),
  })
}
