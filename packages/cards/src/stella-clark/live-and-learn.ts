import { registerPlayerCard } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
import { LIVE_AND_LEARN, LIVE_AND_LEARN_STE } from './codes'

// RR: Fast, Skill Test Timing (ST.8). Live and Learn (both printings): play after a skill test
// you failed ends (after resolving all its effects). Attempt that test again with +2 skill
// value. FAQ: its costs are not paid again (ammo, actions…); what was spent to improve the
// first test is lost, and it is still the same action (Quick Learner).
for (const code of [LIVE_AND_LEARN, LIVE_AND_LEARN_STE])
  registerPlayerCard({
    code,
    canPlay: () => false,
    handReactions: (state, trigger, investigator) =>
      trigger.type === 'skillTestEnded' &&
      trigger.investigator === investigator &&
      !trigger.succeeded &&
      state.lastSkillTest?.investigator === investigator
        ? [
            {
              key: 'hand:' + code,
              investigator,
              label: 'ability.playCard',
              params: { card: cardName(code) },
              then: [
                {
                  type: 'PlayCard',
                  investigator,
                  code,
                  effect: [{ type: 'RepeatSkillTest', investigator, modifier: 2 }],
                },
              ],
            },
          ]
        : [],
  })
