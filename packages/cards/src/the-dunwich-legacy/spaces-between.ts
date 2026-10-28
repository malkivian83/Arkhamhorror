import { registerTreachery } from '@lcg/engine'
import { W } from './doom-codes'
import { doomSpecific } from './doom-helpers'
registerTreachery({ code: W.spaces, revelation: () => [doomSpecific('doomSpaces')] })
