import type { EnemyCard, LocationCard } from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'

/**
 * Muerte al amanecer (escenario III). Códigos 78 + número de colección ES/EN
 * (47–82); los originales ES son 054–106 y los EN 55–107 (tabla en media.json).
 */
export const D = {
  reference: '78047',
  agendas: ['78048', '78049', '78050'],
  acts: { attack: '78051', doorman: '78052', contraptions: '78053', paging: '78054' },
  /** Vuelve a por más: reverso del acto 3, sustituye los mazos de Plan y Acto. */
  backForMore: '78054b',
  west: '78065',
  deathsHold: '78066',
  folly: '78067',
  strength: '78068',
  will: '78069',
  virgil: '78070',
  ichabod: '78071',
  aristotle: '78072',
  banquo: '78073',
  brutus: '78074',
  halsey: '78075',
  homer: '78076',
  ophelia: '78077',
  cantGetAway: '78078',
  fear: '78079',
  flesh: '78080',
  legions: '78081',
  first: '78082',
  tenuous: '78292',
} as const

export const P = {
  abandoned: '78055',
  apothecary: '78056',
  basement: '78057',
  bedroom: '78058',
  corridor: '78059',
  grandHall: '78060',
  servants: '78061',
  study: '78062',
  tub: '78063',
  lab: '78064',
} as const

export const REANIMATED = 'Re-Animated'
export const reanimated = (e: { traits?: string[] }) => !!e.traits?.includes(REANIMATED)

const place = (
  id: string,
  name: string,
  shroud: number,
  clueValue: number,
  symbol: string,
  connectsTo: string[],
  position: [number, number],
  victory = 0,
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue,
  cluesPerInvestigator: clueValue > 0,
  connections: [],
  symbol,
  connectsTo,
  unrevealed: { symbol, connectsTo: [...connectsTo] },
  position,
  ...(victory ? { victory } : {}),
})

/**
 * Símbolos de las cartas; el Sótano conecta con la Galería (cruz) como en ES: el
 * reloj de arena EN no corresponde a ningún Lugar. Disposición plana sin cruces.
 */
export const dawnLocations = (): LocationCard[] => [
  place(P.abandoned, 'Abandoned Room', 4, 1, 't', ['plus', 'hook'], [3, 2], 1),
  place(P.apothecary, 'Apothecary Room', 3, 1, 'bean', ['square', 'moon'], [0, 1]),
  place(P.basement, 'Basement', 2, 1, 'diamond', ['triangle', 'moon', 'star', 'plus'], [2, 1]),
  place(P.bedroom, 'Bedroom', 4, 2, 'moon', ['bean', 'diamond'], [1, 0], 1),
  place(P.corridor, 'Corridor', 1, 0, 'plus', ['square', 't', 'diamond'], [2, 2]),
  place(P.grandHall, 'Grand Hall', 3, 2, 'square', ['dot', 'plus', 'bean'], [1, 2], 1),
  place(P.servants, 'Servant’s Entry', 1, 1, 'dot', ['square'], [0, 2]),
  place(P.study, 'Study', 2, 2, 'star', ['diamond', 'hook'], [3, 1], 1),
  place(P.tub, 'Tub Room', 2, 1, 'hook', ['t', 'star'], [4, 1]),
  place(P.lab, 'West’s Laboratory', 4, 0, 'triangle', ['diamond'], [2, 0], 1),
]

const reanimatedEnemy = (card: Omit<EnemyCard, 'kind' | 'traits'>): EnemyCard =>
  enemy({ ...card, traits: ['Humanoid', REANIMATED, 'Elite'], encounterBack: false })

export const virgil = reanimatedEnemy({
  code: D.virgil,
  name: 'Virgil',
  fight: 1,
  health: 1,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: ['hunter'],
})
/** Virgil (No vais a ninguna parte): reverso que muestra el acto 1b. */
export const virgilBack = reanimatedEnemy({
  code: `${D.virgil}b`,
  name: 'Virgil',
  fight: 1,
  health: 0,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
})
export const ichabod = reanimatedEnemy({
  code: D.ichabod,
  name: 'Ichabod',
  fight: 3,
  health: 1,
  healthPerInvestigator: true,
  evade: 3,
  damage: 2,
  horror: 0,
  keywords: ['hunter', 'alert', 'retaliate'],
})
export const ichabodBack = reanimatedEnemy({
  code: `${D.ichabod}b`,
  name: 'Ichabod',
  fight: 3,
  health: 1,
  healthPerInvestigator: true,
  evade: 3,
  damage: 2,
  horror: 1,
  keywords: ['hunter', 'alert', 'retaliate'],
})
/** Enemigos de una cara que forman el Mazo reanimado. */
export const reanimatedDeck: EnemyCard[] = [
  reanimatedEnemy({
    code: D.aristotle,
    name: 'Aristotle',
    fight: 2,
    health: 0,
    evade: 2,
    damage: 1,
    horror: 1,
    keywords: ['hunter'],
    spawnAt: P.study,
  }),
  reanimatedEnemy({
    code: D.banquo,
    name: 'Banquo',
    fight: 2,
    health: 0,
    evade: 2,
    damage: 1,
    horror: 1,
    keywords: ['hunter', 'aloof'],
    spawnAt: P.grandHall,
  }),
  reanimatedEnemy({
    code: D.brutus,
    name: 'Brutus',
    fight: 3,
    health: 1,
    evade: 2,
    damage: 2,
    horror: 0,
    keywords: ['hunter', 'retaliate'],
    spawnAt: P.bedroom,
  }),
  reanimatedEnemy({
    code: D.halsey,
    name: 'Halsey',
    fight: 1,
    health: 1,
    evade: 3,
    damage: 0,
    horror: 2,
    keywords: ['alert'],
    spawnAt: P.basement,
  }),
  reanimatedEnemy({
    code: D.homer,
    name: 'Homer',
    fight: 2,
    health: 2,
    evade: 2,
    damage: 2,
    horror: 2,
    keywords: [],
    spawnAt: P.abandoned,
  }),
  reanimatedEnemy({
    code: D.ophelia,
    name: 'Ophelia',
    fight: 2,
    health: 1,
    evade: 2,
    damage: 0,
    horror: 2,
    keywords: ['hunter'],
    prey: { type: 'lowestRemainingSanity' },
    spawnAt: P.corridor,
  }),
]
export const firstAmongMany = enemy({
  code: D.first,
  name: 'First Among Many',
  traits: ['Monster', 'Infected', 'Elite'],
  fight: 2,
  health: 5,
  healthPerInvestigator: true,
  evade: 2,
  damage: 2,
  horror: 2,
  keywords: ['hunter', 'massive', 'retaliate'],
  victory: 2,
  encounterBack: false,
})
export const dawnTreacheries = [
  treachery({ code: D.cantGetAway, name: 'Can’t Get Away!', traits: ['Blunder'], keywords: [] }),
  treachery({ code: D.fear, name: 'Fear the Walking Dead', traits: ['Terror'], keywords: [] }),
  treachery({ code: D.flesh, name: 'Strength of Flesh', traits: ['Hex'], keywords: [] }),
  treachery({ code: D.legions, name: 'The Tomb-Legions', traits: ['Power'], keywords: ['peril'] }),
]
export const dawnDeck = () =>
  dawnTreacheries.flatMap((c) => copies(c, c.code === D.cantGetAway ? 3 : 2))
