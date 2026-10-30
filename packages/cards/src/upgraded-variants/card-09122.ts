import { playerCardDef, registerPlayerCard } from '@lcg/engine'
// RR: Uses; Reaction Abilities; ST.1. Once per test, when its controller initiates an
// investigation or evasion; the reduction is additive and the difficulty never drops below 0.
registerPlayerCard({
  code: '09122',
  reactions: (state, trigger, self) => {
    const test = state.skillTest
    return trigger.type === 'afterSkillTestInitiated' &&
      trigger.investigator === self.owner &&
      test?.investigator === self.owner &&
      (test.kind.type === 'investigate' || test.kind.type === 'evade') &&
      self.uses > 0
      ? [
          {
            key: self.id + ':flashlight',
            investigator: self.owner,
            label: 'ability.flashlightDifficulty',
            params: { card: playerCardDef(self.code)?.name ?? self.code, amount: 2 },
            then: [
              { type: 'SpendUses', asset: self.id, amount: 1 },
              { type: 'ReduceSkillTestDifficulty', amount: 2 },
            ],
          },
        ]
      : []
  },
})
