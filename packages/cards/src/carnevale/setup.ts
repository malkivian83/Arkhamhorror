import {
  seedRng,
  shuffle,
  type ChaosToken,
  type Difficulty,
  type LocationCard,
  type Message,
  type ScenarioDefinition,
} from '@lcg/engine'
import { around } from './topology'

import { C, CARNEVALE } from './codes'
export { C, CARNEVALE } from './codes'
import { encounterDeck, cnidathqua, balefulReveler } from './data'

const NORMAL: ChaosToken[] = [
  1,
  0,
  0,
  0,
  -1,
  -1,
  -1,
  -2,
  -3,
  -4,
  -6,
  'skull',
  'skull',
  'skull',
  'cultist',
  'tablet',
  'elderThing',
  'autoFail',
  'elderSign',
]
const HARD: ChaosToken[] = [
  1,
  0,
  0,
  0,
  -1,
  -1,
  -3,
  -4,
  -5,
  -6,
  -7,
  'skull',
  'skull',
  'skull',
  'cultist',
  'tablet',
  'elderThing',
  'autoFail',
  'elderSign',
]
export const CHAOS_BAGS: Record<Difficulty, ChaosToken[]> = {
  easy: NORMAL,
  standard: NORMAL,
  hard: HARD,
  expert: HARD,
}

const location = (
  id: string,
  name: string,
  shroud: number,
  clueValue: number,
  cluesPerInvestigator = false,
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue,
  cluesPerInvestigator,
  connections: [],
})
export const LOCATIONS = [
  location(C.basilica, 'San Marco Basilica', 3, 0),
  location(C.canal, 'Canal-side', 2, 1),
  location(C.streets, 'Streets of Venice', 2, 2),
  location(C.rialto, 'Rialto Bridge', 2, 1),
  location(C.garden, 'Venetian Garden', 3, 1, true),
  location(C.sighs, 'Bridge of Sighs', 1, 2),
  location(C.square, 'Flooded Square', 4, 1, true),
  location(C.accademia, 'Accademia Bridge', 2, 1, true),
  location(C.guardian, 'The Guardian', 3, 2, true),
]
export const GONDOLA = location(C.gondola, 'Gondola', 5, 0)

/** PDF, pp. 2 y 5–7: exclusión uniforme, círculo horario y siete identidades ocultas. */
export function prepareCarnevale(seed: number, difficulty: Difficulty = 'standard') {
  const candidates = LOCATIONS.filter((l) => l.id !== C.basilica && l.id !== C.canal)
  const [removal, rng1] = shuffle(candidates, seedRng(seed))
  const removed = removal[0]!.id
  const [others, rng2] = shuffle(
    LOCATIONS.filter((l) => l.id !== C.basilica && l.id !== removed),
    rng1,
  )
  const order = [LOCATIONS[0]!, ...others].map((l) => l.id)
  const [identities] = shuffle(
    [C.lagorio, C.magro, C.neri, C.corvi, C.innocent, C.innocent, C.innocent],
    rng2,
  )
  const positions: [number, number][] = [
    [2, 0],
    [3, 1],
    [4, 2],
    [3, 3],
    [2, 4],
    [1, 3],
    [0, 2],
    [1, 1],
  ]
  const locations = [LOCATIONS[0]!, ...others].map((l, i) => ({
    ...l,
    position: positions[i]!,
    connections: [around(order, l.id)!],
  }))
  const setup: Message[] = [
    { type: 'SetScenarioMeta', key: 'carnevaleRing', value: order.join(',') },
    {
      type: 'PlaceAsset',
      code: C.abbess,
      name: 'Abbess Allegria Di Biase',
      placement: { type: 'location', location: C.basilica },
    },
    ...identities.map((code, i): Message => ({
      type: 'PlaceAsset',
      code: `${code}b`,
      name: 'Masked Carnevale-Goer',
      faceDown: true,
      placement: { type: 'location', location: order[i + 1]! },
    })),
  ]
  return { locations, setup, chaosBag: [...CHAOS_BAGS[difficulty]], removed }
}

/** Preparación compartida por el escenario registrado y sus pruebas. */
export function carnevaleSetup(options: {
  seed?: number
  difficulty?: Difficulty
}): ScenarioDefinition {
  const { locations, setup, chaosBag } = prepareCarnevale(options.seed ?? 1, options.difficulty)
  return {
    id: CARNEVALE,
    intro: [{ title: 'story.carnevale.introTitle', body: 'story.carnevale.intro' }],
    setupInstructions: { title: 'story.carnevale.setupTitle', body: 'story.carnevale.setup' },
    locations,
    setup,
    chaosBag,
    startingLocation: C.basilica,
    setAsideLocations: [GONDOLA],
    agendas: [
      { code: C.festivities, name: 'The Festivities Begin', doomThreshold: 8 },
      { code: C.eclipse, name: 'The Shadow of the Eclipse', doomThreshold: 3 },
      { code: C.chaos, name: 'Chaos at the Carnevale', doomThreshold: 3 },
    ],
    acts: [
      {
        code: C.conspiracy,
        name: 'The Carnevale Conspiracy',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: C.boats,
        name: 'Get to the Boats!',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: C.row,
        name: 'Row!',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: encounterDeck(),
    setAside: [cnidathqua, balefulReveler],
    tokenValues: {},
  }
}
