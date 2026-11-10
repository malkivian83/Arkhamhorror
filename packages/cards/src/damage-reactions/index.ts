import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/damage-reactions.json'
import './card-01082'
import './card-02308'
import './card-03269'
import './card-03305'

registerPlayerCards(data as PlayerCardDef[])
export const DAMAGE_REACTIONS_RENDERED_CODES = data.map((c) => c.code)
