import { registerTreachery } from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { M } from './museum-codes'
registerTreachery({
  code: M.ephemeral,
  revelation: (_s, investigator) => [
    effectTest(investigator, 'Ephemeral Exhibits', 'intellect', 3, {
      onFailEach: [{ type: 'LoseActions', investigator, amount: 1 }],
    }),
  ],
})
