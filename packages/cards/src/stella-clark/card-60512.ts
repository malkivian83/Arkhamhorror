import { registerPlayerCard } from '@lcg/engine'
import { WILL_TO_SURVIVE } from './codes'

// RR: Fast, Skill Test Timing (ST.3–ST.4 skipped). Will to Survive (0): play only during your
// turn. Do not reveal chaos tokens for the next skill test you perform this turn.
registerPlayerCard({
  code: WILL_TO_SURVIVE,
  canPlay: (state, investigator) => state.activeTurn === investigator,
  play: (_state, investigator) => [{ type: 'SkipNextTestTokens', investigator }],
})
