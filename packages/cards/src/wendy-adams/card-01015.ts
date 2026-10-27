import { registerTreachery } from '@lcg/engine'
import { ABANDONED_AND_ALONE } from './codes'

// RR: Revelation, Direct Damage/Horror, Out of Play. Abandoned and Alone: take 2 direct
// horror and remove all cards in your discard pile from the game (then it is discarded).
registerTreachery({
  code: ABANDONED_AND_ALONE,
  revelation: (_s, by, self) => [
    { type: 'TakeDamage', investigator: by, damage: 0, horror: 2, direct: true, source: self.name },
    { type: 'RemoveDiscardFromGame', investigator: by },
  ],
})
