import { playerCardBehavior, registerPlayerCard, type PlayerCardBehavior } from '@lcg/engine'
import { rebindCard } from '../reprints-wave-2/register'
import approvals from './approvals.json'

/**
 * Same card text as an implemented printing (English and Spanish, equivalence fingerprint in
 * approvals.json): the reviewed behavior bound to this code.
 */
export function registerReprint(code: string, source: string): void {
  const approval = approvals.cards.find((c) => c.code === code)
  const behavior = playerCardBehavior(source)
  if (
    !approval ||
    approval.status !== 'verified' ||
    approval.behaviorSource !== source ||
    !/^[a-f0-9]{64}$/.test(approval.equivalenceSha256) ||
    !behavior
  )
    throw new Error('Unsupported reviewed reprint: ' + code)
  const bound = Object.fromEntries(
    Object.entries(behavior).map(([key, value]) => [
      key,
      typeof value === 'function'
        ? (...args: unknown[]) =>
            rebindCard((value as (...a: unknown[]) => unknown)(...args), source, code)
        : value,
    ]),
  ) as unknown as PlayerCardBehavior
  registerPlayerCard({ ...bound, code })
}
