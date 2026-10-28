import { getInvestigator, registerTreachery } from '@lcg/engine'
import { damage } from '../scenario-helpers'
import { U } from './unseen-codes'
import { broods, unseenEnemyChoice } from './unseen-helpers'
registerTreachery({
  code: U.towering,
  attachedEnemy: { fight: 1, health: 1 },
  revelation: (s, i, t) =>
    broods(s).length
      ? [
          {
            type: 'Ask',
            investigator: i,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEnemy',
              choices: broods(s).map((e) => ({
                ...unseenEnemyChoice(s, e),
                then: [
                  {
                    type: 'PlaceTreachery',
                    treachery: t.id,
                    placement: { type: 'enemy', enemy: e.id },
                  },
                  ...(e.location === getInvestigator(s, i).location ? [damage(i, 1)] : []),
                ],
              })),
            },
          },
        ]
      : [],
})
