import { getInvestigator, getLocation, registerPlayerCard, type GameState } from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { LOOK_WHAT_I_FOUND_2 } from './codes'

/** Your location and connecting locations with clues (one at a time, so a total of two). */
function sources(state: GameState, investigator: string) {
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  return [here, ...getLocation(state, here).connections].filter(
    (id, n, all) => all.indexOf(id) === n && (state.locations[id]?.clues ?? 0) > 0,
  )
}

// RR: Fast, Investigate, Discover. "Look what I found!" (2): play after you fail a skill test by
// 3 or less while investigating. Discover 2 total clues from among your location and connecting
// locations.
registerPlayerCard({
  code: LOOK_WHAT_I_FOUND_2,
  canPlay: () => false,
  handReactions: (_state, trigger, investigator) =>
    trigger.type === 'afterSkillTest' &&
    trigger.investigator === investigator &&
    !trigger.succeeded &&
    trigger.kind === 'investigate' &&
    trigger.margin >= -3
      ? [
          {
            key: 'hand:' + LOOK_WHAT_I_FOUND_2,
            investigator,
            label: 'ability.playCard',
            params: { card: cardName(LOOK_WHAT_I_FOUND_2) },
            then: [
              {
                type: 'PlayCard',
                investigator,
                code: LOOK_WHAT_I_FOUND_2,
                effect: [continuation(LOOK_WHAT_I_FOUND_2, investigator, 'discover', { left: 2 })],
              },
            ],
          },
        ]
      : [],
  effect: (state, investigator, step, data) => {
    const left = Number(data.left)
    if (step !== 'discover' || left < 1) return []
    return ask(
      investigator,
      sources(state, investigator).map((location) => ({
        label: 'choice.discoverAt',
        params: { location: getLocation(state, location).name },
        target: { type: 'location', id: location },
        then: [
          { type: 'DiscoverClues', investigator, location, amount: 1 },
          continuation(LOOK_WHAT_I_FOUND_2, investigator, 'discover', { left: left - 1 }),
        ],
      })),
      true,
    )
  },
})
