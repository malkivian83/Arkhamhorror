import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/phase-bonuses.json'
import approvals from './approvals.json'
import './card-01042'
import './card-60208'
import './card-07152'
registerPlayerCards(data as PlayerCardDef[])
export const PHASE_BONUS_RENDERED_CODES = approvals.cards.map((c) => c.code)
