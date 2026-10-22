import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/sequenced-events.json'
import approvals from './approvals.json'
import './card-01064'
import './card-03239'
import './card-60115'
registerPlayerCards(data as PlayerCardDef[])
export const SEQUENCED_EVENT_RENDERED_CODES = approvals.cards.map((c) => c.code)
