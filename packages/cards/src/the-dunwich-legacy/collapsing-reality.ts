import { getInvestigator, registerTreachery } from '@lcg/engine'
import { damage } from '../scenario-helpers'
import { L } from './lost-codes'
import { isExtradimensional } from './lost-helpers'
registerTreachery({
  code: L.collapsing,
  revelation: (s, i) => {
    const l = getInvestigator(s, i).location
    return l && isExtradimensional(s, l)
      ? [{ type: 'RemoveLocation', location: l }, damage(i, 1)]
      : [damage(i, 2)]
  },
})
