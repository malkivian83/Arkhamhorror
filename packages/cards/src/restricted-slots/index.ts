import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/restricted-slots.json'
import approvals from './approvals.json'
import './card-51001'
import './card-05112'
import './card-60205'
import './card-60410'
import './card-11044'
registerPlayerCards(data as PlayerCardDef[])
export const RESTRICTED_SLOT_RENDERED_CODES = approvals.cards.map((c) => c.code)
