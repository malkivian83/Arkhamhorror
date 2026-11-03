import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/fortune-dilemmas.json'
import './card-09118'
registerPlayerCards(data as PlayerCardDef[])
export const FORTUNE_DILEMMAS_RENDERED_CODES = data.map((c) => c.code)
