import type { LocationCard } from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'

/**
 * Muerte a la puesta de sol (VII). Códigos 78 + número de colección ES (181–212); los
 * originales ES son 227–267 (posición + 226) y los EN 221–261 (colección EN = ES − 2).
 * La Memoria de Pickman es el reverso del acto 2 (`78186b`).
 */
export const Z = {
  reference: '78181',
  agendas: ['78182', '78183', '78184'],
  acts: ['78185', '78186', '78187'],
  square: '78188',
  campaign: '78189',
  lobby: '78190',
  makeshift: '78191',
  organizer: '78192',
  observatory: '78193',
  tinkerer: '78194',
  north: '78195',
  south: '78196',
  deck: '78197',
  memory: '78186b',
  runes: '78198',
  blessing: '78199',
  exol: '78200',
  bag: '78201',
  words: '78202',
  blade: '78203',
  first: '78204',
  tendrils: '78205',
  pickman: '78206',
  crash: '78207',
  youOrMe: '78208',
  stalks: '78209',
  shrieking: '78210',
  hatred: '78211',
  writhing: '78212',
} as const

/** Rasgo Piso X de cada Lugar (sin rasgo: 0). */
export const FLOOR: Record<string, number> = {
  [Z.square]: 0,
  [Z.campaign]: 1,
  [Z.lobby]: 1,
  [Z.organizer]: 2,
  [Z.makeshift]: 2,
  [Z.observatory]: 3,
  [Z.tinkerer]: 3,
  [Z.north]: 4,
  [Z.south]: 4,
  [Z.deck]: 5,
  [Z.memory]: 0,
}
export const floorOf = (id: string | null | undefined) => (id ? (FLOOR[id] ?? 0) : 0)

/** Apoyos de historia Ritual (mazo de Ritual) y sus datos de carta. */
export const RITUAL = [Z.runes, Z.blessing, Z.exol, Z.bag, Z.words, Z.blade] as const
/** Las tres cartas que el acto 2 pide en la zona de victoria. */
export const KEY_RITUALS = [Z.blade, Z.words, Z.runes] as const
/** Dónde se coloca cada clave en la zona de victoria (capacidad [free] del Lugar). */
export const VICTORY_SITE: Record<string, string> = {
  [Z.words]: Z.observatory,
  [Z.blade]: Z.tinkerer,
  [Z.runes]: Z.deck,
}

const place = (
  id: string,
  name: string,
  shroud: number,
  clueValue: number,
  position: [number, number],
  symbol: string,
  connectsTo: string[],
  extra: Partial<LocationCard> = {},
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue,
  cluesPerInvestigator: clueValue > 0,
  connections: [],
  symbol,
  connectsTo,
  unrevealed: { symbol, connectsTo },
  position,
  ...extra,
})

/** Distribución sugerida (guía ES p. 18): Piso 0 abajo y Piso 5 arriba. */
export const sundownLocations = (): LocationCard[] => [
  place(Z.deck, 'Observation Deck', 3, 0, [1, 1], 'star', ['peanut', 'slashes', 'heart']),
  place(Z.south, 'Clock Chamber South', 2, 1, [0, 2], 'slashes', ['diamond', 'peanut', 'star']),
  place(Z.north, 'Clock Chamber North', 6, 3, [2, 2], 'peanut', ['T', 'slashes', 'star'], {
    victory: 1,
  }),
  place(Z.observatory, 'Observatory', 3, 1, [0, 3], 'diamond', ['moon', 'T', 'slashes']),
  place(Z.tinkerer, 'Tinkerer’s Workshop', 1, 2, [2, 3], 'T', ['hourglass', 'diamond', 'peanut']),
  place(Z.organizer, 'Organizer’s Office', 3, 1, [0, 4], 'moon', [
    'circle',
    'hourglass',
    'diamond',
  ]),
  place(Z.makeshift, 'Makeshift Lab', 4, 1, [2, 4], 'hourglass', ['triangle', 'moon', 'T']),
  place(Z.campaign, 'Campaign Office', 1, 0, [0, 5], 'circle', ['square', 'triangle', 'moon']),
  place(Z.lobby, 'Office Lobby', 2, 0, [2, 5], 'triangle', ['square', 'circle', 'hourglass']),
  place(Z.square, 'Independence Square', 1, 0, [1, 6], 'square', ['circle', 'triangle']),
]
/** Reverso del acto 2: entra revelado por encima de la Plataforma de observación. */
export const pickmansMemory = (): LocationCard =>
  place(Z.memory, 'Pickman’s Memory', 3, 3, [1, 0], 'heart', ['star'], { victory: 1 })

export const firstAmongMany = enemy({
  code: Z.first,
  name: 'First Among Many',
  traits: ['Monster', 'Infected', 'Elite'],
  fight: 0,
  health: 99,
  evade: 0,
  damage: 1,
  horror: 1,
  keywords: ['massive'],
  hasNoStats: true,
  cannotBeEvaded: true,
  noOpportunityAttacks: true,
  encounterBack: false,
})
export const tendrils = enemy({
  code: Z.tendrils,
  name: 'Tendrils of the First',
  traits: ['Elite', 'Monster', 'Infected'],
  fight: 5,
  health: 5,
  evade: 5,
  damage: 2,
  horror: 2,
  keywords: ['hunter', 'massive', 'retaliate'],
  noOpportunityAttacks: true,
  victory: 2,
  encounterBack: false,
})
export const pickman = enemy({
  code: Z.pickman,
  name: 'Dr. Elias Pickman',
  traits: ['Humanoid', 'Elite', 'Sorcerer'],
  fight: 4,
  health: 2,
  evade: 4,
  damage: 1,
  horror: 1,
  keywords: [],
  encounterBack: false,
})
export const sundownTreacheries = [
  treachery({ code: Z.crash, name: 'Come Crashing Down', traits: ['Blunder'], keywords: [] }),
  treachery({ code: Z.youOrMe, name: 'It’s You or Me.', traits: ['Terror'], keywords: ['peril'] }),
  treachery({ code: Z.stalks, name: 'Seeking Stalks', traits: ['Power'], keywords: [] }),
  treachery({ code: Z.shrieking, name: 'Shrieking Affliction', traits: ['Terror'], keywords: [] }),
  treachery({ code: Z.hatred, name: 'Undying Hatred', traits: ['Omen'], keywords: [] }),
  treachery({ code: Z.writhing, name: 'Writhing Closer', traits: ['Terror'], keywords: ['surge'] }),
]
const COPIES: Record<string, number> = {
  [Z.crash]: 2,
  [Z.youOrMe]: 3,
  [Z.stalks]: 2,
  [Z.shrieking]: 3,
  [Z.hatred]: 2,
  [Z.writhing]: 3,
}
export const sundownDeck = () => sundownTreacheries.flatMap((t) => copies(t, COPIES[t.code]!))
