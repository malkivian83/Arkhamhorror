import {
  registerPlayerCards,
  type EnemyCard,
  type GameState,
  type LocationCard,
  type LocationId,
  type PlayerCardDef,
} from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'

export const SUMMIT = '08607'
export const PEAKS_TERROR = '08608'
export const CONSTRICTING = '08609'
export const SCAVENGER = '08695'
export const GUARDIAN = '08696'

/** Mountainside locations: code, name, shroud and clues per investigator. */
export const mountainsides: [string, string, number, number][] = [
  ['08600', 'Deep Drifts', 1, 3],
  ['08601', 'White Bluff', 3, 1],
  ['08602', 'Steep Incline', 2, 2],
  ['08603', 'Narrow Ridge', 2, 2],
  ['08604', 'Rocky Ledge', 4, 1],
  ['08605', 'Snow-Covered Crag', 2, 2],
  ['08606', 'Windswept Path', 3, 0],
]

/**
 * Campaign guide, p. 28: five Mountainsides and The Summit form a diagonal from level 0
 * to level 5. Each location connects only with the locations directly below and above it.
 * The level is the first coordinate of its position.
 */
export function mountain(order: string[]): LocationCard[] {
  const names = new Map(
    mountainsides.map(([code, name, shroud, clues]) => [code, { name, shroud, clues }]),
  )
  const line = [...order, SUMMIT]
  return line.map((id, level) => {
    const card = id === SUMMIT ? { name: 'The Summit', shroud: 3, clues: 3 } : names.get(id)!
    return {
      id,
      name: card.name,
      unrevealedName: id === SUMMIT ? 'The Summit' : 'Mountainside',
      shroud: card.shroud,
      clueValue: card.clues,
      cluesPerInvestigator: true,
      victory: 1,
      position: [level, 5 - level],
      connections: [line[level - 1], line[level + 1]].filter((code): code is string => !!code),
    }
  })
}

export const levelOf = (state: GameState, location: LocationId | null | undefined): number =>
  (location ? state.locations[location]?.position?.[0] : undefined) ?? 0

/** The location directly below (or above) this one in the diagonal line. */
export function locationAtLevel(state: GameState, level: number): LocationId | undefined {
  return Object.values(state.locations).find(({ position }) => position?.[0] === level)?.id
}

const elderThing = ['Monster', 'Elder Thing']
export const terrorOfTheStars = (players: number): EnemyCard =>
  enemy({
    code: PEAKS_TERROR,
    name: 'Terror of the Stars',
    fight: 0,
    health: 3 + 3 * players,
    evade: 0,
    damage: 2,
    horror: 2,
    keywords: ['hunter', 'massive'],
    traits: ['Monster', 'Eidolon', 'Elite'],
    victory: 1,
  })
export const constricting = enemy({
  code: CONSTRICTING,
  name: 'Constricting Elder Thing',
  fight: 3,
  health: 0,
  evade: 2,
  damage: 1,
  horror: 2,
  keywords: ['hunter'],
  traits: elderThing,
})
export const scavenger = enemy({
  code: SCAVENGER,
  name: 'Elder Thing Scavenger',
  fight: 3,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
  traits: elderThing,
})
export const guardian = enemy({
  code: GUARDIAN,
  name: 'Guardian Elder Thing',
  fight: 3,
  health: 4,
  evade: 1,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
  traits: elderThing,
})
const hazard = (code: string, name: string, quantity: number) =>
  copies(treachery({ code, name, traits: ['Hazard'], keywords: [] }), quantity)

/** To the Forbidden Peaks and Elder Things encounter sets. */
export const peaksEncounters = [
  ...copies(constricting, 3),
  ...hazard('08610', 'Snowfall', 3),
  ...hazard('08611', 'Avalanche', 2),
  ...hazard('08612', 'Hanging on the Edge', 3),
  ...hazard('08613', 'Hypothermia', 3),
  ...copies(scavenger, 2),
  ...copies(guardian, 2),
  ...hazard('08697', 'Rise of the Elder Things', 2),
]

/** Expedition story assets from the "Supplies Recovered" section of the Campaign Log. */
const supply = (
  code: string,
  name: string,
  icons: NonNullable<PlayerCardDef['icons']>,
  uses?: PlayerCardDef['uses'],
  relic = false,
): PlayerCardDef => ({
  code,
  name,
  type: 'asset',
  class: 'neutral',
  story: true,
  cost: 0,
  icons,
  traits: ['Item', ...(relic ? ['Relic'] : []), 'Expedition'],
  ...(uses ? { uses } : {}),
})
export const expeditionSupplies: PlayerCardDef[] = [
  supply('08614', 'Green Soapstone', { combat: 2, wild: 1 }, { count: 4, type: 'charge' }),
  supply('08615', 'Wooden Sledge', { agility: 1, wild: 2 }),
  supply('08616', 'Dynamite', { combat: 2, wild: 1 }, { count: 2, type: 'supply' }),
  supply('08617', 'Miasmic Crystal', { willpower: 2, wild: 1 }, { count: 3, type: 'charge' }, true),
  supply(
    '08618',
    'Mineral Specimen',
    { intellect: 2, wild: 1 },
    { count: 3, type: 'charge' },
    true,
  ),
  supply('08619', 'Small Radio', { intellect: 2, wild: 1 }, { count: 3, type: 'supply' }),
  supply('08620', 'Spare Parts', { willpower: 2, wild: 1 }, { count: 3, type: 'supply' }),
]
registerPlayerCards(expeditionSupplies)
export const isExpedition = (code: string) => expeditionSupplies.some((card) => card.code === code)
