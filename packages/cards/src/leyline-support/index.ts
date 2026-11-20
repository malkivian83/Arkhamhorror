import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/leyline-support.json'
import './card-08033'
import './card-08041'
import './card-08042'
import './card-08043'
import './card-08044'
import './card-11065'
import './card-09067'
import './card-11091'
registerPlayerCards(data as PlayerCardDef[])
export const LEYLINE_SUPPORT_RENDERED_CODES = data.map((c) => c.code)
