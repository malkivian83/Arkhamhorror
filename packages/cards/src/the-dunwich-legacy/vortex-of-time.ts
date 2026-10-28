import { activeInvestigators, registerTreachery } from '@lcg/engine'
import { damage, effectTest } from '../scenario-helpers'
import { W } from './doom-codes'
registerTreachery({
  code: W.vortex,
  revelation: (s) =>
    activeInvestigators(s)
      .filter((i) => i.location && [W.base, W.ascent, W.peak].includes(i.location as typeof W.base))
      .map((i) =>
        effectTest(i.id, 'Vortex of Time', 'willpower', 4, { onFail: [damage(i.id, 2)] }),
      ),
})
