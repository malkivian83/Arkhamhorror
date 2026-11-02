import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/enemy-relocation.json'
import './card-08108'
import './card-08110'
import './card-60466'
registerPlayerCards(data as PlayerCardDef[])
export const ENEMY_RELOCATION_RENDERED_CODES = data.map((c) => c.code)
