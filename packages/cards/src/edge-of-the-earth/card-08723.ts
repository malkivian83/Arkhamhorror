import type { TreacheryBehavior } from '@lcg/engine'

export const horror: TreacheryBehavior['revelation'] = (_state, investigator, self) => [
  { type: 'TakeDamage', investigator, damage: 0, horror: 1, source: self.name },
]
