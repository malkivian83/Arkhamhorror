import { registerTreachery } from '@lcg/engine'
import { damage, effectTest } from '../scenario-helpers'
import { L } from './lost-codes'
import { extradimensional } from './lost-helpers'
registerTreachery({
  code: L.expanse,
  revelation: (s, i) => {
    const n = extradimensional(s).length
    return n
      ? [
          effectTest(i, 'Vast Expanse', 'willpower', Math.min(5, n), {
            onFailEach: [damage(i, 0, 1)],
          }),
        ]
      : [{ type: 'GainSurge' }]
  },
})
