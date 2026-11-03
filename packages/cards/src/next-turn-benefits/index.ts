import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/next-turn-benefits.json'
import './card-09053'
import './card-10129'
registerPlayerCards(data as PlayerCardDef[])
export const NEXT_TURN_BENEFITS_RENDERED_CODES = data.map((c) => c.code)
