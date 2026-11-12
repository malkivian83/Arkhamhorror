import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/mythos-guard.json'
import './card-07269'
registerPlayerCards(data as PlayerCardDef[])
export const MYTHOS_GUARD_RENDERED_CODES = data.map((c) => c.code)
