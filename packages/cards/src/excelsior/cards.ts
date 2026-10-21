/**
 * Asesinato en el hotel Excelsior (Murder at the Excelsior Hotel, 2019): escenario
 * independiente con seis conjuntos de encuentros. Datos de las cartas (valores de
 * ArkhamDB y del proyecto de referencia). Análisis en docs-proyecto/33-asesinato-excelsior.md.
 */
import {
  registerPlayerCards,
  type EnemyCard,
  type LocationCard,
  type PlayerCardDef,
  type TreacheryCard,
} from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'

export const EXCELSIOR = 'murder-at-the-excelsior-hotel'

export const CODES = {
  scenario: '84001',
  theMurder: '84002',
  specialInvestigation: '84003',
  whatHappened: '84004',
  followingLeads: '84005',
  bloodstainedDagger: '84006',
  whatHaveYouDone: '84007',
  sergeantMonroe: '84008',
  arkhamOfficer: '84009',
  room225: '84010',
  suiteBalcony: '84011',
  secondFloorHall: '84012',
  foyer: '84013',
  restaurant: '84014',
  hotelRoof: '84015',
  room212: '84016',
  room245: '84017',
  office: '84018',
  basement: '84019',
  mrTrombly: '84020',
  conspicuousStaff: '84021',
  hotelGuest: '84022',
  noxiousFumes: '84023',
  drivenToMadness: '84024',
  bloodOnYourHands: '84025',
  incriminatingEvidence: '84026',
  violentOutburst: '84027',
  alienDevice: '84028',
  otherworldlyMeddler: '84029',
  encephalonSignal: '84030',
  managersKey: '84031',
  hotelManager: '84032',
  hotelSecurity: '84033',
  tomeOfRituals: '84034',
  dimensionalShambler: '84035',
  cultistOfTheEnclave: '84036',
  sinisterSolution: '84037',
  harvestedBrain: '84038',
  morbidAwareness: '84039',
  timeWornLocket: '84040',
  vengefulSpecter: '84041',
  chillingPresence: '84042',
} as const

/** El verdadero culpable (v. I a v. X): 84043 a 84052. */
export const TRUE_CULPRIT = Array.from({ length: 10 }, (_, n) => `840${43 + n}`)

/** Versión (1-10) de El verdadero culpable por su código, o 0. */
export const culpritVersion = (code: string | undefined) =>
  code ? TRUE_CULPRIT.indexOf(code) + 1 : 0

/** Umbral de perdición de cada versión de El verdadero culpable. */
export const CULPRIT_DOOM = [6, 8, 6, 14, 6, 6, 8, 6, 6, 12]

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
export const culpritName = (version: number) => `The True Culprit (v. ${ROMAN[version - 1]})`

// ---------------------------------------------------------------------------
// Apoyos Indicio y cartas de jugador del escenario
// ---------------------------------------------------------------------------

/** Apoyos Indicio, en el orden del texto de La verdad 7. */
export const LEADS = [
  CODES.alienDevice,
  CODES.timeWornLocket,
  CODES.sinisterSolution,
  CODES.managersKey,
  CODES.tomeOfRituals,
] as const
export type Lead = (typeof LEADS)[number]

const lead = (code: string, name: string, trait: string): PlayerCardDef => ({
  code,
  name,
  type: 'asset',
  class: 'neutral',
  traits: ['Lead', trait],
  slots: [],
  story: true,
})

export const PLAYER_DEFS: PlayerCardDef[] = [
  {
    code: CODES.bloodstainedDagger,
    name: 'Bloodstained Dagger',
    type: 'asset',
    class: 'neutral',
    traits: ['Item', 'Weapon', 'Melee', 'Cursed'],
    cost: 1,
    icons: { wild: 1 },
    slots: ['hand'],
    unique: true,
    story: true,
  },
  {
    code: CODES.whatHaveYouDone,
    name: 'What Have You Done?',
    type: 'treachery',
    class: 'neutral',
    traits: ['Madness'],
    weakness: 'weakness',
    story: true,
  },
  {
    code: CODES.sergeantMonroe,
    name: 'Sergeant Monroe',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally', 'Police'],
    cost: 5,
    health: 3,
    sanity: 3,
    icons: { willpower: 1, combat: 1, wild: 1 },
    slots: ['ally'],
    unique: true,
    story: true,
  },
  lead(CODES.alienDevice, 'Alien Device', 'Extraterrestrial'),
  lead(CODES.managersKey, "Manager's Key", 'Key'),
  lead(CODES.tomeOfRituals, 'Tome of Rituals', 'Tome'),
  lead(CODES.sinisterSolution, 'Sinister Solution', 'Science'),
  lead(CODES.timeWornLocket, 'Time-Worn Locket', 'Charm'),
]

registerPlayerCards(PLAYER_DEFS)

// ---------------------------------------------------------------------------
// Localizaciones
// ---------------------------------------------------------------------------

const place = (
  id: string,
  name: string,
  shroud: number,
  clueValue: number,
  symbol: string,
  connectsTo: string[],
  position: [number, number],
  victory?: number,
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue,
  cluesPerInvestigator: true,
  connections: [],
  symbol,
  connectsTo,
  position,
  ...(victory !== undefined ? { victory } : {}),
})

/** Colocación sugerida (página 9 y mapa de la referencia). */
export const LOCATIONS = {
  room225: place(CODES.room225, 'Room 225', 3, 1, 'circle', ['square', 'triangle'], [2, 1]),
  suiteBalcony: place(CODES.suiteBalcony, 'Suite Balcony', 2, 1, 'triangle', ['circle'], [3, 1]),
  secondFloorHall: place(
    CODES.secondFloorHall,
    'Second Floor Hall',
    2,
    1,
    'square',
    ['circle', 't', 'squiggle', 'plus', 'diamond', 'equals'],
    [1, 1],
  ),
  foyer: place(
    CODES.foyer,
    'Foyer',
    2,
    1,
    't',
    ['square', 'squiggle', 'hourglass', 'moon'],
    [1, 2],
  ),
  restaurant: place(CODES.restaurant, 'Restaurant', 4, 1, 'squiggle', ['square', 't'], [0, 1.5]),
  hotelRoof: place(CODES.hotelRoof, 'Hotel Roof', 3, 1, 'plus', ['square'], [1, 0], 1),
  room212: place(CODES.room212, 'Room 212', 4, 2, 'diamond', ['square'], [0, 0.5], 1),
  room245: place(CODES.room245, 'Room 245', 2, 1, 'equals', ['square'], [2, 0], 1),
  office: place(CODES.office, 'Office', 3, 2, 'moon', ['t', 'hourglass'], [2, 2], 1),
  basement: place(CODES.basement, 'Basement', 4, 1, 'hourglass', ['t', 'moon'], [1.5, 3], 1),
}

/** Rasgos impresos de cada localización. */
const LOCATION_TRAITS: Record<string, string[]> = {
  [CODES.room225]: ['Crime Scene'],
  [CODES.suiteBalcony]: ['Crime Scene'],
  [CODES.secondFloorHall]: ['Hall'],
  [CODES.foyer]: ['Hall'],
  [CODES.restaurant]: ['Hall'],
  [CODES.hotelRoof]: [],
  [CODES.room212]: ['Crime Scene'],
  [CODES.room245]: ['Crime Scene'],
  [CODES.office]: [],
  [CODES.basement]: ['Crime Scene'],
}
export const printedLocationTraits = (code: string) => LOCATION_TRAITS[code] ?? []

export const SET_ASIDE_LOCATIONS = [
  LOCATIONS.hotelRoof,
  LOCATIONS.room212,
  LOCATIONS.room245,
  LOCATIONS.office,
  LOCATIONS.basement,
]

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

export const arkhamOfficer = enemy({
  code: CODES.arkhamOfficer,
  name: 'Arkham Officer',
  traits: ['Humanoid', 'Police', 'Innocent'],
  fight: 3,
  health: 3,
  evade: 2,
  damage: 1,
  horror: 0,
  keywords: ['aloof'],
  victory: 0,
})

export const mrTrombly = enemy({
  code: CODES.mrTrombly,
  name: 'Mr. Trombly',
  traits: ['Humanoid', 'Staff'],
  fight: 4,
  health: 5,
  evade: 4,
  damage: 2,
  horror: 1,
  keywords: ['hunter'],
  victory: 1,
  spawnAt: CODES.foyer,
})

export const conspicuousStaff = enemy({
  code: CODES.conspicuousStaff,
  name: 'Conspicuous Staff',
  traits: ['Humanoid', 'Staff'],
  fight: 3,
  health: 2,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
  prey: { type: 'mostClues' },
})

export const hotelGuest = enemy({
  code: CODES.hotelGuest,
  name: 'Hotel Guest',
  traits: ['Humanoid', 'Guest', 'Innocent'],
  fight: 1,
  health: 1,
  evade: 2,
  damage: 1,
  horror: 0,
  keywords: ['aloof'],
  victory: 0,
})

export const otherworldlyMeddler = enemy({
  code: CODES.otherworldlyMeddler,
  name: 'Otherworldly Meddler',
  traits: ['Monster', 'Mi-Go', 'Elite'],
  fight: 4,
  health: 5,
  healthPerInvestigator: true,
  evade: 3,
  damage: 2,
  horror: 2,
  keywords: ['retaliate'],
  victory: 2,
})

export const hotelManager = enemy({
  code: CODES.hotelManager,
  name: 'Hotel Manager',
  traits: ['Monster', 'Staff', 'Elite'],
  fight: 3,
  health: 6,
  healthPerInvestigator: true,
  evade: 4,
  damage: 2,
  horror: 2,
  keywords: ['massive', 'retaliate'],
  victory: 2,
})

export const hotelSecurity = enemy({
  code: CODES.hotelSecurity,
  name: 'Hotel Security',
  traits: ['Humanoid', 'Monster', 'Staff'],
  fight: 4,
  health: 3,
  evade: 2,
  damage: 2,
  horror: 0,
  keywords: ['hunter', 'retaliate'],
})

export const dimensionalShambler = enemy({
  code: CODES.dimensionalShambler,
  name: 'Dimensional Shambler',
  traits: ['Monster', 'Extradimensional', 'Elite'],
  fight: 4,
  health: 4,
  healthPerInvestigator: true,
  evade: 3,
  damage: 2,
  horror: 2,
  keywords: ['hunter'],
  victory: 2,
})

export const cultistOfTheEnclave = enemy({
  code: CODES.cultistOfTheEnclave,
  name: 'Cultist of the Enclave',
  traits: ['Humanoid', 'Cultist'],
  fight: 3,
  health: 2,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: ['hunter'],
  spawnAt: CODES.basement,
})

export const vengefulSpecter = enemy({
  code: CODES.vengefulSpecter,
  name: 'Vengeful Specter',
  traits: ['Monster', 'Geist', 'Elite'],
  fight: 4,
  health: 4,
  healthPerInvestigator: true,
  evade: 5,
  damage: 0,
  horror: 2,
  keywords: ['retaliate'],
  victory: 2,
})

// ---------------------------------------------------------------------------
// Traiciones
// ---------------------------------------------------------------------------

const hazard = (code: string, name: string, traits: string[], peril = false): TreacheryCard =>
  treachery({ code, name, traits, keywords: peril ? ['peril'] : [] })

export const noxiousFumes = hazard(CODES.noxiousFumes, 'Noxious Fumes', ['Hazard'])
export const drivenToMadness = hazard(CODES.drivenToMadness, 'Driven to Madness', ['Curse'])
export const bloodOnYourHands = hazard(CODES.bloodOnYourHands, 'Blood on Your Hands', ['Terror'])
export const incriminatingEvidence = hazard(CODES.incriminatingEvidence, 'Incriminating Evidence', [
  'Evidence',
])
export const violentOutburst = hazard(CODES.violentOutburst, 'Violent Outburst', ['Curse'])
export const encephalonSignal = hazard(
  CODES.encephalonSignal,
  'Encephalon Signal',
  ['Hazard'],
  true,
)
export const harvestedBrain = hazard(CODES.harvestedBrain, 'Harvested Brain', [
  'Ancient',
  'Science',
])
export const morbidAwareness = hazard(CODES.morbidAwareness, 'Morbid Awareness', ['Hazard'])
export const chillingPresence = hazard(CODES.chillingPresence, 'Chilling Presence', ['Terror'])

/** Mazo de encuentros inicial: el conjunto Asesinato en el hotel Excelsior (22 cartas). */
export const encounterDeck = (): (EnemyCard | TreacheryCard)[] => [
  mrTrombly,
  ...copies(conspicuousStaff, 3),
  ...copies(hotelGuest, 4),
  ...copies(noxiousFumes, 2),
  ...copies(drivenToMadness, 3),
  ...copies(bloodOnYourHands, 4),
  ...copies(incriminatingEvidence, 2),
  ...copies(violentOutburst, 3),
]

/**
 * Cartas que el acto 1 baraja en el mazo de encuentros según los Apoyos Indicio
 * que haya en juego (3 copias de cada).
 */
export const LEAD_CARDS: Record<Lead, EnemyCard | TreacheryCard> = {
  [CODES.alienDevice]: encephalonSignal,
  [CODES.managersKey]: hotelSecurity,
  [CODES.tomeOfRituals]: cultistOfTheEnclave,
  [CODES.sinisterSolution]: morbidAwareness,
  [CODES.timeWornLocket]: chillingPresence,
}

/** Cartas apartadas al empezar (fuera del juego). */
export const setAsideCards = (): (EnemyCard | TreacheryCard)[] => [
  ...copies(arkhamOfficer, 3),
  ...Object.values(LEAD_CARDS).flatMap((card) => copies(card, 3)),
  { ...otherworldlyMeddler },
  { ...hotelManager },
  { ...dimensionalShambler },
  { ...vengefulSpecter },
  { ...harvestedBrain },
]

/** Datos impresos de las cartas de encuentro, por código (para la zona de victoria). */
export const ENCOUNTER_CARDS: Record<string, EnemyCard | TreacheryCard> = Object.fromEntries(
  [...encounterDeck(), ...setAsideCards()].map((c) => [c.code, c]),
)

/** Rasgos impresos de una carta de la zona de victoria. */
export const printedTraits = (code: string) => ENCOUNTER_CARDS[code]?.traits ?? []
