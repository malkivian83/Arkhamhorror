import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/reactive-events.json'
import approvals from './approvals.json'
import './card-01023'
import './card-01080'
registerPlayerCards(data as PlayerCardDef[])
export const REACTIVE_EVENT_RENDERED_CODES = approvals.cards.map((c) => c.code)
