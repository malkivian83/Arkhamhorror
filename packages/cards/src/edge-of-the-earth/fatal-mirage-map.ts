import type { CampaignLog, LocationCard } from '@lcg/engine'

export const PRISON_OF_MEMORIES = '08556'
const DISCOVERED = 'edgeOfTheEarthDiscoveredMemories'
const BANISHED = 'edgeOfTheEarthBanishedMemories'

// The nine terminal locations are worth 2 XP on their story sides; memories are worth 1.
const storyExperience = new Map<string, number>([
  ...Array.from({ length: 9 }, (_, index): [string, number] => ['085' + (66 + index) + 'b', 2]),
  ...Array.from({ length: 9 }, (_, index): [string, number] => ['085' + (75 + index) + 'b', 1]),
])

// Printed location symbols, clue values and Mirage destinations (campaign guide, p. 25).
const places = [
  ['08556', 'Prison of Memories', 0, 'circle', ['triangle'], 1, ['08557', '08558', '08559']],
  [
    '08557',
    'Base Camp',
    4,
    'triangle',
    ['circle', 'triangle', 'trefoil', 'square', 'spade'],
    1,
    ['08562', '08561', '08564'],
  ],
  [
    '08558',
    'Deck of the Theodosia',
    1,
    'triangle',
    ['circle', 'triangle', 'hourglass', 'square', 'diamond'],
    1,
    ['08562', '08560', '08565'],
  ],
  [
    '08559',
    'University Halls',
    2,
    'triangle',
    ['circle', 'triangle', 'moon', 'trefoil', 'hourglass'],
    1,
    ['08563', '08564', '08565'],
  ],
  ['08560', 'Hedge Maze', 2, 'diamond', ['circle', 'equals'], 2, ['08572']],
  ['08561', 'Deserted Station', 3, 'spade', ['circle', 'heart'], 2, ['08567']],
  ['08562', 'Coastal Waters', 2, 'square', ['circle', 'star'], 2, ['08566', '08573']],
  ['08563', 'Elder Chamber', 1, 'moon', ['circle', 't'], 2, ['08568']],
  ['08564', 'Riverview Theatre', 1, 'trefoil', ['circle', 'squiggle'], 2, ['08571', '08570']],
  ['08565', 'Standing Stones', 2, 'hourglass', ['circle', 'droplet'], 2, ['08574', '08569']],
  ['08566', 'Airfield', 4, 'star', ['circle'], 2, ['08577']],
  ['08567', 'Alaskan Wilds', 3, 'heart', ['circle'], 2, ['08575']],
  ['08568', 'Cluttered Dormitory', 4, 't', ['circle'], 2, ['08580']],
  ['08569', "Dyer's Classroom", 5, 'droplet', ['circle'], 2, ['08579']],
  ['08570', 'Infirmary', 4, 'squiggle', ['circle'], 2, ['08576']],
  ['08571', "Dr. Kensler's Office", 3, 'squiggle', ['circle'], 2, ['08583']],
  ['08572', "Mo'ai Statues", 5, 'equals', ['circle'], 2, ['08582']],
  ['08573', 'Ottoman Front', 4, 'star', ['circle'], 2, ['08578']],
  ['08574', 'The Black Stone', 4, 'droplet', ['circle'], 2, ['08581']],
] as const

/** Applies both to places already restored during setup and to later discoveries. */
export function mirageDestinations(location: string, present: ReadonlySet<string>): string[] {
  const place = places.find(([code]) => code === location)
  return place?.[6].filter((code) => !present.has(code)) ?? []
}

export function mirageClueValue(location: string, present: ReadonlySet<string>): number {
  const destinations = mirageDestinations(location, present).length
  return destinations * (mirageClueCost(location, 1, present) ?? 0)
}

/** Places enter revealed. The caller reveals each one when it is put into play. */
export function mirageLocation(
  code: string,
  visit: 1 | 2 | 3,
  present: ReadonlySet<string>,
): LocationCard | undefined {
  const place = places.find(([id]) => id === code)
  if (!place) return undefined
  const [id, name, shroud, symbol, connectsTo, cost] = place
  return {
    id,
    name,
    shroud: id === PRISON_OF_MEMORIES ? visit : shroud,
    clueValue: cost * mirageDestinations(id, present).length,
    cluesPerInvestigator: true,
    symbol,
    connectsTo: [...connectsTo],
    connections: [],
  }
}

/** The fast ability costs clues per investigator, paid by investigators at this location. */
export function mirageClueCost(
  location: string,
  investigators: number,
  present: ReadonlySet<string>,
): number | undefined {
  const place = places.find(([code]) => code === location)
  if (place && mirageDestinations(location, present).length) return place[5] * investigators
}

/** The guide restores only locations whose reverse story has not been banished. */
export function prepareMirageMap(
  visit: 1 | 2 | 3,
  discovered: ReadonlySet<string>,
  banished: ReadonlySet<string>,
): { locations: LocationCard[]; setAsideLocations: LocationCard[] } {
  const present = new Set<string>([PRISON_OF_MEMORIES])
  if (visit > 1) {
    for (const [code] of places) {
      if (discovered.has(code) && !banished.has(code + 'b')) present.add(code)
    }
  }
  const accountedFor = new Set([
    ...present,
    ...Array.from(banished, (code) => code.replace(/b$/, '')),
  ])
  const locations: LocationCard[] = []
  const setAsideLocations: LocationCard[] = []
  for (const [code] of places) {
    const location = mirageLocation(code, visit, accountedFor)!
    if (present.has(code)) locations.push(location)
    else if (!accountedFor.has(code)) setAsideLocations.push(location)
  }
  return { locations, setAsideLocations }
}

export function readMirageMemories(log: CampaignLog) {
  const read = (key: string) => new Set((log.values[key] ?? '').split(',').filter(Boolean))
  return { discovered: read(DISCOVERED), banished: read(BANISHED) }
}

/** Guide, p. 26: record new story victories once and cross out their corresponding locations. */
export function recordMirageMemories(
  log: CampaignLog,
  locationsInPlay: readonly string[],
  victoryDisplay: readonly string[],
): { log: CampaignLog; storyXp: number } {
  const { discovered, banished } = readMirageMemories(log)
  let storyXp = 0
  for (const code of victoryDisplay) {
    const xp = storyExperience.get(code)
    if (xp === undefined || banished.has(code)) continue
    banished.add(code)
    storyXp += xp
  }
  for (const [code] of places) {
    if (banished.has(code + 'b')) discovered.delete(code)
    else if (code !== PRISON_OF_MEMORIES && locationsInPlay.includes(code)) discovered.add(code)
  }
  return {
    log: {
      ...log,
      values: {
        ...log.values,
        [DISCOVERED]: [...discovered].sort().join(','),
        [BANISHED]: [...banished].sort().join(','),
      },
    },
    storyXp,
  }
}
