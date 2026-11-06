import type { EnemyCard, LocationCard } from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'
import { TOWN, townLocations } from './night-data'

/** Cantos fúnebres (IV). Códigos 78 + número de colección ES (IV 83–110, Arkham caído 259–274). */
export const K = {
  reference: '78083',
  agendas: ['78084', '78085'],
  acts: ['78086', '78087'],
  priest: '78104',
  minister: '78105',
  call: '78106',
  coral: '78107',
  march: '78108',
  prayer: '78109',
  sacrifice: '78110',
} as const

/** Orden en el sentido de las agujas del reloj (por código de lugar del II). */
export const RING = [
  '78028',
  '78030',
  '78025',
  '78023',
  '78024',
  '78029',
  '78026',
  '78027',
] as const

/** Cartas de Arkham caído que retira cada Lugar Defendido (traición y enemigo Élite). */
export const FALLEN: Record<string, { treachery: string; elite: string }> = {
  '78023': { treachery: '78259', elite: '78260' },
  '78024': { treachery: '78261', elite: '78262' },
  '78025': { treachery: '78265', elite: '78266' },
  '78026': { treachery: '78267', elite: '78268' },
  '78027': { treachery: '78269', elite: '78270' },
  '78028': { treachery: '78273', elite: '78274' },
  '78029': { treachery: '78263', elite: '78264' },
  '78030': { treachery: '78271', elite: '78272' },
}
export const E = {
  doyle: '78260',
  vicePresident: '78262',
  thing: '78264',
  couple: '78266',
  hibbs: '78268',
  ma: '78270',
  miriam: '78272',
  armitage: '78274',
} as const
export const T = {
  badNews: '78259',
  bankrupture: '78261',
  worked: '78263',
  damaged: '78265',
  boneDry: '78267',
  brokenTrust: '78269',
  whispers: '78271',
  tooMuch: '78273',
} as const

const STABLE: Record<string, { shroud: number }> = {
  '78023': { shroud: 3 },
  '78024': { shroud: 1 },
  '78025': { shroud: 3 },
  '78026': { shroud: 3 },
  '78027': { shroud: 4 },
  '78028': { shroud: 3 },
  '78029': { shroud: 2 },
  '78030': { shroud: 4 },
}
/** Disposición en anillo: el orden de las agujas del reloj sigue el borde de la cuadrícula. */
const RING_POSITION: [number, number][] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2],
  [1, 2],
  [0, 2],
  [0, 1],
]
const ringPosition = (id: string) => RING_POSITION[RING.indexOf(id as (typeof RING)[number])]!

/** Versión Segura (IV) o en Ruinas (Arkham caído, Lugar Miasma) de cada Lugar. */
export function chorusLocations(): { stable: LocationCard[]; ruins: LocationCard[] } {
  const ruins = townLocations().filter((l) => TOWN.some((r) => r.ruin === l.id))
  return {
    stable: TOWN.map((row) => ({
      id: row.stable,
      name: row.name,
      shroud: STABLE[row.id]!.shroud,
      clueValue: 2,
      cluesPerInvestigator: true,
      connections: [],
      symbol: row.symbol,
      connectsTo: [...row.connects],
      unrevealed: { symbol: row.symbol, connectsTo: [...row.connects] },
      position: ringPosition(row.id),
    })),
    ruins: ruins.map((l) => {
      const row = TOWN.find((r) => r.ruin === l.id)!
      return { ...l, position: ringPosition(row.id) }
    }),
  }
}

export const priest = enemy({
  code: K.priest,
  name: 'Priest of Plagues',
  traits: ['Monster', 'Infected', 'Elite'],
  fight: 3,
  health: 6,
  healthPerInvestigator: true,
  evade: 5,
  damage: 1,
  horror: 1,
  keywords: ['massive'],
  victory: 2,
  encounterBack: false,
})
export const minister = enemy({
  code: K.minister,
  name: 'Minister of Sickness',
  traits: ['Humanoid', 'Infected'],
  fight: 3,
  health: 1,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: [],
})
const elite = (card: Omit<EnemyCard, 'kind' | 'traits' | 'victory'>, traits = 'Humanoid') =>
  enemy({ ...card, traits: ['Elite', traits, 'Infected'], victory: 1 })
export const elites: EnemyCard[] = [
  elite({
    code: E.doyle,
    name: 'Doyle Jeffries',
    fight: 3,
    health: 4,
    evade: 3,
    damage: 1,
    horror: 1,
    keywords: ['hunter', 'alert'],
  }),
  elite({
    code: E.vicePresident,
    name: 'The Vice President',
    fight: 3,
    health: 4,
    evade: 3,
    damage: 0,
    horror: 0,
    keywords: ['hunter'],
  }),
  elite(
    {
      code: E.thing,
      name: 'The Thing in the Water',
      fight: 3,
      health: 4,
      evade: 3,
      damage: 1,
      horror: 2,
      keywords: ['massive', 'hunter'],
    },
    'Monster',
  ),
  elite({
    code: E.couple,
    name: 'The Loving Couple',
    fight: 2,
    health: 4,
    evade: 4,
    damage: 2,
    horror: 1,
    keywords: ['hunter'],
  }),
  elite({
    code: E.hibbs,
    name: 'Hibbs',
    fight: 2,
    health: 4,
    evade: 2,
    damage: 0,
    horror: 2,
    keywords: ['hunter', 'retaliate', 'alert'],
  }),
  elite({
    code: E.ma,
    name: 'Ma Matheson',
    fight: 3,
    health: 4,
    evade: 3,
    damage: 2,
    horror: 1,
    keywords: ['hunter'],
  }),
  elite({
    code: E.miriam,
    name: 'Miriam Beecher',
    fight: 4,
    health: 4,
    evade: 2,
    damage: 0,
    horror: 0,
    keywords: ['hunter'],
  }),
  elite({
    code: E.armitage,
    name: 'Henry Armitage',
    fight: 3,
    health: 4,
    evade: 2,
    damage: 1,
    horror: 1,
    keywords: ['aloof', 'hunter'],
  }),
]
export const chorusTreacheries = [
  treachery({ code: K.call, name: 'Call of Unbinding', traits: ['Hex'], keywords: [] }),
  treachery({ code: K.coral, name: 'Choral Miasma', traits: ['Miasma', 'Hex'], keywords: [] }),
  treachery({
    code: K.march,
    name: 'March of the Infected',
    traits: ['Omen', 'Hazard'],
    keywords: [],
  }),
  treachery({ code: K.prayer, name: 'Profane Prayer', traits: ['Omen'], keywords: ['peril'] }),
  treachery({
    code: K.sacrifice,
    name: 'Sacrifice of the Profane',
    traits: ['Scheme', 'Omen'],
    keywords: [],
  }),
]
export const fallenTreacheries = [
  treachery({ code: T.badNews, name: 'Bad News', traits: ['Hex'], keywords: [] }),
  treachery({ code: T.bankrupture, name: 'Bankrupture', traits: ['Hex'], keywords: [] }),
  treachery({ code: T.worked, name: 'Worked To The Bone', traits: ['Terror'], keywords: [] }),
  treachery({ code: T.damaged, name: 'Damaged Goods', traits: ['Hex', 'Blunder'], keywords: [] }),
  treachery({ code: T.boneDry, name: 'Bone Dry', traits: ['Terror'], keywords: [] }),
  treachery({ code: T.brokenTrust, name: 'Broken Trust', traits: ['Flaw'], keywords: [] }),
  treachery({ code: T.whispers, name: 'Whispers of Power', traits: ['Hex'], keywords: [] }),
  treachery({ code: T.tooMuch, name: 'You Know Too Much', traits: ['Terror'], keywords: [] }),
]
export const chorusDeck = () => chorusTreacheries.flatMap((c) => copies(c, 2))
