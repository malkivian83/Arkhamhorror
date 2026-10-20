import { registerPlayerCard } from '@lcg/engine'
import { cardName } from './effects'
// RR: Activate; Skill Tests; Campaign Log. Only success consumes the asset.
registerPlayerCard({
  code: '02021',
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:identify`,
      label: 'ability.pilotIdentify',
      actions: 1,
      provokes: true,
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          source: self.id,
          skill: 'intellect',
          difficulty: 4,
          kind: {
            type: 'effect',
            source: cardName(self.code),
            onFail: [],
            onFailEach: [],
            onSuccess: [
              { type: 'DiscardAsset', asset: self.id },
              { type: 'DrawCards', investigator, amount: 2 },
              { type: 'RecordNote', note: 'identifiedSolution' },
            ],
          },
        },
      ],
    },
  ],
})
