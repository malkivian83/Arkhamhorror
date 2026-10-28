import { activeInvestigators, registerTreachery } from '@lcg/engine'
import { W } from './doom-codes'
import { doomSpecific } from './doom-helpers'
registerTreachery({
  code: W.rites,
  revelation: (s) => [
    ...activeInvestigators(s).map((i) => ({
      type: 'MillDeck' as const,
      investigator: i.id,
      amount: 3,
    })),
    doomSpecific('doomRites'),
  ],
})
