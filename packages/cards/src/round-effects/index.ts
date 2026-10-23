import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/round-effects.json'
import './card-03155'
registerPlayerCards(data as PlayerCardDef[])
export const ROUND_EFFECT_RENDERED_CODES = data.map((c) => c.code)
