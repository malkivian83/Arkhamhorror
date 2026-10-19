/**
 * La gala del ecuador del invierno (The Midwinter Gala, 2024): escenario
 * independiente con su propio conjunto de encuentros. Datos de las cartas
 * (valores de ArkhamDB y del proyecto de referencia para las caras traseras).
 * Análisis en docs-proyecto/14-la-gala.md.
 */
import {
  registerPlayerCards,
  type EnemyCard,
  type LocationCard,
  type PlayerCardDef,
  type SkillType,
  type TreacheryCard,
} from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'

export const MIDWINTER_GALA = 'the-midwinter-gala'

export const CODES = {
  scenario: '71001',
  maskedRevelers: '71002',
  unexpectedGuests: '71003',
  aKillerParty: '71004',
  meetAndGreet: '71005',
  findingTheJewel: '71006',
  lobby: '71007',
  lanternChamber: '71008',
  artGallery: '71009',
  ballroom: '71010',
  barroom: '71011',
  bedroom: '71012',
  library: '71013',
  parlor: '71014',
  rookieCop: '71020',
  confusion: '71026',
  coldStreak: '71032',
  wardOfPreservation: '71038',
  unlucky: '71044',
  bloodlessMan: '71045',
  bloodlessManUnleashed: '71045b',
  paleLantern: '71046',
  paleLanternAura: '71046b',
  enragedGug: '71047',
  moonBeast: '71048',
  savageShantak: '71049',
  viciousAmbush: '71050',
  declanPearce: '71051',
  jewelOfSarnath: '71052',
  lanternClubMember: '71053',
  bleedingWalls: '71054',
  entrap: '71055',
  inexplicableCold: '71056',
  mindExtraction: '71057',
  noxiousFumes: '71058',
  pushedIntoTheBeyond: '71059',
  secretDoor: '71060',
  terrorGate: '71061',
  violentCommands: '71062',
} as const

// ---------------------------------------------------------------------------
// Facciones
// ---------------------------------------------------------------------------

export type Faction = 'foundation' | 'miskatonic' | 'syndicate' | 'lodge' | 'kingsport'

export const FACTIONS: Faction[] = ['foundation', 'miskatonic', 'syndicate', 'lodge', 'kingsport']

export interface FactionCards {
  /** Carta de Historia: cara Aliado (código) y cara Rival (código + "b"). */
  story: string
  storyName: string
  /** Líder: Apoyo de historia (aliado) y Enemigo (rival, código + "b"). */
  leader: string
  leaderName: string
  /** Carta Rival que se baraja en el mazo de encuentros si es la facción rival. */
  rivalCard: string
  guests: [string, string, string]
  /** Clase de la facción (icono de la carta de Historia). */
  className: string
}

export const FACTION_CARDS: Record<Faction, FactionCards> = {
  foundation: {
    story: '71015',
    storyName: 'The Foundation',
    leader: '71016',
    leaderName: 'Valeriya Antonova',
    rivalCard: CODES.rookieCop,
    guests: ['71017', '71018', '71019'],
    className: 'guardian',
  },
  miskatonic: {
    story: '71021',
    storyName: 'Miskatonic University',
    leader: '71022',
    leaderName: 'Caldwell Philips',
    rivalCard: CODES.confusion,
    guests: ['71023', '71024', '71025'],
    className: 'seeker',
  },
  syndicate: {
    story: '71027',
    storyName: 'The Syndicate',
    leader: '71028',
    leaderName: 'Johnny Valone',
    rivalCard: CODES.coldStreak,
    guests: ['71029', '71030', '71031'],
    className: 'rogue',
  },
  lodge: {
    story: '71033',
    storyName: 'Silver Twilight Lodge',
    leader: '71034',
    leaderName: 'Carl Sanford',
    rivalCard: CODES.wardOfPreservation,
    guests: ['71035', '71036', '71037'],
    className: 'mystic',
  },
  kingsport: {
    story: '71039',
    storyName: 'Locals of Kingsport',
    leader: '71040',
    leaderName: 'William Bain',
    rivalCard: CODES.unlucky,
    guests: ['71041', '71042', '71043'],
    className: 'survivor',
  },
}

/** Facción de una carta (Historia, Líder o Invitado), si es de alguna. */
export function factionOf(code: string): Faction | undefined {
  const base = code.replace(/b$/, '')
  return FACTIONS.find((f) => {
    const c = FACTION_CARDS[f]
    return c.story === base || c.leader === base || c.guests.includes(base)
  })
}

// ---------------------------------------------------------------------------
// Apoyos: Líderes, Invitados, La Lámpara Mortecina y la Joya de Sarnath
// ---------------------------------------------------------------------------

type Icons = Partial<Record<SkillType, number>>

const guest = (
  code: string,
  name: string,
  traits: string[],
  health: number,
  sanity: number,
  icons: Icons,
  leader = false,
): PlayerCardDef => ({
  code,
  name,
  type: 'asset',
  class: 'neutral',
  traits: [...(leader ? ['Leader'] : ['Ally']), 'Guest', ...traits],
  health,
  sanity,
  icons,
  unique: true,
  // Los Invitados no ocupan ranura de aliado durante este escenario.
  slots: [],
  // RR "Uses": placed Guests enter play before anybody takes their control.
  ...(code === '71029' ? { uses: { count: 3, type: 'supply' } } : {}),
  ...(code === '71035' ? { uses: { count: 3, type: 'portent' } } : {}),
  ...(code === '71037' ? { uses: { count: 4, type: 'truth' } } : {}),
})

export const GUEST_DEFS: PlayerCardDef[] = [
  guest(
    '71016',
    'Valeriya Antonova',
    ['Agency'],
    2,
    3,
    { willpower: 1, intellect: 1, combat: 1 },
    true,
  ),
  guest('71017', 'Archibald Hudson', ['Agency'], 2, 2, { willpower: 2, intellect: 2 }),
  guest('71018', 'Special Agent Callahan', ['Agency'], 3, 1, { intellect: 2, combat: 2 }),
  guest('71019', 'Horacio Martinez', ['Agency'], 4, 1, { combat: 2, agility: 2 }),
  guest(
    '71022',
    'Caldwell Philips',
    ['Miskatonic'],
    2,
    3,
    { willpower: 1, intellect: 1, agility: 1 },
    true,
  ),
  guest('71023', 'Dr. Mya Badry', ['Miskatonic'], 2, 2, { intellect: 2, agility: 2 }),
  guest('71024', 'Lucas Tetlow', ['Miskatonic'], 3, 1, { intellect: 2, combat: 2 }),
  guest('71025', 'Elizabeth Conrad', ['Miskatonic'], 1, 3, { willpower: 2, agility: 2 }),
  guest(
    '71028',
    'Johnny Valone',
    ['Syndicate'],
    3,
    2,
    { intellect: 1, combat: 1, agility: 1 },
    true,
  ),
  guest('71029', 'Miranda Keeper', ['Syndicate'], 2, 2, { intellect: 2, combat: 2 }),
  guest('71030', 'Arsène Renard', ['Syndicate'], 1, 3, { intellect: 2, agility: 2 }),
  guest('71031', 'Nova Malone', ['Syndicate'], 3, 1, { willpower: 2, combat: 2 }),
  guest(
    '71034',
    'Carl Sanford',
    ['Silver Twilight'],
    3,
    3,
    { willpower: 1, intellect: 1, combat: 1 },
    true,
  ),
  guest('71035', 'Prudence Douglas', ['Sorcerer', 'Silver Twilight'], 2, 2, {
    willpower: 2,
    agility: 2,
  }),
  guest('71036', 'Sarah Van Shaw', ['Silver Twilight'], 3, 1, { combat: 2, agility: 2 }),
  guest('71037', 'Raymond Loggins', ['Sorcerer', 'Silver Twilight'], 1, 2, {
    willpower: 2,
    intellect: 2,
  }),
  guest(
    '71040',
    'William Bain',
    ['Kingsport'],
    4,
    4,
    { willpower: 1, combat: 1, agility: 1 },
    true,
  ),
  guest('71041', 'Delores Gadling', ['Kingsport'], 1, 3, { combat: 2, agility: 2 }),
  guest('71042', 'Thomas Olney', ['Wayfarer'], 3, 1, { willpower: 2, intellect: 2 }),
  guest('71043', 'Claire Wilson', ['Kingsport'], 2, 2, { willpower: 2, agility: 2 }),
]

const relic = (code: string, name: string): PlayerCardDef => ({
  code,
  name,
  type: 'asset',
  class: 'neutral',
  traits: ['Item', 'Relic'],
  unique: true,
  slots: [],
})

registerPlayerCards([
  ...GUEST_DEFS,
  relic(CODES.paleLantern, 'The Pale Lantern'),
  relic(CODES.paleLanternAura, 'The Pale Lantern'),
  relic(CODES.jewelOfSarnath, 'Jewel of Sarnath'),
])

/** Invitados de una sola cara (los que pueden quedar hechizados). */
export const isSingleSidedGuest = (code: string) =>
  GUEST_DEFS.some((g) => g.code === code && !g.traits.includes('Leader'))

export const isGuest = (code: string) => GUEST_DEFS.some((g) => g.code === code)

export const isLeader = (code: string) =>
  GUEST_DEFS.some((g) => g.code === code && g.traits.includes('Leader'))

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

export const bloodlessMan = enemy({
  code: CODES.bloodlessMan,
  name: 'The Bloodless Man',
  traits: ['Humanoid', 'Lantern Club', 'Elite'],
  fight: 4,
  health: 3,
  healthPerInvestigator: true,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: ['aloof'],
})

export const bloodlessManUnleashed = enemy({
  code: CODES.bloodlessManUnleashed,
  name: 'The Bloodless Man',
  traits: ['Monster', 'Abomination', 'Elite'],
  fight: 3,
  health: 6,
  healthPerInvestigator: true,
  evade: 3,
  damage: 2,
  horror: 1,
  keywords: ['hunter', 'massive'],
  victory: 1,
})

export const declanPearce = enemy({
  code: CODES.declanPearce,
  name: 'Declan Pearce',
  traits: ['Humanoid', 'Lantern Club', 'Elite'],
  fight: 2,
  // +2 por investigador (se ajusta al aparecer, ver gala.ts).
  health: 2,
  evade: 2,
  damage: 0,
  horror: 2,
  keywords: ['hunter'],
  victory: 0,
})

export const rookieCop = enemy({
  code: CODES.rookieCop,
  name: 'Rookie Cop',
  traits: ['Humanoid', 'Police', 'Rival'],
  fight: 2,
  health: 2,
  evade: 2,
  damage: 1,
  horror: 0,
  keywords: ['surge', 'aloof', 'hunter'],
})

/** Enemigo de un Líder rival (cara trasera de su Apoyo). No puede recibir daño. */
const rivalLeader = (code: string, name: string, fight: number, evade: number): EnemyCard =>
  enemy({
    code,
    name,
    traits: ['Humanoid', 'Leader', 'Rival', 'Elite'],
    fight,
    health: 1,
    evade,
    damage: 0,
    horror: 1,
    keywords: ['aloof', 'hunter'],
    victory: 0,
  })

export const RIVAL_LEADERS: Record<Faction, EnemyCard> = {
  foundation: rivalLeader('71016b', 'Valeriya Antonova', 2, 3),
  miskatonic: rivalLeader('71022b', 'Caldwell Philips', 2, 3),
  syndicate: rivalLeader('71028b', 'Johnny Valone', 3, 2),
  lodge: rivalLeader('71034b', 'Carl Sanford', 3, 3),
  kingsport: rivalLeader('71040b', 'William Bain', 4, 4),
}

export const enragedGug = enemy({
  code: CODES.enragedGug,
  name: 'Enraged Gug',
  traits: ['Monster', 'Dreamlands', 'Gug'],
  fight: 3,
  health: 3,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: ['alert', 'hunter'],
})

export const moonBeast = enemy({
  code: CODES.moonBeast,
  name: 'Abhorrent Moon-Beast',
  traits: ['Monster', 'Dreamlands', 'Servitor'],
  fight: 2,
  health: 3,
  evade: 4,
  damage: 1,
  horror: 1,
  keywords: ['hunter', 'retaliate'],
})

export const savageShantak = enemy({
  code: CODES.savageShantak,
  name: 'Savage Shantak',
  traits: ['Monster', 'Dreamlands', 'Shantak'],
  fight: 1,
  health: 4,
  evade: 1,
  damage: 2,
  horror: 1,
  keywords: ['hunter'],
})

export const lanternClubMember = enemy({
  code: CODES.lanternClubMember,
  name: 'Lantern Club Member',
  traits: ['Humanoid', 'Lantern Club'],
  fight: 3,
  health: 2,
  evade: 2,
  damage: 0,
  horror: 1,
  keywords: [],
})

export const MONSTERS: EnemyCard[] = [
  ...copies(enragedGug, 2),
  ...copies(moonBeast, 2),
  { ...savageShantak },
]

// ---------------------------------------------------------------------------
// Traiciones
// ---------------------------------------------------------------------------

const t = (
  code: string,
  name: string,
  traits: string[],
  keywords: TreacheryCard['keywords'] = [],
) => treachery({ code, name, traits, keywords })

export const RIVAL_TREACHERIES: Record<string, TreacheryCard> = {
  [CODES.confusion]: t(CODES.confusion, 'Confusion', ['Blunder', 'Rival'], ['surge']),
  [CODES.coldStreak]: t(CODES.coldStreak, 'Cold Streak', ['Misfortune', 'Rival'], ['surge']),
  [CODES.wardOfPreservation]: t(
    CODES.wardOfPreservation,
    'Ward of Preservation',
    ['Spell', 'Rival'],
    ['surge'],
  ),
  [CODES.unlucky]: t(CODES.unlucky, 'Unlucky', ['Misfortune', 'Rival'], ['surge']),
}

export const viciousAmbush = t(CODES.viciousAmbush, 'Vicious Ambush', ['Scheme'])

/** La Joya de Sarnath como carta del mazo de encuentros (su Revelación la pone en juego). */
export const jewelCard = t(CODES.jewelOfSarnath, 'Jewel of Sarnath', ['Item', 'Relic'])

/** Las 23 cartas del mazo de encuentros inicial. */
export const encounterDeck = (): (EnemyCard | TreacheryCard)[] => [
  ...copies(lanternClubMember, 4),
  ...copies(t(CODES.bleedingWalls, 'Bleeding Walls', ['Terror']), 2),
  ...copies(t(CODES.entrap, 'Entrap', ['Hazard']), 3),
  t(CODES.inexplicableCold, 'Inexplicable Cold', ['Hazard']),
  ...copies(t(CODES.mindExtraction, 'Mind Extraction', ['Power']), 3),
  t(CODES.noxiousFumes, 'Noxious Fumes', ['Hazard']),
  t(CODES.pushedIntoTheBeyond, 'Pushed into the Beyond', ['Hex']),
  ...copies(t(CODES.secretDoor, 'Secret Door', ['Obstacle']), 2),
  ...copies(t(CODES.terrorGate, 'Terror Gate', ['Terror']), 4),
  ...copies(t(CODES.violentCommands, 'Violent Commands', ['Terror']), 2),
]

// ---------------------------------------------------------------------------
// Localizaciones
// ---------------------------------------------------------------------------

/** Public printed catalogue, independent of the contents of any hidden zone. */
export const NAMING_CARDS = [
  ...encounterDeck(),
  ...MONSTERS,
  rookieCop,
  bloodlessMan,
  bloodlessManUnleashed,
  declanPearce,
  ...Object.values(RIVAL_LEADERS),
  ...Object.values(RIVAL_TREACHERIES),
  viciousAmbush,
  jewelCard,
]
export const NAMING_NAMES = [...new Set(NAMING_CARDS.map((c) => c.name))].sort()
export const NAMING_TRAITS = [...new Set(NAMING_CARDS.flatMap((c) => c.traits ?? []))].sort()

const GROUND_BACK = { symbol: 'moon', connectsTo: [] }
const SECOND_BACK = { symbol: 'heart', connectsTo: [] }

export const LOCATIONS = {
  lobby: {
    id: CODES.lobby,
    name: 'Lobby',
    shroud: 2,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [],
    symbol: 'diamond',
    connectsTo: ['moon', 'spade', 'triangle', 'square', 'star'],
  },
  lanternChamber: {
    id: CODES.lanternChamber,
    name: 'Lantern Chamber',
    shroud: 5,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [],
    symbol: 'star',
    connectsTo: ['diamond'],
    victory: 1,
    enterHorror: 1,
  },
  artGallery: {
    id: CODES.artGallery,
    name: 'Art Gallery',
    shroud: 3,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [],
    symbol: 'triangle',
    connectsTo: ['diamond', 'spade', 'moon', 'square'],
    unrevealed: GROUND_BACK,
  },
  ballroom: {
    id: CODES.ballroom,
    name: 'Ballroom',
    shroud: 2,
    clueValue: 1,
    cluesPerInvestigator: true,
    connections: [],
    symbol: 'square',
    connectsTo: ['diamond', 'spade', 'triangle', 'moon'],
    unrevealed: GROUND_BACK,
  },
  barroom: {
    id: CODES.barroom,
    name: 'Barroom',
    shroud: 3,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [],
    symbol: 'spade',
    connectsTo: ['diamond', 'moon', 'triangle', 'square'],
    unrevealed: GROUND_BACK,
  },
  bedroom: {
    id: CODES.bedroom,
    name: 'Bedroom',
    shroud: 3,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [],
    symbol: 't',
    connectsTo: ['circle', 'hourglass', 'heart'],
    unrevealed: SECOND_BACK,
  },
  library: {
    id: CODES.library,
    name: 'Library',
    shroud: 4,
    clueValue: 3,
    cluesPerInvestigator: true,
    connections: [],
    symbol: 'hourglass',
    connectsTo: ['circle', 't', 'heart'],
    unrevealed: SECOND_BACK,
    victory: 1,
  },
  parlor: {
    id: CODES.parlor,
    name: 'Parlor',
    shroud: 6,
    clueValue: 3,
    cluesPerInvestigator: true,
    connections: [],
    symbol: 'circle',
    connectsTo: ['t', 'hourglass', 'heart'],
    unrevealed: SECOND_BACK,
    victory: 1,
  },
} satisfies Record<string, LocationCard>

export const GROUND_FLOOR: string[] = [CODES.artGallery, CODES.ballroom, CODES.barroom]
export const SECOND_FLOOR: string[] = [CODES.bedroom, CODES.library, CODES.parlor]
export const MANOR: string[] = [CODES.lobby, CODES.lanternChamber, ...GROUND_FLOOR, ...SECOND_FLOOR]
