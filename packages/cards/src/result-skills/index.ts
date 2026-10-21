import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/result-skills.json'
import approvals from './approvals.json'
import './card-03231'
import './card-03228'
import './card-11029'
import './card-04112'
import './card-04157'
import './card-04201'
registerPlayerCards(data as PlayerCardDef[])
export const RESULT_RENDERED_CODES = approvals.cards.map((c) => c.code)
