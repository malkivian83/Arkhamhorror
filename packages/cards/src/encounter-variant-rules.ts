import type { GameState } from '@lcg/engine'

/** Grimoire p. 46, Exceptions: adapt references without changing printed traits. */
export function isEncounterGhoul(
  state: GameState,
  card: { code: string; traits?: string[] },
): boolean {
  return (
    !!card.traits?.includes('Ghoul') ||
    (state.scenarioMeta?.chapterTwoEncounters === 1 &&
      ['12121', '12122', '12164'].includes(card.code))
  )
}

/** Specific references to False Lead, Hunting Shadow and Ancient Evils. */
export function variantEncounterCode(original: string, chapterTwo: boolean): string {
  if (!chapterTwo) return original
  return (
    ({ '01136': '12161', '01135': '12160', '01166': '12124' } as Record<string, string>)[
      original
    ] ?? original
  )
}
