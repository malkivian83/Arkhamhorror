import { registerTreachery } from '@lcg/engine'
import { damage } from '../scenario-helpers'
import { U } from './unseen-codes'
import { unseenSpecific } from './unseen-helpers'
registerTreachery({
  code: U.tracks,
  revelation: (s, i) => [
    {
      type: 'Ask',
      investigator: i,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.unseen.tracks',
        choices: [
          { label: 'choice.unseen.horror', then: [damage(i, 0, 2)] },
          ...(s.setAside.some((c) => c.code === U.brood)
            ? [
                {
                  label: 'choice.unseen.spawn',
                  then: [unseenSpecific('unseenRandom', { purpose: 'spawn' })],
                },
              ]
            : []),
        ],
      },
    },
  ],
})
