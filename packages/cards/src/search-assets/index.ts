import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/search-assets.json'
import approvals from './approvals.json'
import './card-60159'
registerPlayerCards(data as PlayerCardDef[])
export const SEARCH_ASSET_RENDERED_CODES = approvals.cards.map((c) => c.code)
