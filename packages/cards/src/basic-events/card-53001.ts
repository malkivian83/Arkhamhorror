import { getInvestigator, registerPlayerCard, type Message } from '@lcg/engine'
import { damage } from '../basic-abilities/register'
import { actionFlags, targets, testChoices, type BasicEvent } from './register'
const spec: BasicEvent = { action: 'fight', skill: 'willpower', tags: ['spell', 'spirit'] }
// Blood Eclipse (1): take 2 damage as an additional cost for +2 willpower and +2 damage.
// Blood Eclipse (3): take up to 3 damage; +1 and +1 damage for each.
for (const [code, amounts] of [
  ['53001', [2]],
  ['04266', [0, 1, 2, 3]],
] as const)
  registerPlayerCard({
    code,
    ...actionFlags(spec),
    canPlay: (state, investigator) =>
      getInvestigator(state, investigator).location !== null &&
      targets(spec, state, investigator).length > 0,
    play: (state, investigator) => {
      const ctx = { state, investigator, code }
      const pay = (n: number): Message[] => [
        ...(n ? [damage(investigator, n)] : []),
        ...testChoices(spec, ctx, { modifier: n, extraDamage: n }),
      ]
      return amounts.length === 1
        ? pay(amounts[0]!)
        : [
            {
              type: 'Ask',
              investigator,
              question: {
                kind: 'chooseOne',
                prompt: 'prompt.chooseAmount',
                choices: amounts.map((n) => ({
                  label: 'choice.takeDamage',
                  params: { n },
                  then: pay(n),
                })),
              },
            },
          ]
    },
  })
