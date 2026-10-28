import { registerPlayerCard, type Asset, type GameState, type ReactionOption } from '@lcg/engine'
import { boost, resources } from '../asset-utilities/register'
import { WELL_CONNECTED_3 } from './codes'

/** [fast] Spend 2 resources: ready it (limit once per round), in or out of skill tests. */
const ready = (state: GameState, self: Asset): ReactionOption[] =>
  self.exhausted && resources(state, self.owner) >= 2
    ? [
        {
          key: `${self.id}:ready`,
          investigator: self.owner,
          label: 'ability.wellConnectedReady',
          limit: { per: 'round' },
          then: [
            { type: 'SpendResources', investigator: self.owner, amount: 2 },
            { type: 'ReadyAsset', asset: self.id },
          ],
        },
      ]
    : []

// RR: Limit 1 per investigator, Fast, Limits. Well Connected (3): [fast] exhaust it: +1 skill
// value for this skill test for every 4 resources you have. [fast] Spend 2 resources: ready it
// (limit once per round).
registerPlayerCard({
  code: WELL_CONNECTED_3,
  limitTitle: true,
  testOptions: (state, test, self) => {
    const amount = Math.floor(resources(state, self.owner) / 4)
    return [
      ...(!self.exhausted && test.investigator === self.owner && amount > 0
        ? [
            boost(
              self,
              'connected',
              'ability.exhaustForBonus',
              {},
              [{ type: 'ExhaustAsset', asset: self.id }],
              amount,
            ),
          ]
        : []),
      ...ready(state, self),
    ]
  },
  fastOptions: (state, self) => ready(state, self),
})
