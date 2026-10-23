import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/protected-draw.json'
import './card-04309'
registerPlayerCards(data as PlayerCardDef[])
export const PROTECTED_DRAW_RENDERED_CODES = data.map((c) => c.code)
