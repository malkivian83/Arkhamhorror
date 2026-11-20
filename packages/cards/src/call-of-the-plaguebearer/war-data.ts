import type { LocationCard } from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'
import { RING } from './chorus-data'
import type { DefendMetric } from './night-helpers'

/**
 * Guerra al atardecer (VI). Códigos 78 + número de colección ES (151–180); los originales ES
 * son 189–226 y los EN 183–220 (colección EN = ES − 2). Poder desatado: ES 377–380 (290–291),
 * EN 347–350 (288–289).
 */
export const W = {
  reference: '78151',
  agendas: ['78152', '78153', '78154'],
  acts: ['78155', '78156', '78157', '78158'],
  crater: '78159',
  flame: '78160',
  king: '78161',
  abner: '78162',
  armitage: '78163',
  doyle: '78164',
  hibbs: '78165',
  couple: '78166',
  ma: '78167',
  miriam: '78168',
  vicePresident: '78169',
  messengerFlame: '78170',
  messengerKing: '78171',
  site: '78172',
  burst: '78173',
  protagonist: '78174',
  unreal: '78175',
  dread: '78176',
  flaming: '78177',
  acolyte: '78178',
  candlejack: '78179',
  molten: '78180',
  heed: '78290',
  ire: '78291',
} as const

/** Apoyo de historia que entra en cada Lugar Protegido (por código de Lugar del II). */
export const RALLY_ASSETS: Record<
  string,
  { code: string; name: string; subname: string; metric: DefendMetric; difficulty: number }
> = {
  '78023': {
    code: W.doyle,
    name: 'Doyle Jeffries',
    subname: 'First on the Scene',
    metric: 'events',
    difficulty: 2,
  },
  '78024': {
    code: W.vicePresident,
    name: 'The Vice President',
    subname: 'The Best Money Can Buy',
    metric: 'resources',
    difficulty: 8,
  },
  '78025': {
    code: W.couple,
    name: 'The Loving Couple',
    subname: 'Unbreakable Bond',
    metric: 'assets',
    difficulty: 3,
  },
  '78026': {
    code: W.hibbs,
    name: 'Hibbs',
    subname: 'He’s Had Enough',
    metric: 'skill',
    difficulty: 6,
  },
  '78027': {
    code: W.ma,
    name: 'Ma Matheson',
    subname: 'Friends in High Places',
    metric: 'ally',
    difficulty: 0,
  },
  '78028': {
    code: W.armitage,
    name: 'Henry Armitage',
    subname: 'Smarter than He Lets On',
    metric: 'hand',
    difficulty: 3,
  },
  '78029': {
    code: W.abner,
    name: 'Abner Weems',
    subname: 'Drunken Rage',
    metric: 'skills',
    difficulty: 2,
  },
  '78030': {
    code: W.miriam,
    name: 'Miriam Beecher',
    subname: 'Magic Made Manifest',
    metric: 'nonAlly',
    difficulty: 0,
  },
}
export const RALLY_TRAITS: Record<string, string[]> = {
  [W.armitage]: ['Arkham', 'Miskatonic', 'Human'],
  [W.hibbs]: ['Arkham', 'Human', 'Agency'],
  [W.miriam]: ['Arkham', 'Human', 'Sorcerer'],
}

/** Anillo del IV desplazado una columna para dejar sitio a los Portales a ambos lados. */
const RING_POSITION: [number, number][] = [
  [1, 0],
  [2, 0],
  [3, 0],
  [3, 1],
  [3, 2],
  [2, 2],
  [1, 2],
  [1, 1],
]
export const warPosition = (id: string): [number, number] =>
  RING_POSITION[RING.indexOf(id as (typeof RING)[number])] ?? [2, 1]

export const crater = (position: [number, number]): LocationCard => ({
  id: W.crater,
  name: 'Crater of Unbinding',
  shroud: 3,
  clueValue: 0,
  cluesPerInvestigator: false,
  connections: [],
  symbol: 'none',
  connectsTo: [],
  unrevealed: { symbol: 'none', connectsTo: [] },
  position,
})
/** Portales: sin revelar no tienen símbolo ni se puede entrar; revelados, conexión de un sentido. */
const portal = (
  id: string,
  name: string,
  unrevealedName: string,
  symbol: string,
  connectsTo: string,
  position: [number, number],
): LocationCard => ({
  id,
  name,
  unrevealedName,
  shroud: 2,
  clueValue: 1,
  cluesPerInvestigator: false,
  connections: [],
  symbol,
  connectsTo: [connectsTo],
  unrevealed: { symbol: 'none', connectsTo: [] },
  position,
  victory: 1,
})
export const portals = (): LocationCard[] => [
  // Edificio de Ciencias: conecta con el símbolo de la Biblioteca Orne (acto 2b la usa de salida).
  portal(W.flame, 'The Science Building', 'Portal of the Flame', 'trefoil', 'squiggle', [0, 0]),
  // Teatro Ward: conecta con el símbolo del Banco de Arkham.
  portal(W.king, 'Ward Theatre', 'Portal of the King', 'star', 'square', [4, 2]),
]

export const messengerFlame = enemy({
  code: W.messengerFlame,
  name: 'Messenger of the Flame',
  traits: ['Monster', 'Sorcerer', 'Elite'],
  fight: 4,
  health: 4,
  healthPerInvestigator: true,
  evade: 2,
  damage: 2,
  horror: 1,
  keywords: ['hunter', 'massive'],
  victory: 2,
})
export const messengerKing = enemy({
  code: W.messengerKing,
  name: 'Messenger of The King',
  traits: ['Monster', 'Sorcerer', 'Elite'],
  fight: 2,
  health: 4,
  healthPerInvestigator: true,
  evade: 4,
  damage: 1,
  horror: 2,
  keywords: ['hunter', 'massive'],
  victory: 2,
})
export const protagonist = enemy({
  code: W.protagonist,
  name: 'Delusional Protagonist',
  traits: ['Humanoid', 'Cultist'],
  fight: 3,
  health: 2,
  evade: 2,
  damage: 0,
  horror: 1,
  keywords: ['aloof', 'hunter'],
})
export const acolyte = enemy({
  code: W.acolyte,
  name: 'Infernal Acolyte',
  traits: ['Humanoid', 'Cultist'],
  fight: 1,
  health: 2,
  evade: 4,
  damage: 1,
  horror: 0,
  keywords: ['aloof', 'hunter'],
})
export const candlejack = enemy({
  code: W.candlejack,
  name: 'Lumbering Candlejack',
  traits: ['Monster'],
  fight: 3,
  health: 4,
  evade: 4,
  damage: 1,
  horror: 2,
  keywords: ['hunter', 'alert'],
})
export const molten = enemy({
  code: W.molten,
  name: 'Molten Murder',
  traits: ['Monster'],
  fight: 4,
  health: 3,
  evade: 2,
  damage: 2,
  horror: 1,
  keywords: ['hunter', 'retaliate'],
})
export const siteOfUnbinding = treachery({
  code: W.site,
  name: 'Site of Unbinding',
  traits: ['Omen'],
  keywords: [],
})
export const warTreacheries = [
  treachery({ code: W.burst, name: 'Burst of Flame', traits: ['Hex'], keywords: [] }),
  treachery({ code: W.unreal, name: 'Unreal Advance', traits: ['Omen'], keywords: [] }),
  treachery({ code: W.dread, name: 'Dread Epiphany', traits: ['Terror'], keywords: [] }),
  treachery({ code: W.flaming, name: 'Flaming Advance', traits: ['Omen'], keywords: [] }),
]
/** Poder desatado (Unbound Power). */
export const unboundPower = [
  treachery({ code: W.heed, name: 'Heed the Call', traits: ['Power'], keywords: [] }),
  treachery({
    code: W.ire,
    name: 'Ire of the Unbound',
    traits: ['Terror', 'Tactic'],
    keywords: [],
  }),
]
/** Cartas de la Llama y del Rey que retira el acto 2b al cerrar cada Portal. */
export const FLAME_CARDS = [W.burst, W.flaming, W.acolyte, W.molten] as const
export const KING_CARDS = [W.protagonist, W.dread, W.candlejack, W.unreal] as const
export const warDeck = () => [
  ...warTreacheries.flatMap((t) => copies(t, 2)),
  ...copies(protagonist, 2),
  ...copies(acolyte, 2),
  ...unboundPower.flatMap((t) => copies(t, 2)),
]
