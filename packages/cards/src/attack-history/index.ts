import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/attack-history.json'
import './card-11025'
registerPlayerCards(data as PlayerCardDef[])
export const ATTACK_HISTORY_RENDERED_CODES = data.map((c) => c.code)
