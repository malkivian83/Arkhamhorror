import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/basic-action-skills.json'
import approvals from './approvals.json'
import './card-06166'
import './card-06204'
import './card-06246'
registerPlayerCards(data as PlayerCardDef[])
export const BASIC_ACTION_SKILL_RENDERED_CODES = approvals.cards.map((c) => c.code)
