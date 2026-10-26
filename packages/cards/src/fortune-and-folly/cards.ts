/**
 * Fortuna e insensatez (88001–88053): códigos, datos de las cartas de Encuentro, Lugares
 * del grupo público, bolsas del caos y Apoyos de historia. Guía ES pp. 3–5 y 14–15.
 * El texto de las cartas está en el catálogo `fortune-cards`; aquí solo sus valores.
 */
import {
  registerPlayerCards,
  type ChaosToken,
  type Difficulty,
  type EnemyCard,
  type LocationCard,
  type TreacheryCard,
} from '@lcg/engine'
import { enemy, treachery } from '../scenario-helpers'

export const FORTUNE_AND_FOLLY = 'fortune-and-folly'
export const PART_ONE = 'fortune-and-folly-part-1'
export const PART_TWO = 'fortune-and-folly-part-2'

export const CODES = {
  scenario: '88001',
  theHouseAlwaysWatches: '88002',
  openingHand: '88003',
  theTurn: '88004',
  allBetsDown: '88005',
  casingTheJoint: '88006',
  theTake: '88007',
  theExit: '88008',
  casinoFloor: '88009',
  casinoFloorBusy: '88009b',
  pokerTable: '88010',
  rouletteWheel: '88011',
  baccaratTable: '88012',
  slotMachines: '88013',
  highRollersTable: '88014',
  highRollersTableBusy: '88014b',
  casinoLounge: '88015',
  casinoLoungeBusy: '88015b',
  staffAccessHallway: '88016',
  securityOffice: '88017',
  guardRoom: '88018',
  ownersOffice: '88019',
  countingRoom: '88020',
  vaultDoor: '88021',
  relicRoom: '88022',
  theStakeout: '88023',
  ifTheUniformFits: '88024',
  theFace: '88028',
  theMuscle: '88029',
  theThief: '88030',
  theGrifter: '88031',
  isamara: '88032',
  cashCart: '88033',
  abarran: '88034a',
  abarranUnleashed: '88034b',
  wellspring: '88045',
} as const

/** Roles: cara Inexperto (código) y Experimentado (código + "b"). */
export const ROLES = [CODES.theFace, CODES.theMuscle, CODES.theThief, CODES.theGrifter] as const
export const practiced = (code: string) => `${code}b`
/** Código impreso del Rol, sea cual sea su cara. */
export const roleOf = (code: string) => ROLES.find((r) => code === r || code === practiced(r))
export const isPracticed = (code: string) => code.endsWith('b')

// ---------------------------------------------------------------------------
// Bolsas del caos (guía p. 3)
// ---------------------------------------------------------------------------

const SYMBOLS: ChaosToken[] = [
  'skull',
  'skull',
  'cultist',
  'tablet',
  'elderThing',
  'autoFail',
  'elderSign',
]
const NORMAL: ChaosToken[] = [1, 0, 0, -1, -2, -2, -3, -3, -4, -5, ...SYMBOLS]
const HARD: ChaosToken[] = [0, 0, -1, -1, -2, -2, -3, -3, -6, -7, ...SYMBOLS]

export const CHAOS_BAGS: Record<Difficulty, ChaosToken[]> = {
  easy: NORMAL,
  standard: NORMAL,
  hard: HARD,
  expert: HARD,
}

// ---------------------------------------------------------------------------
// Enemigos y traiciones del conjunto Fortuna e insensatez
// ---------------------------------------------------------------------------

/** Sentido de Errante de cada copia (impreso en la carta). */
export const PATROL: Record<string, 'clockwise' | 'counterclockwise'> = {
  '88034a': 'clockwise',
  '88035a': 'counterclockwise',
  '88035b': 'counterclockwise',
  '88035c': 'clockwise',
  '88036a': 'clockwise',
  '88036b': 'counterclockwise',
  '88037a': 'clockwise',
  '88037b': 'clockwise',
  '88037c': 'counterclockwise',
  '88046a': 'counterclockwise',
  '88046b': 'clockwise',
  '88047a': 'counterclockwise',
  '88047b': 'clockwise',
}

export const GUARDS = ['88035a', '88035b', '88035c']
export const DEALERS = ['88036a', '88036b']
export const PATROLS = ['88037a', '88037b', '88037c']
export const QUESTIONING = ['88038a', '88038b', '88038c', '88038d']
export const SPOTLIGHTS = ['88039a', '88039b', '88039c']
export const AVARICE = ['88040a', '88040b', '88040c']
export const GAZES = ['88041a', '88041b', '88041c']
export const GAMBLERS = ['88042a', '88042b', '88042c']
/** Enemigos únicos (los demás Casino son «no únicos»). */
export const UNIQUE_ENEMIES: string[] = [CODES.abarran, CODES.abarranUnleashed]

/** Abarran (El hombre del anillo de rubí): sin valores («–»), no puede recibir daño. */
export const abarran: EnemyCard = enemy({
  code: CODES.abarran,
  hasNoStats: true,
  name: 'Abarran Arrigorriagakoa',
  traits: ['Humanoid', 'Casino', 'Coterie', 'Elite'],
  fight: 0,
  health: 1,
  evade: 0,
  damage: 0,
  horror: 0,
  keywords: ['aloof'],
})

const casino = (
  code: string,
  name: string,
  stats: Pick<EnemyCard, 'fight' | 'health' | 'evade' | 'damage' | 'horror'>,
): EnemyCard => enemy({ code, name, traits: ['Humanoid', 'Casino'], keywords: ['aloof'], ...stats })

export const casinoGuard = (code: string) =>
  casino(code, 'Casino Guard', { fight: 3, health: 3, evade: 2, damage: 2, horror: 0 })
export const houseDealer = (code: string) =>
  casino(code, 'House Dealer', { fight: 2, health: 1, evade: 2, damage: 0, horror: 1 })
export const securityPatrol = (code: string) =>
  casino(code, 'Security Patrol', { fight: 3, health: 2, evade: 3, damage: 1, horror: 0 })

const scheme = (code: string, name: string, traits: string[], peril = false): TreacheryCard =>
  treachery({ code, name, traits, keywords: peril ? ['peril'] : [] })

/** Conjunto Fortuna e insensatez sin Abarran: guía p. 14 (72 cartas, 24 de Encuentro). */
export const fortuneAndFollySet = (): (EnemyCard | TreacheryCard)[] => [
  ...GUARDS.map(casinoGuard),
  ...DEALERS.map(houseDealer),
  ...PATROLS.map(securityPatrol),
  ...QUESTIONING.map((c) => scheme(c, 'Inconvenient Questioning', ['Scheme'])),
  ...SPOTLIGHTS.map((c) => scheme(c, 'Arcane Spotlight', ['Hex', 'Obstacle'])),
  ...AVARICE.map((c) => scheme(c, 'Avarice Calls', ['Curse'], true)),
  ...GAZES.map((c) => scheme(c, 'Suspicious Gaze', ['Scheme'])),
  ...GAMBLERS.map((c) => scheme(c, 'Obsessed Gambler', ['Terror'])),
]

/** Enemigos que aparecen en la preparación (fuera del mazo): Abarran y el guardia del uniforme. */
export const FORTUNE_SETUP_ENEMIES: EnemyCard[] = [abarran, casinoGuard(GUARDS[0]!)]

export const isCasino = (traits: string[] | undefined) => (traits ?? []).includes('Casino')

// ---------------------------------------------------------------------------
// Lugares del grupo público (Noche tranquila), guía p. 15
// ---------------------------------------------------------------------------

const place = (
  id: string,
  name: string,
  shroud: number,
  clues: number,
  position: [number, number],
  connections: string[],
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue: clues,
  cluesPerInvestigator: clues > 0,
  connections,
  position,
})

export const PUBLIC_LOCATIONS: LocationCard[] = [
  place(
    CODES.highRollersTable,
    "High Roller's Table",
    3,
    2,
    [0, 0],
    [CODES.casinoLounge, CODES.baccaratTable],
  ),
  place(
    CODES.casinoLounge,
    'Casino Lounge',
    5,
    2,
    [2, 0],
    [CODES.highRollersTable, CODES.rouletteWheel],
  ),
  place(
    CODES.baccaratTable,
    'Baccarat Table',
    4,
    1,
    [0, 1],
    [CODES.highRollersTable, CODES.pokerTable, CODES.rouletteWheel],
  ),
  place(
    CODES.rouletteWheel,
    'Roulette Wheel',
    3,
    1,
    [2, 1],
    [CODES.casinoLounge, CODES.baccaratTable, CODES.slotMachines],
  ),
  place(CODES.pokerTable, 'Poker Table', 3, 1, [0, 2], [CODES.baccaratTable, CODES.casinoFloor]),
  place(CODES.casinoFloor, 'Casino Floor', 2, 0, [1, 2], [CODES.pokerTable, CODES.slotMachines]),
  place(
    CODES.slotMachines,
    'Slot Machines',
    2,
    1,
    [2, 2],
    [CODES.casinoFloor, CODES.rouletteWheel],
  ),
]

/** Ruta de Errante del grupo público en el sentido de las agujas del reloj (guía p. 15). */
export const PUBLIC_RING: string[] = [
  CODES.highRollersTable,
  CODES.casinoLounge,
  CODES.rouletteWheel,
  CODES.slotMachines,
  CODES.casinoFloor,
  CODES.pokerTable,
  CODES.baccaratTable,
]

/** Lugares Juego: sus habilidades comprueban iconos de juego. */
export const GAME_LOCATIONS: string[] = [
  CODES.pokerTable,
  CODES.rouletteWheel,
  CODES.baccaratTable,
  CODES.slotMachines,
  CODES.highRollersTable,
]

// ---------------------------------------------------------------------------
// Apoyos de historia
// ---------------------------------------------------------------------------

registerPlayerCards([
  ...[
    [CODES.theFace, 'The Face'],
    [CODES.theMuscle, 'The Muscle'],
    [CODES.theThief, 'The Thief'],
    [CODES.theGrifter, 'The Grifter'],
  ].flatMap(([code, name]) => [
    {
      code: code!,
      name: name!,
      type: 'asset' as const,
      class: 'neutral',
      traits: ['Role', 'Unpracticed'],
      unique: true,
      story: true,
    },
    {
      code: practiced(code!),
      name: name!,
      type: 'asset' as const,
      class: 'neutral',
      traits: ['Role', 'Practiced'],
      unique: true,
      story: true,
    },
  ]),
  {
    code: CODES.isamara,
    name: 'Isamara Ordoñez',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally', 'Casino', 'Discreet'],
    unique: true,
    story: true,
  },
])

// ---------------------------------------------------------------------------
// Parte II: noche ajetreada y grupo restringido (guía pp. 15 y 26)
// ---------------------------------------------------------------------------

export const PART_TWO_CODES = {
  heist: '88023b',
  packageDelivery: '88024b',
  lightsOut: '88025',
  unlikelyInjuries: '88026',
  personalEntanglement: '88027',
  isamaraCrew: '88032b',
  fortunesShield: ['88046a', '88046b'],
  fortunesDagger: ['88047a', '88047b'],
  dimensionalShambler: '88048',
  duplicators: ['88049a', '88049b'],
  displacers: ['88050a', '88050b'],
  hypnosis: ['88051a', '88051b', '88051c'],
  grips: ['88052a', '88052b', '88052c'],
  hungers: ['88053a', '88053b'],
} as const

/** Desaprobación de la fortuna: las tres cartas de Historia (se elige una al azar). */
export const DISFAVOR = [
  PART_TWO_CODES.lightsOut,
  PART_TWO_CODES.unlikelyInjuries,
  PART_TWO_CODES.personalEntanglement,
]

/** Lugares Restringido. */
export const RESTRICTED: string[] = [
  CODES.staffAccessHallway,
  CODES.securityOffice,
  CODES.guardRoom,
  CODES.ownersOffice,
  CODES.countingRoom,
  CODES.vaultDoor,
  CODES.relicRoom,
]

/** Equivalencias de la noche tranquila a la ajetreada en las conexiones. */
const BUSY: Record<string, string> = {
  [CODES.casinoFloor]: CODES.casinoFloorBusy,
  [CODES.highRollersTable]: CODES.highRollersTableBusy,
  [CODES.casinoLounge]: CODES.casinoLoungeBusy,
}
const busy = (id: string) => BUSY[id] ?? id

/** Grupo público (noche ajetreada), debajo del grupo restringido. */
export const BUSY_PUBLIC_LOCATIONS: LocationCard[] = PUBLIC_LOCATIONS.map((l) => ({
  ...l,
  id: busy(l.id),
  position: [l.position![0], l.position![1] + 5] as [number, number],
  connections: [
    ...l.connections.map(busy),
    ...(l.id === CODES.highRollersTable || l.id === CODES.casinoLounge
      ? [CODES.staffAccessHallway]
      : []),
  ],
  // Bar del casino (noche ajetreada): velo 4 y Victoria 1.
  ...(l.id === CODES.casinoLounge ? { shroud: 4, victory: 1 } : {}),
}))

const restricted = (
  id: string,
  name: string,
  shroud: number,
  clues: number,
  position: [number, number],
  connections: string[],
  extra: Partial<LocationCard> = {},
): LocationCard => ({
  ...place(id, name, shroud, clues, position, connections),
  unrevealedName: name,
  ...extra,
})

export const RESTRICTED_LOCATIONS: LocationCard[] = [
  restricted(CODES.relicRoom, 'Relic Room', 4, 1, [1, 0], [CODES.vaultDoor], { victory: 1 }),
  restricted(
    CODES.vaultDoor,
    'Vault Door',
    3,
    0,
    [1, 1],
    [CODES.countingRoom, CODES.ownersOffice, CODES.relicRoom],
  ),
  // El Despacho del dueño tiene velo X (la alarma más alta allí): base 0 más el modificador.
  restricted(
    CODES.ownersOffice,
    "Owner's Office",
    0,
    3,
    [0, 2],
    [CODES.countingRoom, CODES.securityOffice, CODES.vaultDoor],
    { victory: 1, enterCost: 2 },
  ),
  restricted(
    CODES.countingRoom,
    'Counting Room',
    3,
    1,
    [2, 2],
    [CODES.guardRoom, CODES.ownersOffice, CODES.vaultDoor],
  ),
  restricted(
    CODES.securityOffice,
    'Security Office',
    4,
    2,
    [0, 3],
    [CODES.ownersOffice, CODES.staffAccessHallway, CODES.guardRoom],
    { victory: 1 },
  ),
  restricted(
    CODES.guardRoom,
    'Guard Room',
    2,
    2,
    [2, 3],
    [CODES.staffAccessHallway, CODES.countingRoom, CODES.securityOffice],
  ),
  restricted(
    CODES.staffAccessHallway,
    'Staff Access Hallway',
    2,
    0,
    [1, 4],
    [CODES.securityOffice, CODES.guardRoom, CODES.highRollersTableBusy, CODES.casinoLoungeBusy],
    { enterCost: 4 },
  ),
]

/** Rutas de Errante de la noche ajetreada, en el sentido de las agujas del reloj. */
export const BUSY_PUBLIC_RING = PUBLIC_RING.map(busy)
export const RESTRICTED_RING: string[] = [
  CODES.staffAccessHallway,
  CODES.securityOffice,
  CODES.ownersOffice,
  CODES.vaultDoor,
  CODES.countingRoom,
  CODES.guardRoom,
]

// ---------------------------------------------------------------------------
// Parte II: enemigos y traiciones
// ---------------------------------------------------------------------------

/** Abarran desatado: Élite con salud por investigador. */
export const abarranUnleashed: EnemyCard = enemy({
  code: CODES.abarranUnleashed,
  name: 'Abarran Arrigorriagakoa',
  traits: ['Humanoid', 'Casino', 'Coterie', 'Elite'],
  fight: 4,
  health: 4,
  healthPerInvestigator: true,
  evade: 3,
  damage: 2,
  horror: 2,
  keywords: [],
  victory: 1,
})

const cultist = (code: string, name: string, fight: number, health: number, evade: number) =>
  enemy({
    code,
    name,
    traits: ['Humanoid', 'Casino', 'Cultist'],
    fight,
    health,
    evade,
    damage: 1,
    horror: 1,
    keywords: ['retaliate'],
  })

/** Los elegidos de la fortuna (4 cartas). */
export const fortunesChosenSet = (): EnemyCard[] => [
  ...PART_TWO_CODES.fortunesShield.map((c) => cultist(c, "Fortune's Shield", 2, 4, 3)),
  ...PART_TWO_CODES.fortunesDagger.map((c) => cultist(c, "Fortune's Dagger", 4, 3, 2)),
]

const monster = (
  code: string,
  name: string,
  stats: Pick<EnemyCard, 'fight' | 'health' | 'evade' | 'damage' | 'horror' | 'keywords'> &
    Partial<Pick<EnemyCard, 'victory'>>,
  elite = false,
) =>
  enemy({
    code,
    name,
    traits: ['Monster', 'Extradimensional', ...(elite ? ['Elite'] : [])],
    ...stats,
  })

export const dimensionalShambler = monster(
  PART_TWO_CODES.dimensionalShambler,
  'Dimensional Shambler',
  { fight: 6, health: 5, evade: 2, damage: 2, horror: 2, keywords: ['hunter'], victory: 1 },
  true,
)

/** Plan al garete sin el Vagabundo dimensional (12 cartas; él se aparta). */
export const planInShamblesSet = (): (EnemyCard | TreacheryCard)[] => [
  ...PART_TWO_CODES.duplicators.map((c) =>
    monster(c, 'Dimensional Duplicator', {
      fight: 3,
      health: 3,
      evade: 3,
      damage: 1,
      horror: 1,
      keywords: ['hunter'],
    }),
  ),
  ...PART_TWO_CODES.displacers.map((c) =>
    monster(c, 'Dimensional Displacer', {
      fight: 5,
      health: 2,
      evade: 3,
      damage: 0,
      horror: 2,
      keywords: ['hunter', 'retaliate'],
    }),
  ),
  ...PART_TWO_CODES.hypnosis.map((c) => scheme(c, 'Dimensional Hypnosis', ['Terror'])),
  ...PART_TWO_CODES.grips.map((c) => scheme(c, 'Grip of the Beyond', ['Hazard'])),
  ...PART_TWO_CODES.hungers.map((c) => scheme(c, "Hunter's Hunger", ['Hazard'], true)),
]

registerPlayerCards([
  {
    code: PART_TWO_CODES.isamaraCrew,
    name: 'Isamara Ordoñez',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally', 'Casino', 'Crew'],
    unique: true,
    story: true,
    slots: ['ally'],
    health: 1,
    sanity: 3,
  },
  {
    code: CODES.cashCart,
    name: 'Cash Cart',
    type: 'asset',
    class: 'neutral',
    traits: ['Casino'],
    story: true,
    health: 3,
  },
])
