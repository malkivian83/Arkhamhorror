import { discoverHere, registerReactionEvent } from './register'
// Evidence!: after you defeat an enemy, discover 1 clue at your location.
registerReactionEvent(
  '01522',
  (t, by) => t.type === 'enemyDefeated' && t.by === by,
  (s, by) => discoverHere(s, by, 1),
)
