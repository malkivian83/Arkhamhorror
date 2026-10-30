import { getInvestigator, getLocation, registerPlayerCard, type GameState } from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'

// RR: Fast; Parley; Discover Clues. Snitch (2): after you succeed at a skill test while parleying,
// discover 2 total clues, one at a time, from among your location and connecting locations.
const code = '10078'
const sources = (state: GameState, investigator: string) => {
  const here = getInvestigator(state, investigator).location
  return here === null
    ? []
    : [here, ...getLocation(state, here).connections]
        .map((id) => state.locations[id])
        .filter((l) => !!l && l.revealed && l.clues > 0)
        .map((l) => l!)
}
registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (state, trigger, investigator) =>
    trigger.type === 'afterSkillTest' &&
    trigger.investigator === investigator &&
    trigger.succeeded &&
    state.skillTest?.tags?.includes('parley') &&
    sources(state, investigator).length > 0
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
                effect: [continuation(code, investigator, 'clue', { left: 2 })],
              },
            ],
          },
        ]
      : [],
  effect: (state, investigator, _step, data) => {
    const left = Number(data.left)
    return left < 1
      ? []
      : ask(
          investigator,
          sources(state, investigator).map((l) => ({
            label: 'choice.discoverAt',
            params: { location: l.name },
            target: { type: 'location', id: l.id },
            then: [
              { type: 'DiscoverClues', investigator, amount: 1, location: l.id },
              continuation(code, investigator, 'clue', { left: left - 1 }),
            ],
          })),
          true,
        )
  },
})
