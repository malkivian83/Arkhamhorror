import { getInvestigator } from '@lcg/engine'
import { registerBasicEvent } from '../basic-events/register'
import { continuation } from '../dunwich-pilot/effects'
// Clean Sweep (0): investigate at +2; if that discovers the last clue at your location,
// you may move to a connecting location once the test has ended.
registerBasicEvent(
  '60364',
  {
    action: 'investigate',
    modifier: 2,
    tags: ['tactic', 'trick'],
    onSuccess: ({ state, investigator }) => {
      const here = getInvestigator(state, investigator).location!
      return (state.locations[here]?.clues ?? 0) > 0
        ? [
            {
              type: 'AfterCurrentSkillTest',
              then: [continuation('60364', investigator, 'sweep', { location: here })],
            },
          ]
        : []
    },
  },
  {
    effect: (s, by, _step, data) =>
      (s.locations[String(data.location)]?.clues ?? 1) === 0
        ? [{ type: 'ChooseMove', investigator: by }]
        : [],
  },
)
