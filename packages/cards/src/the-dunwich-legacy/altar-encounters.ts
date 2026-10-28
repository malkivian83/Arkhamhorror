import { copies, treachery } from '../scenario-helpers'
import { B } from './altar-codes'
import { servantOfManyMouths } from './servant-of-many-mouths'
import { huntingNightgaunt } from './hunting-nightgaunt'
import './unhallowed-country'
import './sordid-and-silent'
import './on-wings-of-darkness'
import './kidnapped'
import './psychopomps-song'
import './strange-signs'
import './altar-rotting-remains'
import './key-to-the-chamber'
import './zebulon-whateley'
import './earl-sawyer'
import './powder-of-ibn-ghazi'
export const altarTreachery = (code: string, name: string, keywords: ('surge' | 'peril')[] = []) =>
  treachery({
    code,
    name,
    traits: [B.unhallowed, B.sordid, B.remains].includes(code as typeof B.unhallowed)
      ? ['Terror']
      : [B.song, B.signs].includes(code as typeof B.song)
        ? ['Omen']
        : [],
    keywords,
  })
export const ALTAR_ENCOUNTERS = [
  ...copies(altarTreachery(B.kidnapped, 'Kidnapped!'), 3),
  ...copies(altarTreachery(B.song, "Psychopomp's Song", ['surge', 'peril']), 2),
  ...copies(altarTreachery(B.signs, 'Strange Signs'), 2),
  ...copies(altarTreachery(B.remains, 'Rotting Remains'), 3),
  ...copies(servantOfManyMouths, 3),
]
export const DUNWICH_COUNTRY = [
  ...copies(altarTreachery(B.unhallowed, 'Unhallowed Country'), 2),
  ...copies(altarTreachery(B.sordid, 'Sordid and Silent'), 2),
]
export const NIGHTGAUNTS = [
  ...copies(huntingNightgaunt, 2),
  ...copies(altarTreachery(B.wings, 'On Wings of Darkness'), 2),
]
