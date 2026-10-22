import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/permanent-talents.json'
import approvals from './approvals.json'
import './card-02185'
import './card-02187'
import './card-02189'
import './card-02191'
import './card-02193'
registerPlayerCards(data as PlayerCardDef[])
export const PERMANENT_TALENT_RENDERED_CODES = approvals.cards.map((c) => c.code)
