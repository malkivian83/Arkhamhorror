import { registerTreachery } from '@lcg/engine'
import { L } from './lost-codes'
import { lostSpecific } from './lost-helpers'
registerTreachery({
  code: L.wormhole,
  revelation: (_s, i) => [lostSpecific('lostMillLocation', { investigator: i, move: true })],
})
