import { registerPlayerCard } from '@lcg/engine'
import { WENDYS_AMULET } from './codes'

// RR: Play, Discard Pile, Leaves Play. Wendy's Amulet: you may play the topmost event of
// your discard pile as if it were in your hand. Forced: after you play an event or discard
// an event from play, place it on the bottom of your deck instead of in your discard pile.
registerPlayerCard({
  code: WENDYS_AMULET,
  playsTopDiscardEvent: true,
  eventsToDeckBottom: true,
})
