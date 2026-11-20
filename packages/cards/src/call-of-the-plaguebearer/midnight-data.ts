import type { EnemyCard, LocationCard } from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'
import { TOWN } from './night-data'

/**
 * La hora bruja (VIII). Códigos 78 + número de colección ES (213–249); los originales ES son
 * 268–309 y los EN 262–303. Los Lugares de doble cara usan el código para su cara de Lugar
 * (Seguro, Atado o Cráter) y `b` para la otra; los enemigos de esa otra cara se representan
 * como enemigos con el código de su imagen.
 */
export const M = {
  reference: '78213',
  agendas: ['78214', '78215', '78216'],
  acts: { death: '78217', reagent: '78218', doctor: '78219', stunt: '78220', life: '78221' },
  body: '78238',
  mind: '78239',
  soul: '78240',
  crater: '78241',
  loyalists: '78242',
  flame: '78243',
  king: '78244',
  baalshandor: '78245',
  flesh: '78246',
  fear: '78247',
  growing: '78248',
  oneOfMany: '78249',
} as const

/** Cara de enemigo de un Lugar enemigo (estadísticas; la salud es por investigador). */
export interface EnemySide {
  code: string
  name: string
  shroud: number
  clues: number
  fight: number
  health: number
  evade: number
  damage: number
  horror: number
  extraKeywords?: ('retaliate' | 'alert')[]
}
export interface TownSide {
  row: string
  normal: string
  rallied: string
  name: string
  stableShroud: number
  ralliedShroud: number
  enemy: EnemySide
}
const ENEMY: Record<string, Omit<EnemySide, 'code' | 'name'> & { name: string }> = {
  '78023': {
    name: 'Mouth of Baalshandor',
    shroud: 3,
    clues: 2,
    fight: 4,
    health: 2,
    evade: 2,
    damage: 2,
    horror: 1,
  },
  '78024': {
    name: 'Chest of Baalshandor',
    shroud: 1,
    clues: 2,
    fight: 6,
    health: 2,
    evade: 3,
    damage: 2,
    horror: 1,
  },
  '78025': {
    name: 'Claws of Baalshandor',
    shroud: 4,
    clues: 1,
    fight: 4,
    health: 1,
    evade: 2,
    damage: 2,
    horror: 2,
  },
  '78026': {
    name: 'Belly of Baalshandor',
    shroud: 2,
    clues: 3,
    fight: 2,
    health: 3,
    evade: 5,
    damage: 1,
    horror: 1,
  },
  '78027': {
    name: 'Heart of Baalshandor',
    shroud: 4,
    clues: 3,
    fight: 2,
    health: 3,
    evade: 4,
    damage: 2,
    horror: 1,
  },
  '78028': {
    name: 'Brain of Baalshandor',
    shroud: 5,
    clues: 2,
    fight: 1,
    health: 2,
    evade: 3,
    damage: 1,
    horror: 2,
  },
  '78029': {
    name: 'Arms of Baalshandor',
    shroud: 2,
    clues: 3,
    fight: 4,
    health: 3,
    evade: 4,
    damage: 2,
    horror: 1,
  },
  '78030': {
    name: 'Eye of Baalshandor',
    shroud: 4,
    clues: 2,
    fight: 3,
    health: 2,
    evade: 2,
    damage: 2,
    horror: 1,
  },
}
const STABLE_SHROUD: Record<string, [number, number]> = {
  '78023': [2, 2],
  '78024': [1, 1],
  '78025': [3, 1],
  '78026': [3, 3],
  '78027': [4, 4],
  '78028': [4, 3],
  '78029': [2, 2],
  '78030': [4, 4],
}
/** Por Lugar de Arkham (código del II): versión Normal (78222–78229) y Protegida (78230–78237). */
export const TOWN_SIDES: TownSide[] = TOWN.map((row, n) => ({
  row: row.id,
  normal: `782${22 + n}`,
  rallied: `782${30 + n}`,
  name: row.name,
  stableShroud: STABLE_SHROUD[row.id]![0],
  ralliedShroud: STABLE_SHROUD[row.id]![1],
  enemy: { code: `782${22 + n}b`, ...ENEMY[row.id]! },
}))
/** Cuerpo, Mente y Alma: el código es la cara de enemigo; `b` la cara Atado (Lugar). */
export const BAAL_SIDES: Record<
  string,
  EnemySide & { boundShroud: number; symbol: string; to: string }
> = {
  [M.body]: {
    code: M.body,
    name: 'Body of Baalshandor',
    shroud: 1,
    clues: 1,
    fight: 6,
    health: 1,
    evade: 4,
    damage: 2,
    horror: 0,
    boundShroud: 1,
    symbol: 'trefoil',
    to: 'moon',
  },
  [M.mind]: {
    code: M.mind,
    name: 'Mind of Baalshandor',
    shroud: 6,
    clues: 1,
    fight: 1,
    health: 1,
    evade: 4,
    damage: 0,
    horror: 2,
    boundShroud: 6,
    symbol: 'moon',
    to: 'star',
  },
  [M.soul]: {
    code: M.soul,
    name: 'Soul of Baalshandor',
    shroud: 3,
    clues: 1,
    fight: 3,
    health: 1,
    evade: 3,
    damage: 1,
    horror: 1,
    boundShroud: 3,
    symbol: 'star',
    to: 'trefoil',
    extraKeywords: ['retaliate', 'alert'],
  },
}
export const CRADLE: EnemySide = {
  code: `${M.crater}b`,
  name: 'Cradle of Baalshandor',
  shroud: 2,
  clues: 1,
  fight: 2,
  health: 1,
  evade: 2,
  damage: 1,
  horror: 1,
}

/** Anillo de Arkham (como en el IV/VI). */
const RING_POSITION: Record<string, [number, number]> = {
  '78028': [0, 0],
  '78030': [1, 0],
  '78025': [2, 0],
  '78023': [2, 1],
  '78024': [2, 2],
  '78029': [1, 2],
  '78026': [0, 2],
  '78027': [0, 1],
}
export function townLocation(side: TownSide, rallied: boolean): LocationCard {
  const row = TOWN.find((r) => r.id === side.row)!
  return {
    id: rallied ? side.rallied : side.normal,
    name: side.name,
    shroud: rallied ? side.ralliedShroud : side.stableShroud,
    clueValue: rallied ? 1 : 0,
    cluesPerInvestigator: rallied,
    connections: [],
    symbol: row.symbol,
    connectsTo: [...row.connects],
    unrevealed: { symbol: row.symbol, connectsTo: [...row.connects] },
    position: RING_POSITION[row.id]!,
  }
}
export const craterLocation = (position: [number, number]): LocationCard => ({
  id: M.crater,
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
export const baalLocation = (id: string, position: [number, number]): LocationCard => {
  const side = BAAL_SIDES[id]!
  return {
    id,
    name: side.name,
    shroud: side.shroud,
    clueValue: 0,
    cluesPerInvestigator: false,
    connections: [],
    symbol: side.symbol,
    connectsTo: [side.to],
    unrevealed: { symbol: side.symbol, connectsTo: [side.to] },
    position,
  }
}
export const sideEnemy = (side: EnemySide): EnemyCard =>
  enemy({
    code: side.code,
    name: side.name,
    traits: ['Miasma', 'Elite'],
    fight: side.fight,
    health: side.health,
    healthPerInvestigator: true,
    evade: side.evade,
    damage: side.damage,
    horror: side.horror,
    keywords: ['massive', ...(side.extraKeywords ?? [])],
    noOpportunityAttacks: true,
    encounterBack: false,
  })

export const baalshandor = enemy({
  code: M.baalshandor,
  name: 'Baalshandor',
  traits: ['Ancient One', 'Elite'],
  fight: 2,
  health: 3,
  healthPerInvestigator: true,
  evade: 2,
  damage: 2,
  horror: 2,
  keywords: [],
  victory: 5,
  encounterBack: false,
})
export const oneOfMany = enemy({
  code: M.oneOfMany,
  name: 'One of Many',
  traits: ['Monster', 'Servitor', 'Infected'],
  fight: 1,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: ['aloof', 'hunter'],
})
export const fleshUnbound = treachery({
  code: M.flesh,
  name: 'Flesh Unbound',
  traits: ['Power'],
  keywords: [],
})
export const fear = treachery({
  code: M.fear,
  name: 'Fear the Writhing Life',
  traits: ['Terror'],
  keywords: [],
})
export const growing = treachery({
  code: M.growing,
  name: 'Growing Destruction',
  traits: ['Power'],
  keywords: [],
})
/** Cartas que el plan 1b baraja en el mazo de encuentros. */
export const midnightLater = () => [
  ...copies(fear, 2),
  ...copies(growing, 3),
  ...copies(oneOfMany, 3),
]
