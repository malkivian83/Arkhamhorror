import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import definitions from '../data/dunwich-followup.json'
import approvals from './approvals.json'
import './peter-sylvestre-2'
import './art-student'
import './emergency-cache-2'
registerPlayerCards(definitions as PlayerCardDef[])
export const FOLLOWUP_RENDERED_CODES = approvals.cards.map((card) => card.code)
