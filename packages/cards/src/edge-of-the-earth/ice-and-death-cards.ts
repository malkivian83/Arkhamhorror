import { type EnemyCard, type LocationCard } from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'

export const ICE_AND_DEATH = 'ice-and-death-part-1'
export const ICE_CHECKPOINT_ONE = 'ice-and-death-checkpoint-1'
export const ICE_PART_TWO = 'ice-and-death-part-2'
export const ICE_PART_THREE = 'ice-and-death-part-3'
export const EOTE_FATAL_MIRAGE = 'edge-of-the-earth-fatal-mirage'
export const EOTE_FORBIDDEN_PEAKS = 'edge-of-the-earth-forbidden-peaks'
export const EOTE_ENDLESS_NIGHT = 'edge-of-the-earth-endless-night'
export const EOTE_CITY = 'edge-of-the-earth-city-of-the-elder-things'
export const EOTE_RESTFUL_NIGHT = 'edge-of-the-earth-restful-night'
export const ICE_CHECKPOINT_TWO = 'ice-and-death-checkpoint-2'
export const CRASH = '08502'
export const TERROR = '08522'
export const SKITTERING = '08515'

type Site = LocationCard & { shelter: number }

function site(
  number: number,
  name: string,
  shroud: number,
  clueValue: number,
  shelter: number,
  position: [number, number],
  neighbors: number[],
  enterCost = 0,
): Site {
  const code = (n: number) => `085${String(n).padStart(2, '0')}`
  return {
    id: code(number),
    name,
    shroud,
    clueValue,
    shelter,
    position,
    cluesPerInvestigator: true,
    connections: neighbors.map(code),
    enterCost,
    ...(enterCost ? { enterCostAtOrigin: true } : {}),
  }
}

export const sites = [
  site(2, 'Crash Site', 2, 0, 0, [3, 5], [3, 4, 5]),
  site(3, 'Frozen Shores', 2, 1, 2, [3, 6], [2, 4, 5, 6]),
  site(4, 'Treacherous Path', 2, 1, 1, [4, 4], [2, 3, 5, 8]),
  site(5, 'Precarious Ice Sheet', 4, 1, 2, [2, 4], [2, 3, 4, 7]),
  site(6, 'Broad Snowdrifts', 1, 2, 4, [3, 7], [3, 9, 13, 14], 1),
  site(7, 'Icy Wastes', 2, 2, 4, [1, 3], [5, 10, 12, 13], 1),
  site(8, 'Rocky Crags', 3, 2, 3, [5, 3], [4, 11, 12, 14], 1),
  site(9, 'Snow Graves', 3, 2, 5, [3, 8], [6], 2),
  site(10, 'Icebreaker Landing', 2, 2, 5, [0, 2], [7], 2),
  site(11, 'Frigid Cave', 4, 2, 6, [6, 2], [8], 2),
  site(12, 'Barrier Camp', 4, 3, 7, [3, 2], [7, 8], 4),
  site(13, "Remnants of Lake's Camp", 3, 3, 7, [1, 6], [6, 7], 4),
  site(14, 'Crystalline Cavern', 5, 3, 8, [5, 6], [6, 8], 4),
]
export const shelter = (location: string | null | undefined): number =>
  sites.find((site) => site.id === location)?.shelter ?? 0

const eidolon = ['Monster', 'Eidolon']
export const skittering = enemy({
  code: SKITTERING,
  name: 'Skittering Nonsense',
  fight: 2,
  health: 2,
  evade: 4,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
  traits: eidolon,
})
const manifestation = enemy({
  code: '08689',
  name: 'Manifestation of Madness',
  fight: 3,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
  traits: eidolon,
})
const phantasm = enemy({
  code: '08690',
  name: 'Glacial Phantasm',
  fight: 4,
  health: 4,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: [],
  traits: eidolon,
})
const terror = (players: number): EnemyCard =>
  enemy({
    code: TERROR,
    name: 'Terror of the Stars',
    fight: 4,
    health: 3 + 3 * players,
    evade: 3,
    damage: 2,
    horror: 2,
    keywords: ['hunter', 'massive'],
    traits: [...eidolon, 'Elite'],
    victory: 1,
  })
const hazard = (code: string, name: string, quantity: number, trait = 'Hazard') =>
  copies(treachery({ code, name, traits: [trait], keywords: [] }), quantity)
export const creatures = [
  ...copies(manifestation, 3),
  ...copies(phantasm, 2),
  ...hazard('08691', 'Kindred Mist', 2, 'Curse'),
]
export const setAside = (players: number) => [
  ...copies(skittering, 3),
  ...creatures,
  terror(players),
]
export const encounters = [
  ...hazard('08516', 'Apeirophobia', 2, 'Terror'),
  ...hazard('08517', 'Zero Visibility', 2),
  ...hazard('08692', 'Antarctic Wind', 2),
  ...hazard('08693', 'Whiteout', 2),
  ...hazard('08694', 'Polar Vortex', 2),
  ...hazard('08698', 'Ice Shaft', 3),
  ...hazard('08699', 'Through the Ice', 2),
  ...hazard('08712', 'Polar Mirage', 2, 'Terror'),
  ...hazard('08713', 'Dark Aurora', 3, 'Terror'),
  ...ENCOUNTER_SETS.ancientEvils,
]
