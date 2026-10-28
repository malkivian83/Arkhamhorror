import { activeInvestigators, registerTreachery } from '@lcg/engine'
import { B } from './altar-codes'
registerTreachery({
  code: B.song,
  revelation: (s, i, self) => [
    {
      type: 'Ask',
      investigator: i,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.altar.song',
        choices: activeInvestigators(s).map((a) => ({
          label: 'choice.investigator',
          params: { name: a.name },
          then: [
            {
              type: 'PlaceTreachery',
              treachery: self.id,
              placement: { type: 'threatArea', investigator: a.id },
            },
          ],
        })),
      },
    },
  ],
  beforeDamage: (_s, self, m) =>
    m.damage > 0 &&
    self.placement.type === 'threatArea' &&
    self.placement.investigator === m.investigator
      ? [
          { type: 'DiscardTreachery', treachery: self.id },
          { ...m, damage: m.damage + 2 },
        ]
      : null,
})
