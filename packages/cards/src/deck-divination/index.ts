import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/deck-divination.json'
import './card-01061'
import './card-03236'
import './card-02232'
import './card-60415'
import './card-08066'
registerPlayerCards(data as PlayerCardDef[])
export const DIVINATION_RENDERED_CODES = data.map((c) => c.code)
