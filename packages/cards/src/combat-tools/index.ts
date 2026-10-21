import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/combat-tools.json'
import approvals from './approvals.json'
import './card-03190'
import './card-60171'
import './card-02226'
import './card-04204'
import './card-04229'
import './card-60505'
import './card-03110'
import './card-06280'
registerPlayerCards(data as PlayerCardDef[])
export const COMBAT_RENDERED_CODES = approvals.cards.map((c) => c.code)
