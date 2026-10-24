import { canEnter, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { moveChoices } from '../dunwich-pilot/effects'
// RR Move, Engagement, Skill Tests: the complete window waits for ST.8 if needed.
registerPlayerCard({
  code: '05036',
  limitTrait: 'Footwear',
  reactsBeforeEngagement: true,
  canPlay: (s, by) =>
    !Object.values(s.assets).some(
      (a) => a.owner === by && playerCardDef(a.code)?.traits.includes('Footwear'),
    ),
  skillModifier: (_s, _a, t) => (t.skill === 'agility' ? 1 : 0),
  reactions: (_s, trigger, self) =>
    trigger.type === 'beforeMoveEngagement' &&
    trigger.investigator === self.owner &&
    !self.exhausted
      ? [
          {
            key: self.id + ':track-shoes',
            investigator: self.owner,
            label: 'ability.survivorShoesMove',
            then: [
              { type: 'ExhaustAsset', asset: self.id },
              {
                type: 'BeginSkillTest',
                investigator: self.owner,
                source: self.id,
                skill: 'agility',
                difficulty: 3,
                kind: {
                  type: 'effect',
                  source: self.id,
                  onSuccess: [
                    {
                      type: 'PlayerCardEffect',
                      code: '05036',
                      investigator: self.owner,
                      step: 'move',
                    },
                  ],
                  onFail: [],
                  onFailEach: [],
                },
              },
            ],
          },
        ]
      : [],
  effect: (s, by, step) => {
    if (step !== 'move') return []
    const choices = moveChoices(s, by).filter(
      (c) => c.target?.type === 'location' && canEnter(s, by, c.target.id),
    )
    return choices.length
      ? [
          {
            type: 'Ask',
            investigator: by,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.cardMoveTo',
              promptParams: { card: '05036' },
              choices,
            },
          },
        ]
      : []
  },
})
