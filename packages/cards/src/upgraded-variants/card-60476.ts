import { registerStartingTalent, tagged } from './card-60178'

// RR: Starting, Fast. Spiritual Intuition (3): +2 instead if this test is on a Spell or Ritual card.
registerStartingTalent('60476', ['willpower', 'combat'], (t) => tagged(t, 'spell', 'ritual'))
