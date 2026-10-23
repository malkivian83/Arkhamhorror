import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/immediate-action-skills.json'
import './card-02229'
registerPlayerCards(data as PlayerCardDef[])
export const IMMEDIATE_SKILL_RENDERED_CODES = data.map((c) => c.code)
