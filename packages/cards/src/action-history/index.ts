import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/action-history.json'
import './card-04150'
registerPlayerCards(data as PlayerCardDef[])
export const ACTION_HISTORY_RENDERED_CODES = data.map((c) => c.code)
