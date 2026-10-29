import type { EncounterCard, ScenarioDefinition } from '@lcg/engine'
import { encounterDeck as spreadingCards, CODES as S } from './brethren-of-ash/spreading-flames'
import { encounterDeck as smokeCards, CODES as M } from './brethren-of-ash/smoke-and-mirrors'
import { cultistEnemies, otherEncounterCards, CODES as Q } from './brethren-of-ash/queen-of-ash'
import { ENCOUNTER_SETS } from './the-path-to-carcosa/encounter-sets'
import { DUNWICH_ENCOUNTER_SETS } from './the-dunwich-legacy/encounter-sets'
import { NIGHTGAUNTS } from './the-dunwich-legacy/altar-encounters'

export type EncounterSetVariant = 'original' | 'chapter-two'

/** Only enable a campaign after reviewing its named-card and set-aside interactions. */
export function supportsChapterTwoEncounters(campaignId: string): boolean {
  return campaignId === 'the-dunwich-legacy'
}

export function assertEncounterSetVariant(
  campaignId: string,
  variant: unknown,
): asserts variant is EncounterSetVariant | undefined {
  if (variant === undefined || variant === 'original') return
  if (variant !== 'chapter-two' || !supportsChapterTwoEncounters(campaignId))
    throw new Error('Unsupported encounter set variant')
}

const select = (cards: EncounterCard[], codes: string[]): EncounterCard[] =>
  cards.filter((card) => codes.includes(card.code))

/** Arkham Grimoire, p. 46: Core Encounter Set Substitution Table.
 * Rats use the three Bystanders (the other official choice is three Whippoorwill enemies).
 * Reuse the actual Chapter Two definitions and registered behavior, including their quantities.
 */
export const CHAPTER_TWO_SUBSTITUTIONS = [
  { original: ENCOUNTER_SETS.ancientEvils, replacement: select(spreadingCards, [S.cosmicEvils]) },
  { original: ENCOUNTER_SETS.lockedDoors, replacement: select(smokeCards, [M.arcaneLock]) },
  {
    original: ENCOUNTER_SETS.chillingCold,
    replacement: select(smokeCards, [M.downpour, M.flashFlood]),
  },
  { original: ENCOUNTER_SETS.rats, replacement: select(spreadingCards, [S.bystander]) },
  {
    original: ENCOUNTER_SETS.strikingFear,
    replacement: select(otherEncounterCards(), [Q.languor, Q.dissonance, Q.torment]),
  },
  {
    original: ENCOUNTER_SETS.darkCult,
    replacement: [
      ...select(cultistEnemies(), [Q.zealot, Q.darkMagician]),
      ...select(otherEncounterCards(), [Q.blasphemousInvocation]),
    ],
  },
  {
    original: DUNWICH_ENCOUNTER_SETS.agentsOfYog,
    replacement: select(spreadingCards, [S.unspeakableTruths, S.forbiddenSecrets]),
  },
  { original: NIGHTGAUNTS, replacement: select(smokeCards, [M.batHorror, M.aerialPursuit]) },
] as const

/** Resolve a named set reference in a scenario ability as well as during setup. */
export function encounterSetForVariant(
  original: readonly EncounterCard[],
  variant?: EncounterSetVariant,
): readonly EncounterCard[] {
  return variant === 'chapter-two'
    ? (CHAPTER_TWO_SUBSTITUTIONS.find((entry) => entry.original === original)?.replacement ??
        original)
    : original
}

function substitute(cards: EncounterCard[]): EncounterCard[] {
  let result = cards
  for (const { original, replacement } of CHAPTER_TWO_SUBSTITUTIONS) {
    const codes = new Set(original.map((card) => card.code))
    if (!result.some((card) => codes.has(card.code))) continue
    // A partial set needs an explicit scenario adaptation, never a guessed replacement.
    for (const code of codes)
      if (
        result.filter((card) => card.code === code).length !==
        original.filter((card) => card.code === code).length
      )
        throw new Error(`Incomplete encounter set: ${code}`)
    let inserted = false
    result = result.flatMap((card) => {
      if (!codes.has(card.code)) return [card]
      if (inserted) return []
      inserted = true
      return replacement.map((entry) => ({ ...entry }))
    })
  }
  return result
}

export function prepareEncounterVariant(
  scenario: ScenarioDefinition,
  campaignId: string,
  variant?: EncounterSetVariant,
): ScenarioDefinition {
  assertEncounterSetVariant(campaignId, variant)
  if (variant !== 'chapter-two') return scenario
  return {
    ...scenario,
    encounterDeck: substitute(scenario.encounterDeck),
    ...(scenario.setAside ? { setAside: substitute(scenario.setAside) } : {}),
    setup: [
      { type: 'SetScenarioMeta', key: 'chapterTwoEncounters', value: 1 },
      ...(scenario.setup ?? []),
    ],
  }
}
