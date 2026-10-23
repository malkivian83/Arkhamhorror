import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/synergy-attacks.json'
import './card-08022'
registerPlayerCards(data as PlayerCardDef[])
export const SYNERGY_ATTACK_RENDERED_CODES = data.map((c) => c.code)
