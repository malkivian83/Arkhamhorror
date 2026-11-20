import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/opening-archives.json'
import './card-03264'
import './card-07303'
import './card-09077'
import './card-10079'
import './card-11099'
import './card-11118'
import './card-10059'
import './card-10060'
registerPlayerCards(data as PlayerCardDef[])
export const OPENING_ARCHIVES_RENDERED_CODES = data.map((c) => c.code)
