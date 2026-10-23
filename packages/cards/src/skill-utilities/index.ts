import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/skill-utilities.json'
import './card-09030'
import './card-11088'
import './card-60268'
import './card-60269'
registerPlayerCards(data as PlayerCardDef[])
export const SKILL_UTILITY_RENDERED_CODES = data.map((c) => c.code)
