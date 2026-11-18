import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/discard-rituals.json'
import './card-07265'
import './card-06203'
import './card-10091'
import './card-10099'
import './card-08076'
import './card-09052'
import './card-09088'
registerPlayerCards(data as PlayerCardDef[])
export const DISCARD_RITUALS_RENDERED_CODES = data.map((c) => c.code)
