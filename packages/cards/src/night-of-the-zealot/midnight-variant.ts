import type { GameState, LocationCard } from '@lcg/engine'
import { LOCATIONS, CODES as M } from '../brethren-of-ash/smoke-and-mirrors'

/** Grimoire p. 46: Arkham replaces the locations from The Midnight Masks.
 * Keep the actual new cards, graph and abilities; translate old scenario references explicitly.
 */
const equivalents: Record<string, string[]> = {
  '01124': [M.merchantDistrict],
  '01125': [M.waterfrontDistrict],
  '01126': [M.uptownHospital, M.uptownShoppe],
  '01127': [M.uptownHospital, M.uptownShoppe],
  '01128': [M.southside],
  '01129': [M.universityInFlames, M.universityQuietCampus],
  '01130': [M.downtownBank, M.downtownSanatorium],
  '01131': [M.downtownBank, M.downtownSanatorium],
  '01132': [M.easttown],
  '01133': [M.frenchHill],
  '01134': [M.northside],
}

export function midnightLocation(
  state: Pick<GameState, 'scenarioMeta'> & { locations: Record<string, unknown> },
  original: string,
): string {
  if (state.scenarioMeta?.chapterTwoEncounters !== 1) return original
  return (
    equivalents[original]?.find((id) => state.locations[id]) ??
    equivalents[original]?.[0] ??
    original
  )
}

export function midnightArkham(
  south: string,
  downtown: string,
  university: string,
  burned: boolean,
): LocationCard[] {
  const selected: Record<string, string> = {
    uptown: south === '01126' ? M.uptownHospital : M.uptownShoppe,
    downtown: downtown === '01130' ? M.downtownBank : M.downtownSanatorium,
    university,
  }
  const ids = new Set([
    selected.uptown!,
    selected.downtown!,
    university,
    M.northside,
    M.easttown,
    M.waterfrontDistrict,
    M.southside,
    M.frenchHill,
    ...(!burned ? [M.merchantDistrict] : []),
  ])
  return Object.values(LOCATIONS)
    .filter((l) => ids.has(l.id))
    .map((l) => ({
      ...l,
      connections: l.connections.map((id) => selected[id] ?? id).filter((id) => ids.has(id)),
    }))
}
