import { shuffle, type EnemyCard, type LocationCard } from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'

/**
 * Descenso al mediodía (V). Códigos 78 + número de colección ES (111–150); los originales
 * ES son 142–188 y los EN 143–182 (EN 163 Catalyst Workshop); tabla en media.json.
 */
export const V = {
  reference: '78111',
  agendas: ['78112', '78113', '78114', '78115'],
  acts: ['78116', '78117', '78118'],
  saferoom: '78119',
  delta: '78120',
  omega: '78121',
  alphaBurned: '78122',
  alphaKnowledge: '78123',
  autopsy: '78124',
  cold: '78125',
  holding: '78126',
  hall: '78127',
  serum: '78128',
  office: '78129',
  leftArtery: '78130',
  leftVentricle: '78131',
  rightArtery: '78132',
  rightVentricle: '78133',
  catalyst: '78134',
  chamber: '78135',
  exaltation: '78136',
  stabilization: '78137',
  summoning: '78138',
  robison: '78139',
  greyson: '78140',
  leftCrest: '78141',
  rightCrest: '78142',
  crispin: '78143',
  first: '78144',
  prototype: '78145',
  cover: '78146',
  caution: '78147',
  completionist: '78148',
  security: '78149',
  taphephobia: '78150',
} as const
/** Agentes de Cthugha (254–255) y Vida y muerte (286–287). */
export const S = {
  fireVampire: '78254',
  livingFlame: '78255',
  grave: '78286',
  injuries: '78287',
} as const

export const DELTA_SUBLABS = [V.autopsy, V.cold, V.holding, V.hall, V.serum] as const
export const ALPHA_SUBLABS = [V.catalyst, V.chamber, V.exaltation, V.stabilization, V.summoning]
export const OMEGA_SUBLEVELS = [V.leftArtery, V.leftVentricle, V.rightArtery, V.rightVentricle]
export const DELTA_TRAIT = new Set<string>([V.delta, ...DELTA_SUBLABS, V.office])
export const SUB_LEVEL = new Set<string>([
  ...DELTA_SUBLABS,
  V.office,
  ...OMEGA_SUBLEVELS,
  ...ALPHA_SUBLABS,
  V.robison,
])
export const MIASMA_LOCATIONS = new Set<string>([V.omega, ...OMEGA_SUBLEVELS])
export const isAlpha = (id: string) => id === V.alphaBurned || id === V.alphaKnowledge

/** «Recuerda que has…» de los Sub-laboratorios Delta. */
export const REMEMBER = {
  breakers: 'noonBreakers',
  hand: 'noonHand',
  card: 'noonCard',
  acid: 'noonAcid',
} as const
/** Lo que pide cada Sub-laboratorio para bajar a otro Subnivel, y lo que anota su última pista. */
export const DELTA_RULES: Record<string, { needs?: string; gives?: string }> = {
  [V.autopsy]: { needs: REMEMBER.breakers, gives: REMEMBER.hand },
  [V.cold]: { needs: REMEMBER.hand, gives: REMEMBER.card },
  [V.holding]: {},
  [V.hall]: { needs: REMEMBER.acid },
  [V.serum]: { needs: REMEMBER.card, gives: REMEMBER.acid },
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
  position,
  ...extra,
})
/** Sin símbolo impreso: el símbolo interno «none» evita que se acumulen conexiones antiguas. */
const subLevel = (
  id: string,
  name: string,
  shroud: number,
  clueValue: number,
  position: [number, number],
  unrevealedName: string,
): LocationCard =>
  place(id, name, shroud, clueValue, position, 'none', [], {
    unrevealed: { symbol: 'none', connectsTo: [] },
    unrevealedName,
  })

/** Figura 1: fila de 3, fila de 2 desplazada y el Despacho de West debajo. */
const DELTA_SLOTS: [number, number][] = [
  [0, 2],
  [1, 2],
  [2, 2],
  [0.5, 3],
  [1.5, 3],
]
export function noonLocations(alpha: string, seed: number) {
  const [delta, rng] = shuffle([...DELTA_SUBLABS], seed)
  const [alphaOrder] = shuffle([...ALPHA_SUBLABS], rng)
  const deltaName: Record<string, [string, number, number]> = {
    [V.autopsy]: ['Autopsy Chamber', 1, 1],
    [V.cold]: ['Cold Storage', 3, 1],
    [V.holding]: ['Holding Cell', 3, 0],
    [V.hall]: ['Main Hall', 4, 0],
    [V.serum]: ['Serum Synthesis', 4, 1],
  }
  const alphaCard: Record<string, [string, number, number, string, string[]]> = {
    [V.catalyst]: ['Catalyst Workshop', 2, 0, 'trefoil', ['crescent', 'heart', 'slashes']],
    [V.chamber]: ['Chamber of Worlds', 5, 1, 'heart', ['crescent']],
    [V.exaltation]: ['Exaltation Laboratory', 1, 1, 'slashes', ['crescent']],
    [V.stabilization]: ['Stabilization Chamber', 2, 1, 'T', ['crescent', 'spiral', 'heart']],
    [V.summoning]: ['Summoning Circle', 4, 1, 'spiral', []],
  }
  const start = [
    place(V.saferoom, 'The Saferoom', 1, 0, [3, 0], 'peanut', ['diamond', 'crescent', 'triangle']),
    place(V.delta, 'Lab Delta', 2, 2, [1, 1], 'triangle', ['crescent', 'peanut'], { victory: 1 }),
    place(V.omega, 'Lab Omega', 4, 1, [5, 1], 'diamond', ['square', 'ring', 'crescent', 'peanut'], {
      victory: 1,
    }),
    place(alpha, 'Lab Alpha', 3, 1, [3, 1], 'crescent', [
      'diamond',
      'triangle',
      'peanut',
      'star',
      'T',
      'trefoil',
    ]),
    ...delta.map((id, n) => {
      const [name, shroud, clues] = deltaName[id]!
      return subLevel(id, name, shroud, clues, DELTA_SLOTS[n]!, 'Delta Sub-Lab')
    }),
    subLevel(V.office, "West's Office", 5, 2, [1, 4], "West's Office"),
  ]
  const omega = [
    place(V.leftArtery, 'The Left Artery', 1, 1, [4.5, 2], 'ring', ['diamond', 'plus']),
    place(V.leftVentricle, 'The Left Ventricle', 3, 1, [4, 3], 'plus', ['ring']),
    place(V.rightArtery, 'The Right Artery', 2, 1, [5.5, 2], 'square', ['diamond', 'hourglass']),
    place(V.rightVentricle, 'The Right Ventricle', 3, 1, [6, 3], 'hourglass', ['square']),
  ]
  const alphaRow = [
    ...alphaOrder.map((id, n) => {
      const [name, shroud, clues, symbol, connectsTo] = alphaCard[id]!
      return place(id, name, shroud, clues, [n, 2], symbol, connectsTo, {
        unrevealed: { symbol: 'star', connectsTo: [] },
        unrevealedName: 'Alpha Sub-Lab',
      })
    }),
    place(V.robison, "Robison's Laboratory", 0, 0, [5, 2], 'star', ['T', 'trefoil']),
  ]
  return { start, omega, alphaRow }
}

/** Un Lugar está directamente debajo de otro si está en la fila siguiente y se solapan. */
export const directlyBelow = (
  above: { position?: [number, number] },
  below: { position?: [number, number] },
) =>
  !!above.position &&
  !!below.position &&
  below.position[1] === above.position[1] + 1 &&
  Math.abs(below.position[0] - above.position[0]) < 1

export const crispin = enemy({
  code: V.crispin,
  name: 'Agent Crispin',
  traits: ['Humanoid', 'Agency', 'Elite'],
  fight: 4,
  health: 3,
  healthPerInvestigator: true,
  evade: 4,
  damage: 2,
  horror: 1,
  keywords: ['alert', 'retaliate'],
  victory: 1,
  prey: { type: 'lowestSkill', skill: 'combat' },
})
export const firstAmongMany = enemy({
  code: V.first,
  name: 'First Among Many',
  traits: ['Infected', 'Monster', 'Elite'],
  fight: 5,
  health: 5,
  healthPerInvestigator: true,
  evade: 5,
  damage: 2,
  horror: 2,
  keywords: ['hunter', 'massive', 'retaliate'],
  victory: 2,
  noOpportunityAttacks: true,
})
export const prototype = enemy({
  code: V.prototype,
  name: 'Faulty Prototype',
  traits: ['Humanoid', 'Re-Animated', 'Delta'],
  fight: 1,
  health: 6,
  evade: 1,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
})
export const security = enemy({
  code: V.security,
  name: 'Tailor Security',
  traits: ['Humanoid', 'Agency'],
  fight: 3,
  health: 2,
  evade: 2,
  damage: 2,
  horror: 0,
  keywords: ['hunter'],
})
export const fireVampire = enemy({
  code: S.fireVampire,
  name: 'Fire Vampire',
  traits: ['Monster', 'Vampire'],
  fight: 3,
  health: 4,
  evade: 3,
  damage: 2,
  horror: 1,
  keywords: [],
  victory: 1,
})
export const noonTreacheries = [
  treachery({ code: V.cover, name: 'Run for Cover', traits: ['Terror'], keywords: [] }),
  treachery({
    code: V.caution,
    name: 'Strategy (Caution)',
    traits: ['Flaw', 'Tactic'],
    keywords: [],
  }),
  treachery({
    code: V.completionist,
    name: 'Strategy (Completionist)',
    traits: ['Flaw', 'Tactic'],
    keywords: [],
  }),
  treachery({ code: V.taphephobia, name: 'Taphephobia', traits: ['Terror'], keywords: [] }),
]
export const livingFlame = treachery({
  code: S.livingFlame,
  name: 'The Living Flame',
  traits: ['Power'],
  keywords: ['peril'],
})
export const lifeAndDeath = [
  treachery({
    code: S.grave,
    name: 'Call of the Grave',
    traits: ['Hex'],
    keywords: ['surge', 'peril'],
  }),
  treachery({
    code: S.injuries,
    name: 'Mounting Injuries',
    traits: ['Injury'],
    keywords: ['surge', 'peril'],
  }),
]
/** Mazo propio del V: 2 Prototipos, 3 Corre por tu vida, 2+2 Estrategias y 2 Tafefobias. */
export const noonDeck = (): (EnemyCard | ReturnType<typeof treachery>)[] => [
  ...copies(prototype, 2),
  ...noonTreacheries.flatMap((t) => copies(t, t.code === V.cover ? 3 : 2)),
]
