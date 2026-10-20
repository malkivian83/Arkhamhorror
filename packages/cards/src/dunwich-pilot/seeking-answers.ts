import { getInvestigator, getLocation, registerPlayerCard, shroudOf } from '@lcg/engine'
import { ask, continuation } from './effects'
const code = '02023'
registerPlayerCard({
  code,
  investigateAction: true,
  canPlay: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return (
      here !== null &&
      getLocation(state, here).connections.some((to) => (state.locations[to]?.clues ?? 0) > 0)
    )
  },
  play: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return here === null
      ? []
      : [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'intellect',
            difficulty: shroudOf(state, here),
            kind: {
              type: 'investigate',
              location: here,
              replaceClue: true,
              onSuccess: [continuation(code, investigator, 'clue')],
            },
          },
        ]
  },
  effect: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return here === null
      ? []
      : ask(
          investigator,
          getLocation(state, here)
            .connections.filter((to) => (state.locations[to]?.clues ?? 0) > 0)
            .map((location) => ({
              label: 'choice.pilotClue',
              params: { location: getLocation(state, location).name },
              target: { type: 'location', id: location },
              then: [{ type: 'DiscoverClues', investigator, location, amount: 1 }],
            })),
        )
  },
})
