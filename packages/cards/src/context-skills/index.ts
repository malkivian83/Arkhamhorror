import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/context-skills.json'
import approvals from './approvals.json'
import './card-60168'
import './card-60369'
import './card-03272'
import './card-11057'
import './card-60467'
import './card-60468'
import './card-60370'
import './card-60373'
import './card-60568'
registerPlayerCards(data as PlayerCardDef[])
export const CONTEXT_RENDERED_CODES = approvals.cards.map((c) => c.code)
