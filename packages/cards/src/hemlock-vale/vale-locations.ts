import type { LocationCard } from '@lcg/engine'

/**
 * Conjunto de encuentros El Valle (10705–10712), cara de Día. En los preludios los
 * Lugares solo se conectan por sus iconos (guía, p. 3); posiciones del mapa de la p. 5.
 */
export const VALE = {
  boardingHouse: '10705a',
  theCrossroads: '10706a',
  hemlockChapel: '10707a',
  theOldMill: '10708a',
  theAtwoodHouse: '10709a',
  tadsGeneralStore: '10710a',
  valeSchoolhouse: '10711a',
  theCommons: '10712a',
} as const

const vale = (
  id: string,
  name: string,
  shroud: number,
  clueValue: number,
  symbol: string,
  connectsTo: string[],
  position: [number, number],
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue,
  cluesPerInvestigator: false,
  symbol,
  connectsTo,
  connections: [],
  position,
})

export const valeDayLocations: LocationCard[] = [
  vale(VALE.hemlockChapel, 'Hemlock Chapel', 3, 0, 'triangle', ['diamond', 'moon'], [1, 0]),
  vale(VALE.tadsGeneralStore, "Tad's General Store", 2, 0, 'square', ['diamond', 'star'], [2, 0]),
  vale(
    VALE.theAtwoodHouse,
    'The Atwood House',
    4,
    0,
    'moon',
    ['diamond', 'triangle', 'heart'],
    [0, 0.5],
  ),
  vale(
    VALE.theCrossroads,
    'The Crossroads',
    2,
    0,
    'diamond',
    ['triangle', 'square', 'star', 'circle', 'heart', 'moon'],
    [1, 1],
  ),
  vale(VALE.theCommons, 'The Commons', 1, 0, 'star', ['diamond', 'square', 'spade'], [2, 1]),
  vale(VALE.theOldMill, 'The Old Mill', 2, 1, 'heart', ['diamond', 'moon'], [0, 1.5]),
  vale(VALE.boardingHouse, 'Boarding House', 3, 0, 'circle', ['diamond', 'spade'], [1, 2]),
  vale(VALE.valeSchoolhouse, 'Vale Schoolhouse', 3, 0, 'spade', ['star', 'circle'], [2, 2]),
]
