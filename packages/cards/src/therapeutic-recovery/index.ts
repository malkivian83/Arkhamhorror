import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/therapeutic-recovery.json'
import './card-60264'
import './card-60278'
import './card-60577'
registerPlayerCards(data as PlayerCardDef[])
export const THERAPY_RENDERED_CODES = data.map((c) => c.code)
