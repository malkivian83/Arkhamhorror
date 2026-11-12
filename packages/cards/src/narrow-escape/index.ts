import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/narrow-escape.json'
import './card-03267'
registerPlayerCards(data as PlayerCardDef[])
export const NARROW_ESCAPE_RENDERED_CODES = data.map((c) => c.code)
