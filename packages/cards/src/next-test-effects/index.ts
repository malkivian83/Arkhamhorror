import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/next-test-effects.json'
import './card-06115'
registerPlayerCards(data as PlayerCardDef[])
export const NEXT_TEST_RENDERED_CODES = data.map((c) => c.code)
