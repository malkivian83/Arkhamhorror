import { enemy, copies, treachery } from '../scenario-helpers'
import type { LocationCard } from '@lcg/engine'

export const N = {
  reference: '78019',
  agendas: ['78020', '78021'],
  act: '78022',
  pustule: '78020b',
  hibbs: '78039',
  cackling: '78040',
  echoing: '78041',
  ghoul: '78042',
  hissing: '78043',
  outburst: '78044',
  contagion: '78045',
  whispering: '78046',
  victim: '78283',
} as const
/** ES collection numbers, not filenames (copies repeat their collection number). */
export const TOWN = [
  {
    id: '78023',
    ruin: '78275',
    npc: '78032',
    name: 'Arkham Advertiser',
    shroud: 2,
    symbol: 'circle',
    connects: ['square', 'triangle'],
    ruinedShroud: 3,
  },
  {
    id: '78024',
    ruin: '78276',
    npc: '78038',
    name: 'Bank of Arkham',
    shroud: 1,
    symbol: 'square',
    connects: ['circle', 'triangle', 'plus'],
    ruinedShroud: 2,
  },
  {
    id: '78025',
    ruin: '78277',
    npc: '78037',
    name: 'General Store',
    shroud: 3,
    symbol: 'triangle',
    connects: ['circle', 'square', 'diamond', 'moon'],
    ruinedShroud: 3,
  },
  {
    id: '78026',
    ruin: '78278',
    npc: '78034',
    name: 'Hibbs Roadhouse',
    shroud: 3,
    symbol: 'diamond',
    connects: ['triangle', 'plus', 'squiggle', 'heart'],
    ruinedShroud: 3,
  },
  {
    id: '78027',
    ruin: '78279',
    npc: '78035',
    name: 'Ma’s Boarding House',
    shroud: 4,
    symbol: 'heart',
    connects: ['diamond', 'squiggle'],
    ruinedShroud: 3,
  },
  {
    id: '78028',
    ruin: '78280',
    npc: '78033',
    name: 'Orne Library',
    shroud: 3,
    symbol: 'squiggle',
    connects: ['diamond', 'moon', 'heart'],
    ruinedShroud: 3,
  },
  {
    id: '78029',
    ruin: '78281',
    npc: '78031',
    name: 'River Docks',
    shroud: 2,
    symbol: 'plus',
    connects: ['square', 'diamond'],
    ruinedShroud: 3,
  },
  {
    id: '78030',
    ruin: '78282',
    npc: '78036',
    name: 'Ye Olde Magick Shoppe',
    shroud: 4,
    symbol: 'moon',
    connects: ['triangle', 'squiggle'],
    ruinedShroud: 3,
  },
] as const
export const HIBBS = '78026'
export const townLocations = (): LocationCard[] =>
  TOWN.flatMap((row, index) =>
    [false, true].map((ruin) => ({
      id: ruin ? row.ruin : row.id,
      name: row.name,
      shroud: ruin ? row.ruinedShroud : row.shroud,
      clueValue: 0,
      cluesPerInvestigator: false,
      connections: [],
      symbol: row.symbol,
      connectsTo: [
        ...row.connects,
        ...(ruin && row.id === '78024' ? ['star'] : []),
        ...(ruin && row.id === '78028' ? ['club'] : []),
      ],
      unrevealed: {
        symbol: row.symbol,
        connectsTo: [
          ...row.connects,
          ...(ruin && row.id === '78024' ? ['star'] : []),
          ...(ruin && row.id === '78028' ? ['club'] : []),
        ],
      },
      position: [index % 3, Math.floor(index / 3)] as [number, number],
    })),
  )
export const NPCS = [
  { code: '78031', name: 'Abner Weems', metric: 'skills', base: 1, per: 2 },
  { code: '78032', name: 'Doyle Jeffries', metric: 'events', base: 1, per: 2 },
  { code: '78033', name: 'Henry Armitage', metric: 'hand', base: 4, per: 2 },
  { code: '78034', name: 'Hibbs', metric: 'skill', base: 4, per: 0 },
  { code: '78035', name: 'Ma Matheson', metric: 'ally', base: 3, per: 1 },
  { code: '78036', name: 'Miriam Beecher', metric: 'nonAlly', base: 3, per: 1 },
  { code: '78037', name: 'The Loving Couple', metric: 'assets', base: 4, per: 1 },
  { code: '78038', name: 'The Vice President', metric: 'resources', base: 8, per: 2 },
] as const
export const spreadingCodes = [N.cackling, N.echoing, N.hissing, N.whispering]
export const nightTreacheries = [
  ...spreadingCodes.map((code, index) =>
    treachery({
      code,
      name: ['Cackling Miasma', 'Echoing Miasma', 'Hissing Miasma', 'Whispering Miasma'][index]!,
      traits: ['Miasma'],
      keywords: [],
    }),
  ),
  treachery({
    code: N.outburst,
    name: 'Infectious Outburst',
    traits: ['Miasma', 'Hex'],
    keywords: [],
  }),
]
export const gasGhoul = enemy({
  code: N.ghoul,
  name: 'Gaseous Ghoul',
  traits: ['Monster', 'Infected'],
  fight: 3,
  health: 2,
  evade: 1,
  damage: 1,
  horror: 1,
  keywords: ['hunter', 'retaliate'],
})
export const walkingContagion = enemy({
  code: N.contagion,
  name: 'Walking Contagion',
  traits: ['Monster', 'Infected'],
  fight: 2,
  health: 3,
  evade: 4,
  damage: 1,
  horror: 2,
  keywords: [],
})
export const grinningVictim = enemy({
  code: N.victim,
  name: 'Grinning Victim',
  traits: ['Humanoid', 'Infected'],
  fight: 3,
  health: 1,
  evade: 2,
  damage: 1,
  horror: 0,
  keywords: ['hunter'],
})
export const abhorrentPustule = enemy({
  code: N.pustule,
  name: 'Abhorrent Pustule',
  traits: ['Monster', 'Infected', 'Elite'],
  fight: 3,
  health: 4,
  healthPerInvestigator: true,
  evade: 4,
  damage: 2,
  horror: 2,
  keywords: ['hunter', 'massive'],
  victory: 2,
  encounterBack: false,
})
export const nightDeck = () => [
  ...nightTreacheries.flatMap((c) => copies(c, 2)),
  ...copies(gasGhoul, 2),
  ...copies(walkingContagion, 2),
  ...copies(grinningVictim, 3),
]
