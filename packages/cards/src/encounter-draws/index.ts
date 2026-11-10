import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/encounter-draws.json'
import './card-02302'
import './card-02307'
import './card-03022'
import './card-04028'
import './card-54009'

registerPlayerCards(data as PlayerCardDef[])
export const ENCOUNTER_DRAWS_RENDERED_CODES = data.map((c) => c.code)
