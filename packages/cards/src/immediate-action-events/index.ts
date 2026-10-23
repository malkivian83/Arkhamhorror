import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/immediate-action-events.json'
import './card-05156'
registerPlayerCards(data as PlayerCardDef[])
export const IMMEDIATE_EVENT_RENDERED_CODES = data.map((c) => c.code)
