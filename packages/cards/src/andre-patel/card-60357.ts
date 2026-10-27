import { getInvestigator, registerPlayerCard, type GameState } from '@lcg/engine'
import { CENTER_STAGE } from './codes'

/** Actions its controller has spent this round, including the one in progress. */
const spent = (state: GameState, investigator: string) => {
  const record = getInvestigator(state, investigator).spentActions
  return record?.round === state.round ? record.count : 0
}

// RR: Uses, Limit 1 per investigator, Fast, Skill Test (ST.2). Center Stage: [fast] during a
// skill test, spend 1 renown and exhaust it: +1 skill value for each action spent this round
// (including the current one). Discarded when it has no renown.
registerPlayerCard({
  code: CENTER_STAGE,
  limitTitle: true,
  discardWhenEmpty: true,
  testOptions: (state, test, self) =>
    test.investigator !== self.owner || self.exhausted || self.uses < 1
      ? []
      : [
          {
            key: `${self.id}:stage`,
            investigator: self.owner,
            label: 'ability.centerStage',
            params: { n: spent(state, self.owner) },
            then: [
              { type: 'SpendUses', asset: self.id, amount: 1 },
              { type: 'ExhaustAsset', asset: self.id },
              { type: 'BoostSkillTest', amount: spent(state, self.owner) },
            ],
          },
        ],
})
