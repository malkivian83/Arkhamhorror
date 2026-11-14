import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/extra-actions.json'
import './card-05040'
import './card-06239'
import './card-08062'
import './card-08098'
import './card-08100'
import './card-54008'
import './card-10027'
import './card-10037'
registerPlayerCards(data as PlayerCardDef[])
export const EXTRA_ACTIONS_RENDERED_CODES = data.map((c) => c.code)
