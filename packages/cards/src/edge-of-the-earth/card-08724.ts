import type { TreacheryBehavior } from '@lcg/engine'

export const damage: TreacheryBehavior['revelation'] = (_state, investigator, self) => [
  { type: 'TakeDamage', investigator, damage: 1, horror: 0, source: self.name },
]
