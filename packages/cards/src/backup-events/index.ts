import { registerPlayerCards, type PlayerCardDef } from '@lcg/engine'
import data from '../data/backup-events.json'
import './card-08129'
registerPlayerCards(data as PlayerCardDef[])
export const BACKUP_RENDERED_CODES = data.map((c) => c.code)
