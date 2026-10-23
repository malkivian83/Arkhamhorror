import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/skill-replacement.json'
import './card-01036'
registerPlayerCards(data as PlayerCardDef[])
export const SKILL_REPLACEMENT_RENDERED_CODES = data.map((c) => c.code)
