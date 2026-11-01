import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/services-parley.json'
import './card-05111'
import './card-05234'
import './card-05277'
import './card-04105'
import './card-05113'
import './card-10114'
import './card-04153'
registerPlayerCards(data as PlayerCardDef[])
export const SERVICE_RENDERED_CODES = data.map((c) => c.code)
