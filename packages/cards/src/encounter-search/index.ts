import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/encounter-search.json'
import './card-03263'
import './card-08028'
import './card-09068'
import './card-11053'
import './card-10093'
import './card-09111'
registerPlayerCards(data as PlayerCardDef[])
export const ENCOUNTER_SEARCH_RENDERED_CODES = data.map((c) => c.code)
