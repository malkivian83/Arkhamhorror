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
  pokerTable: '88010',
  rouletteWheel: '88011',
  baccaratTable: '88012',
  slotMachines: '88013',
  highRollersTable: '88014',
  casinoLounge: '88015',
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
