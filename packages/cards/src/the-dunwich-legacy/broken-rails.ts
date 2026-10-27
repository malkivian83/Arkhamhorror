import { activeInvestigators, getInvestigator, registerTreachery, type Message } from '@lcg/engine'
import { chooseAssetToDiscard } from '../scenario-helpers'
import { T } from './essex-codes'
registerTreachery({
  code: T.rails,
  revelation: (s, investigator) =>
    activeInvestigators(s)
      .filter((i) => i.location === getInvestigator(s, investigator).location)
      .flatMap((i): Message[] => [
        { type: 'LoseActions', investigator: i.id, amount: 1 },
        ...(i.damage >= 4 ? chooseAssetToDiscard(s, i.id) : []),
      ]),
})
