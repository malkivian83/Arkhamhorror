import { registerPlayerCard } from '@lcg/engine'
import { EXTRAVAGANT_RING } from './codes'

// RR: Uses, Triggered Abilities, Skill Test (ST.6). Extravagant Ring: [reaction] when you would
// succeed at a skill test, spend 1 renown and exhaust it: +2 skill value for this test. It stays
// in play without renown.
registerPlayerCard({
  code: EXTRAVAGANT_RING,
  reactions: (_state, trigger, self) =>
    trigger.type === 'whenWouldSucceed' &&
    trigger.investigator === self.owner &&
    !self.exhausted &&
    self.uses >= 1
      ? [
          {
            key: `${self.id}:ring`,
            investigator: self.owner,
            label: 'ability.extravagantRing',
            then: [
              { type: 'SpendUses', asset: self.id, amount: 1 },
              { type: 'ExhaustAsset', asset: self.id },
              { type: 'BoostSkillTest', amount: 2 },
            ],
          },
        ]
      : [],
})
