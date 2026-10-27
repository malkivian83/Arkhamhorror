import { registerTreachery } from '@lcg/engine'
import { damage } from '../scenario-helpers'
import { REMAINING_CODES as C } from './remaining-codes'
registerTreachery({
  code: C.offerOfPower,
  revelation: (_state, investigator) => [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEffect',
        choices: [
          {
            label: 'choice.dunwich.acceptPower',
            then: [
              { type: 'DrawCards', investigator, amount: 2 },
              { type: 'PlaceDoom', amount: 2 },
              { type: 'CheckAgenda' },
            ],
          },
          { label: 'choice.dunwich.refusePower', then: [damage(investigator, 0, 2)] },
        ],
      },
    },
  ],
})
