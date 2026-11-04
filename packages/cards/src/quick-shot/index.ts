import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/quick-shot.json'
import './card-11031'
registerPlayerCards(data as PlayerCardDef[])
export const QUICK_SHOT_RENDERED_CODES = data.map((c) => c.code)
