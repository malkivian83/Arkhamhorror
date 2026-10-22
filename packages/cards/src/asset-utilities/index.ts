import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/asset-utilities.json'
import approvals from './approvals.json'
import './allies'
import './boosts'
import './items'
registerPlayerCards(data as PlayerCardDef[])
export const ASSET_UTILITY_RENDERED_CODES = approvals.cards.map((c) => c.code)
