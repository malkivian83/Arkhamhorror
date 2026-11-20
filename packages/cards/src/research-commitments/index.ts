import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/research-commitments.json'
import './card-05153'
import './card-06023'
import './card-06197'
import './card-06278'
import './card-07223'
import './card-09047'
import './card-11094'
import './card-60330'
import './card-09032'
registerPlayerCards(data as PlayerCardDef[])
export const RESEARCH_COMMITMENTS_RENDERED_CODES = data.map((c) => c.code)
