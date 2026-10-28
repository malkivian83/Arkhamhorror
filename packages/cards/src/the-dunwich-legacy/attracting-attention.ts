import { getInvestigator, registerTreachery } from '@lcg/engine'
import { U } from './unseen-codes'
import { broods } from './unseen-helpers'
registerTreachery({
  code: U.attention,
  revelation: (s, i) =>
    broods(s).map((e) => ({
      type: 'HuntOnce',
      enemy: e.id,
      toward: getInvestigator(s, i).location!,
      attack: false,
    })),
})
