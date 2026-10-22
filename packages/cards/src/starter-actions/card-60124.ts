import { discoverHere, registerReactionEvent } from './register'
// Lesson Learned (2): after you take damage from an enemy attack, discover 2 clues at your location.
registerReactionEvent(
  '60124',
  (t, by) => t.type === 'afterTakeDamage' && t.investigator === by && !!t.enemy && t.damage > 0,
  (s, by) => discoverHere(s, by, 2),
)
