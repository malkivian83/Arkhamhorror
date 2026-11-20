import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/chaos-selection.json'
import './card-04197'
import './card-10097'
import './card-04310'
import './card-11046'
import './card-11047'
import './card-11048'
import './card-11060'
import './card-07268'
import './card-11073'
registerPlayerCards(data as PlayerCardDef[])
export const CHAOS_SELECTION_RENDERED_CODES = data.map((c) => c.code)
