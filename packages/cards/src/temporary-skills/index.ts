import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/temporary-skills.json'
import './card-04192'
import './card-09106'
registerPlayerCards(data as PlayerCardDef[])
export const TEMPORARY_SKILLS_RENDERED_CODES = data.map((c) => c.code)
