import { registerTreachery } from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { B } from './altar-codes'
import { altarSpecific } from './altar-helpers'
registerTreachery({
  code: B.kidnapped,
  revelation: (_s, i, t) => [
    {
      type: 'Ask',
      investigator: i,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.altar.kidnapped',
        choices: (['willpower', 'agility'] as const).map((skill) => ({
          label: `choice.altar.${skill}`,
          then: [
            effectTest(i, 'Kidnapped!', skill, 4, {
              onFail: [altarSpecific('altarKidnap', { investigator: i, treachery: t.id })],
            }),
          ],
        })),
      },
    },
  ],
  forced: (_s, t, self) =>
    t.type === 'agendaAdvances' && self.placement.type === 'agenda'
      ? [altarSpecific('altarSacrifice'), { type: 'DiscardTreachery', treachery: self.id }]
      : [],
})
