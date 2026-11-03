import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/warning-shot.json'
import './card-05229'
registerPlayerCards(data as PlayerCardDef[])
export const WARNING_SHOT_RENDERED_CODES = data.map((c) => c.code)
