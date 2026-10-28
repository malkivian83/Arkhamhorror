import { registerTreachery } from '@lcg/engine'
import { damage, effectTest } from '../scenario-helpers'
import { B } from './altar-codes'
registerTreachery({
  code: B.remains,
  revelation: (_s, i) => [
    effectTest(i, 'Rotting Remains', 'willpower', 3, { onFailEach: [damage(i, 0, 1)] }),
  ],
})
