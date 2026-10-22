import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/direct-events.json'
import approvals from './approvals.json'
import './card-60118'
import './card-60111'
import './card-11045'
registerPlayerCards(data as PlayerCardDef[])
export const DIRECT_EVENT_RENDERED_CODES = approvals.cards.map((c) => c.code)
