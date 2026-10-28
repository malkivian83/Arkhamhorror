import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { L } from './lost-codes'
import { lostSpecific } from './lost-helpers'
export const yogSothoth = enemy({
  code: L.yog,
  name: 'Yog-Sothoth',
  traits: ['Ancient One', 'Elite'],
  fight: 4,
  health: 4,
  evade: 0,
  damage: 1,
  horror: 5,
  keywords: ['massive', 'hunter', 'retaliate'],
  noOpportunityAttacks: true,
  cannotBeEvaded: true,
})
registerEnemy({
  code: L.yog,
  healthModifier: (s) => 6 * s.startingInvestigatorCount,
  reactions: (_s, t, e) =>
    t.type === 'whenEnemyAttacks' && t.enemy === e.id
      ? [
          {
            key: `${e.id}:horror`,
            investigator: t.investigator,
            label: 'ability.lost.yog',
            then: [
              {
                type: 'Ask',
                investigator: t.investigator,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.lost.yog',
                  choices: Array.from({ length: 5 }, (_, n) => ({
                    label: 'choice.lost.mill',
                    params: { amount: n + 1 },
                    then: [
                      lostSpecific('lostYogHorror', {
                        enemy: e.id,
                        investigator: t.investigator,
                        amount: n + 1,
                      }),
                    ],
                  })),
                },
              },
            ],
          },
        ]
      : [],
})
