import { distancesFrom, getInvestigator, registerTreachery, type Message } from '@lcg/engine'
import { treachery } from '../scenario-helpers'
import { clearedOfMirages } from './fatal-mirage-map'

export const evanescentMist = treachery({
  code: '08585',
  name: 'Evanescent Mist',
  traits: ['Curse', 'Hazard'],
  keywords: [],
})

registerTreachery({
  code: evanescentMist.code,
  revelation: (state, investigator, self) => {
    const here = getInvestigator(state, investigator).location
    if (!here) return []
    const distances = distancesFrom(state, here)
    const candidates = Object.values(state.locations).filter(
      ({ id }) => distances.has(id) && !clearedOfMirages(state, id),
    )
    const nearest = Math.min(...candidates.map(({ id }) => distances.get(id)!))
    const choices = candidates
      .filter(({ id }) => distances.get(id) === nearest)
      .map(({ id, name }) => ({
        label: 'choice.edgeOfTheEarth.attach',
        params: { name },
        target: { type: 'location' as const, id },
        then: [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'location', location: id },
          },
          { type: 'PlaceCluesOnLocationFromPool', location: id, amount: 2 },
        ] satisfies Message[],
      }))
    if (!choices.length) return []
    if (choices.length === 1) return choices[0]!.then
    return [
      {
        type: 'Ask',
        investigator,
        question: { kind: 'chooseOne', prompt: 'prompt.chooseLocation', choices },
      },
    ]
  },
  forced: (state, _trigger, self) =>
    self.placement.type === 'location' && clearedOfMirages(state, self.placement.location)
      ? [{ type: 'DiscardTreachery', treachery: self.id }]
      : [],
})
