import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/attached-upgrades.json'
import approvals from './approvals.json'
import './card-04019'
import './card-04020'
import './card-04193'
import './card-60172'
import './card-60162'
import './card-60163'
registerPlayerCards(data as PlayerCardDef[])
export const ATTACHED_UPGRADE_RENDERED_CODES = approvals.cards.map((c) => c.code)
