import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
import { LUCKY_3 } from './codes'

// RR: Fast, Triggered Abilities ("when … would fail", ST.6). Lucky! (3): play when an
// investigator at your location would fail a skill test. They get +3 to their skill value for
// that test and draw 1 card (an automatic failure keeps a value of 0, so it cannot be played).
registerPlayerCard({
  code: LUCKY_3,
  canPlay: () => false,
  handReactions: (state, trigger, investigator) => {
    if (trigger.type !== 'whenWouldFail' || state.skillTest?.autoFail) return []
    const here = getInvestigator(state, investigator).location
    const tester = getInvestigator(state, trigger.investigator)
    if (here === null || tester.location !== here) return []
    return [
      {
        key: 'hand:' + LUCKY_3,
        investigator,
        label: 'ability.playCard',
        params: { card: cardName(LUCKY_3) },
        then: [
          {
            type: 'PlayCard',
            investigator,
            code: LUCKY_3,
            effect: [
              { type: 'BoostSkillTest', amount: 3 },
              { type: 'DrawCards', investigator: tester.id, amount: 1 },
            ],
          },
        ],
      },
    ]
  },
})
