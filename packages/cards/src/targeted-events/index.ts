import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/targeted-events.json'
import './card-03191'
import './card-52003'
registerPlayerCards(data as PlayerCardDef[])
export const TARGETED_EVENT_RENDERED_CODES = data.map((c) => c.code)
