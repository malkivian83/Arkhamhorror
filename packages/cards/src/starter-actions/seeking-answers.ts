import { getInvestigator, getLocation, type Choice } from '@lcg/engine'
import { registerBasicEvent } from '../basic-events/register'
import { ask, continuation } from '../dunwich-pilot/effects'

// Seeking Answers (2): on success, instead of the standard clue, discover 2 total clues,
// one at a time, from among your location and connecting locations.
export function registerSeekingAnswers(code: string): void {
  registerBasicEvent(
    code,
    {
      action: 'investigate',
      replaceClue: true,
      tags: ['insight'],
      onSuccess: ({ investigator }) => [continuation(code, investigator, 'clue', { remaining: 2 })],
    },
    {
      effect: (s, by, _step, data) => {
        const remaining = Number(data.remaining)
        const here = getInvestigator(s, by).location
        if (remaining <= 0 || here === null) return []
        return ask(
          by,
          [here, ...getLocation(s, here).connections]
            .filter((id) => (s.locations[id]?.clues ?? 0) > 0)
            .map((id): Choice => ({
              label: 'choice.location',
              params: { location: getLocation(s, id).name },
              target: { type: 'location', id },
              then: [
                { type: 'DiscoverClues', investigator: by, location: id, amount: 1 },
                continuation(code, by, 'clue', { remaining: remaining - 1 }),
              ],
            })),
        )
      },
    },
  )
}
