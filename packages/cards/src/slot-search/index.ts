import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/slot-search.json'
import './card-05283'
import './card-60260'
import './card-60181'
registerPlayerCards(data as PlayerCardDef[])
export const SLOT_SEARCH_RENDERED_CODES = data.map((c) => c.code)
