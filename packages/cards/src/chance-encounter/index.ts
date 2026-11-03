import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/chance-encounter.json'
import './card-02270'
import './card-03238'
registerPlayerCards(data as PlayerCardDef[])
export const CHANCE_ENCOUNTER_RENDERED_CODES = data.map((c) => c.code)
