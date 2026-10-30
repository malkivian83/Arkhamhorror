import { registerStartingTalent, tagged } from './card-60178'

// RR: Starting, Fast. Levelheaded (3): +2 instead if this test is on a scenario card.
registerStartingTalent('60579', ['willpower', 'agility'], (t) => tagged(t, 'scenario'))
