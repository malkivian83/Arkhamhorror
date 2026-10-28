import { registerInvestigator, turnAheadThisRound } from '@lcg/engine'
import { STELLA } from './codes'

// RR: Triggered Abilities, Limits, Additional Actions, Automatic Failure, Elder Sign. Stella
// Clark: [reaction] after you fail a skill test, you may take an additional action during your
// turn this round (limit once per round; it is a real action, FAQ 2.19). Outside her turn it
// waits for her turn this round; once that turn has ended it would change nothing.
registerInvestigator({
  code: STELLA,
  reactions: (state, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.investigator === self.id &&
    !trigger.succeeded &&
    turnAheadThisRound(state, self.id)
      ? [
          {
            key: 'stella',
            investigator: self.id,
            label: 'ability.stella.action',
            limit: { per: 'round' },
            then: [{ type: 'GainTurnActionsThisRound', investigator: self.id, amount: 1 }],
          },
        ]
      : [],
  // Signo arcano: +1. En lugar de eso, puedes elegir fracasar automáticamente en esta prueba
  // para curarte 1 punto de daño y 1 punto de horror.
  elderSign: (_state, self) => ({
    modifier: 1,
    immediate: [
      {
        type: 'Ask',
        investigator: self.id,
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.stella.elderSign',
          choices: [
            { label: 'choice.stella.resolve', then: [] },
            {
              label: 'choice.stella.fail',
              then: [
                { type: 'ForceSkillTestFailure' },
                { type: 'Heal', investigator: self.id, damage: 1, horror: 1 },
              ],
            },
          ],
        },
      },
    ],
  }),
})
