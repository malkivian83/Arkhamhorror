import { registerTreachery } from '@lcg/engine'
import { treachery } from '../scenario-helpers'

export const anamnesis = treachery({
  code: '08586',
  name: 'Anamnesis',
  traits: ['Terror'],
  keywords: ['peril'],
})

registerTreachery({
  code: anamnesis.code,
  revelation: (_state, investigator, self) => [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEffect',
        choices: [
          {
            label: 'choice.edgeOfTheEarth.takeHorror',
            params: { amount: 2 },
            then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 2, source: self.code }],
          },
          {
            label: 'choice.placeDoom',
            then: [{ type: 'PlaceDoom', amount: 1 }, { type: 'CheckAgenda' }],
          },
        ],
      },
    },
  ],
})
