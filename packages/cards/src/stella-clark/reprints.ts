import { playerCardBehavior, registerPlayerCard, type PlayerCardBehavior } from '@lcg/engine'
import '../reactive-support/card-01075'
import '../result-skills/card-04201'
import { rebindCard } from '../reprints-wave-2/register'
import { RABBITS_FOOT, TAKE_HEART } from './codes'

/** Same card text as an implemented printing: its behavior, bound to this code. */
function registerReprint(code: string, source: string): void {
  const behavior = playerCardBehavior(source)
  if (!behavior) throw new Error('Reprint without source behavior: ' + code)
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

// RR: Triggered Abilities. Rabbit's Foot (60510) and Take Heart (60519) are reprints of 01075
// and 04201 (same text in English and Spanish, ArkhamDB "duplicate_of").
registerReprint(RABBITS_FOOT, '01075')
registerReprint(TAKE_HEART, '04201')
