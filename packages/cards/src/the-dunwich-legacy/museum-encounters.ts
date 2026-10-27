import { copies, treachery } from '../scenario-helpers'
import { M } from './museum-codes'
import { huntingHorror } from './hunting-horror'
import './shadow-spawned'
import './stalked-in-the-dark'
import './passage-into-the-veil'
import './ephemeral-exhibits'
import './slithering-behind-you'
export { huntingHorror } from './hunting-horror'
export { horrorInPlay, museumSpecific } from './museum-helpers'
const t = (code: string, name: string) => treachery({ code, name, traits: [], keywords: [] })
export const MUSEUM_ENCOUNTERS = [
  huntingHorror,
  ...copies(t(M.stalked, 'Stalked in the Dark'), 2),
  ...copies(t(M.passage, 'Passage into the Veil'), 3),
  ...copies(t(M.ephemeral, 'Ephemeral Exhibits'), 2),
  ...copies(t(M.slithering, 'Slithering Behind You'), 2),
]
