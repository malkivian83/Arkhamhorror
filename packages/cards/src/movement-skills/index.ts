import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/movement-skills.json'
import approvals from './approvals.json'
import './card-01081'
import './card-02235'
import './card-60317'
registerPlayerCards(data as PlayerCardDef[])
export const MOVEMENT_SKILL_RENDERED_CODES = approvals.cards.map((c) => c.code)
