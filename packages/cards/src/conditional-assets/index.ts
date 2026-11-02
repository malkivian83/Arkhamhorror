import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/conditional-assets.json'
import './card-06026'
import './card-11096'
import './card-06323'
import './card-11090'
import './card-10127'
import './card-03313'
import './card-06159'
import './card-04158'
registerPlayerCards(data as PlayerCardDef[])
export const CONDITIONAL_ASSET_RENDERED_CODES = data.map((c) => c.code)
