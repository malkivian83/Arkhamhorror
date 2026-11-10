import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/reused-capabilities.json'
import './card-07308'
import './card-10072'
import './card-10104'
import './card-11078'
import './card-08053'
import './card-04035'
import './card-08093'
registerPlayerCards(data as PlayerCardDef[])
export const REUSED_CAPABILITIES_RENDERED_CODES = data.map((c) => c.code)
