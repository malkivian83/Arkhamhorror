import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/secret-scrolls.json'
import './card-05116'
import './card-05188'
import './card-05189'
registerPlayerCards(data as PlayerCardDef[])
export const SCROLL_RENDERED_CODES = data.map((c) => c.code)
