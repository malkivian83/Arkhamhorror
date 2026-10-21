import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/conditional-commit.json'
import approvals from './approvals.json'
import './card-03116'
import './card-03117'
import './card-03118'
import './card-03119'
import './card-02227'
import './card-02192'
registerPlayerCards(data as PlayerCardDef[])
export const CONDITIONAL_RENDERED_CODES = approvals.cards.map((c) => c.code)
