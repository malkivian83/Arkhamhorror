import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/test-modifiers.json'
import approvals from './approvals.json'
import './card-02299'
import './card-06235'
import './card-60167'
import './card-06111'
import './card-09112'
registerPlayerCards(data as PlayerCardDef[])
export const TEST_MODIFIER_RENDERED_CODES = approvals.cards.map((c) => c.code)
