import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/discard-reactions.json'
import './card-11083'
import './card-11089'
registerPlayerCards(data as PlayerCardDef[])
export const DISCARD_REACTIONS_RENDERED_CODES = data.map((c) => c.code)
