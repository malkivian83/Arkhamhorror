import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import definitions from '../data/dunwich-support.json'
import approvals from './approvals.json'
import './stand-together'
import './deduction-2'
import './preposterous-sketches'
import './fearless-2'
import './moment-of-respite'
registerPlayerCards(definitions as PlayerCardDef[])
export const SUPPORT_RENDERED_CODES = approvals.cards.map((c) => c.code)
