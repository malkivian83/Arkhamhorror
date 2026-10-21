import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/distributed-results.json'
import approvals from './approvals.json'
import './card-11077'
import './card-10076'
registerPlayerCards(data as PlayerCardDef[])
export const DISTRIBUTED_RESULT_RENDERED_CODES = approvals.cards.map((c) => c.code)
