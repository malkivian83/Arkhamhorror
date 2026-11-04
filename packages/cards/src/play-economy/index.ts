import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/play-economy.json'
import './card-04108'
import './card-04236'
import './card-53010'
import './card-09072'
import './card-60332'
import './card-60412'
import './card-60422'
import './card-60470'
import './card-08128'
registerPlayerCards(data as PlayerCardDef[])
export const PLAY_ECONOMY_RENDERED_CODES = data.map((c) => c.code)
