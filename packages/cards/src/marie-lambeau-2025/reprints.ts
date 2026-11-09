// RR: Triggered Abilities, Committing Cards, Costs, Uses.
import { playerCardBehavior, registerPlayerCard, type PlayerCardBehavior } from '@lcg/engine'
import '../support-skills/card-01063'
import { rebindCard } from '../reprints-wave-2/register'
import { registerTokenSkill } from '../token-skills/register'
import { ARCANE_INITIATE, TORRENT_OF_POWER } from './codes'

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

// Arcane Initiate (60455) and Torrent of Power (60469) reprint 01063 and 03235 with the same
// English text (ArkhamDB "duplicate_of"; equivalence hashes in approvals.json). Torrent of
// Power finds its committed copy by code, so it registers through its own family instead.
registerReprint(ARCANE_INITIATE, '01063')
registerTokenSkill(TORRENT_OF_POWER)
