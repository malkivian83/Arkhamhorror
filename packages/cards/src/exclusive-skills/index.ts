import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/exclusive-skills.json'
import './card-04036'
import './card-11093'
registerPlayerCards(data as PlayerCardDef[])
export const EXCLUSIVE_SKILL_RENDERED_CODES = data.map((c) => c.code)
