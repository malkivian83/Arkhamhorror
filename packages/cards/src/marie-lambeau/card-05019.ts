import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { BARON_SAMEDI } from './codes'

// RR: Revelation, Leaves Play, Forced, Fast, Doom. Baron Samedi enters play under its owner's
// control and cannot leave play while it has fewer than 3 doom. Forced: when damage is
// placed on an investigator at its location, 1 additional damage is placed with it (before
// checking defeat). [fast] Exhaust: place 1 doom on it; with 3 or more doom, discard it.
registerPlayerCard({
  code: BARON_SAMEDI,
  revelation: (_state, investigator) => [
    { type: 'PutAssetIntoPlay', investigator, code: BARON_SAMEDI },
  ],
  cannotLeavePlay: (_state, self) => (self.doom ?? 0) < 3,
  additionalDamagePlaced: (state, self, investigator) => {
    const here = getInvestigator(state, self.owner).location
    return here !== null && getInvestigator(state, investigator).location === here ? 1 : 0
  },
  fastOptions: (_state, self) =>
    self.exhausted
      ? []
      : [
          {
            key: `${self.id}:doom`,
            investigator: self.owner,
            label: 'ability.baronSamedi',
            target: { type: 'asset', id: self.id },
            then: [
              { type: 'ExhaustAsset', asset: self.id },
              { type: 'PlaceDoomOnAsset', asset: self.id, amount: 1 },
              {
                type: 'PlayerCardEffect',
                code: BARON_SAMEDI,
                investigator: self.owner,
                step: 'check',
                data: { asset: self.id },
              },
            ],
          },
        ],
  effect: (state, _investigator, step, data) => {
    const self = state.assets[String(data.asset)]
    return step === 'check' && self && (self.doom ?? 0) >= 3
      ? [{ type: 'DiscardAsset', asset: self.id }]
      : []
  },
})
