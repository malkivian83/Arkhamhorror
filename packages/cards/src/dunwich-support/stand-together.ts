import { registerPlayerCard } from '@lcg/engine'
import { atLocation, chooseTarget } from '../dunwich-pilot/helpers'
const partners = (state: Parameters<typeof atLocation>[0], investigator: string) =>
  atLocation(state, investigator).filter((i) => i.id !== investigator)
// RR: Target; Draw; Resources. Another active investigator at this location is mandatory.
registerPlayerCard({
  code: '02148',
  canPlay: (state, investigator) => partners(state, investigator).length > 0,
  play: (state, investigator) =>
    chooseTarget(
      investigator,
      partners(state, investigator).map((other) => ({
        label: 'choice.investigator',
        params: { name: other.name },
        target: { type: 'investigator', id: other.id },
        then: [
          { type: 'DrawCards', investigator, amount: 2 },
          { type: 'DrawCards', investigator: other.id, amount: 2 },
          { type: 'GainResources', investigator, amount: 2 },
          { type: 'GainResources', investigator: other.id, amount: 2 },
        ],
      })),
    ),
})
