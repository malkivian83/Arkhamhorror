import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/stella-sideboard.json'
import './card-03273'
import './card-06332'
import './card-09105'
import './card-09116'
import './card-09119'
registerPlayerCards(data as PlayerCardDef[])
export const STELLA_SIDEBOARD_CODES = data.map((c) => c.code)
