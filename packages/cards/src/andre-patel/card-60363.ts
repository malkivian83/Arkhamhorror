import { getInvestigator, skillValueFor } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { POLISHED_CANE } from './codes'

// RR: Fight, Automatic Evasion, Elite. Polished Cane: [action] Fight ([combat]), adding your
// [agility] value. If the attack succeeds by 2 or more against a non-Elite enemy, you may
// exhaust it to automatically evade that enemy.
registerBasicAsset(
  POLISHED_CANE,
  [
    {
      action: 'fight',
      modifier: ({ state, investigator }, enemy) =>
        skillValueFor(state, investigator, 'agility', { type: 'fight', enemy: enemy!.id }),
      onSuccess: ({ self, investigator }, enemy) => [
        {
          type: 'IfTestResult',
          atLeast: 2,
          then: [
            {
              type: 'PlayerCardEffect',
              code: POLISHED_CANE,
              investigator,
              step: 'evade',
              data: { asset: self.id, enemy: enemy!.id },
            },
          ],
        },
      ],
    },
  ],
  () => ({
    effect: (state, investigator, step, data) => {
      const cane = state.assets[String(data.asset)]
      const enemy = state.enemies[String(data.enemy)]
      if (step !== 'evade' || !cane || cane.exhausted || !enemy) return []
      if (enemy.traits?.includes('Elite') || getInvestigator(state, investigator).eliminated)
        return []
      return [
        {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.optional',
            choices: [
              {
                label: 'choice.polishedCane',
                params: { enemy: enemy.name },
                target: { type: 'enemy', id: enemy.id },
                then: [
                  { type: 'ExhaustAsset', asset: cane.id },
                  { type: 'EvadeEnemy', enemy: enemy.id, by: investigator },
                ],
              },
              { label: 'choice.skip', then: [] },
            ],
          },
        },
      ]
    },
  }),
)
