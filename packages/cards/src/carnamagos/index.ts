import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/carnamagos.json'
import './card-10085'
import './card-10098'
import './card-10086'
import './card-10087'
import './card-10088'
import './card-10089'
import './card-10090'
registerPlayerCards(data as PlayerCardDef[])
export const CARNAMAGOS_RENDERED_CODES = data.map((c) => c.code)
