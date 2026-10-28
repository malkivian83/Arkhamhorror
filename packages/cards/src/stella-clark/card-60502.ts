import { registerPlayerCard } from '@lcg/engine'
import { NEITHER_RAIN_NOR_SNOW } from './codes'

// RR: Skill Test Timing ST.6–ST.7, Cancel. Neither Rain nor Snow: if this skill test fails,
// cancel all effects of the failed test. FAQ v2.1 (and the overturned Alert/Retaliate ruling):
// the step 7 results, including chaos token and committed card effects and the Alert and
// Retaliate attacks; "after you fail" triggered abilities still trigger.
registerPlayerCard({
  code: NEITHER_RAIN_NOR_SNOW,
  cancelsFailedTestEffects: true,
})
