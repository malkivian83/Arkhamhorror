import { registerStartingTalent, tagged } from './card-60178'

// RR: Starting, Fast, Investigate, Parley. Sharp Rhetoric (3): +2 instead during an investigation
// or parley.
registerStartingTalent(
  '60277',
  ['intellect', 'willpower'],
  (t) => t.kind.type === 'investigate' || tagged(t, 'parley'),
)
