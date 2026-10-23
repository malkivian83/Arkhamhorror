import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/synergy.json'
import './card-08050'
import './card-08077'
registerPlayerCards(data as PlayerCardDef[])
export const SYNERGY_RENDERED_CODES = data.map((c) => c.code)
