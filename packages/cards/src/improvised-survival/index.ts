import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/improvised-survival.json'
import './card-04033'
import './card-11092'
import './card-04312'
registerPlayerCards(data as PlayerCardDef[])
export const IMPROVISED_RENDERED_CODES = data.map((c) => c.code)
