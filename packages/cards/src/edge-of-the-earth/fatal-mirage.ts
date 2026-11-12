import { registerScenario, type Message, type ScenarioDefinition } from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { copies } from '../scenario-helpers'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { mirageDecks } from './fatal-mirage-decks'
import { anamnesis } from './fatal-mirage-encounters'
import { fatalMirageExploration } from './fatal-mirage-exploration'
import { prepareMirageMap, PRISON_OF_MEMORIES, readMirageMemories } from './fatal-mirage-map'
import { sledgeAbilities, supplyStep } from './forbidden-peaks-supplies'
import { evanescentMist } from './fatal-mirage-mist'
import { horrifyingShade } from './fatal-mirage-shade'
import { EOTE_FATAL_MIRAGE, encounters } from './ice-and-death-cards'
import {
  blasphemousVisions,
  glimpseTheUnspeakable,
  madnessWithin,
  miasmaticTorment,
  nebulousMiasma,
  nightmarishVapors,
  primordialEvil,
} from './mirage-shared-encounters'
import { edgeOfTheEarthStartingBag } from './opening'
import { leftBehind } from './part-two-cards'

const crashStories: Record<string, string> = {
  '08714': 'Dyer',
  '08715': 'Danforth',
  '08716': 'Ashevak',
  '08717': 'Sinha',
  '08718': 'Claypool',
  '08719': 'Cookie',
  '08720': 'Kensler',
  '08721': 'Ellsworth',
  '08722': 'Takada',
}
const story = (key: string) => ({
  title: `story.edgeOfTheEarth.${key}.title`,
  body: `story.edgeOfTheEarth.${key}.body`,
})

export function fatalMirage(context: ScenarioContext): ScenarioDefinition {
  const completed = Number(context.log.values.edgeOfTheEarthMirageVisits ?? 0)
  const visit = completed >= 2 ? 3 : completed === 1 ? 2 : 1
  const { discovered, banished } = readMirageMemories(context.log)
  const map = prepareMirageMap(visit, discovered, banished)
  const victim = crashStories[context.log.values.edgeOfTheEarthCrash ?? '']
  const doom = context.difficulty === 'expert' ? 2 : context.difficulty === 'hard' ? 1 : 0
  return {
    ...map,
    ...mirageDecks(visit),
    id: EOTE_FATAL_MIRAGE,
    intro: story(visit === 1 ? 'mirageIntro1' : 'mirageIntro2'),
    startingLocation: PRISON_OF_MEMORIES,
    chaosBag: edgeOfTheEarthStartingBag(context),
    tokenValues: {},
    encounterDeck: [
      ...[anamnesis, evanescentMist, horrifyingShade].flatMap((card) => copies(card, 3)),
      ...[
        primordialEvil,
        madnessWithin,
        blasphemousVisions,
        glimpseTheUnspeakable,
        nightmarishVapors,
        miasmaticTorment,
        nebulousMiasma,
      ].flatMap((card) => copies(card, 2)),
      ...leftBehind,
      ...encounters.filter(({ code }) => code === '08712' || code === '08713'),
      ...ENCOUNTER_SETS.chillingCold,
    ],
    setup: [
      ...(visit === 1 && victim
        ? [{ type: 'Story' as const, entry: story('mirageCrash' + victim) }]
        : []),
      ...map.locations
        .filter(({ id }) => id !== PRISON_OF_MEMORIES)
        .map(({ id }): Message => ({ type: 'RevealLocation', location: id })),
      ...(doom ? [{ type: 'PlaceDoom' as const, amount: doom }] : []),
      {
        type: 'ScenarioSpecific',
        key: 'mirageRestoreVictory',
        data: { codes: [...banished].join(',') },
      },
      { type: 'InitializeTekeliliDeck' },
      { type: 'ChooseExpeditionPartners' },
    ],
  }
}

// Expedition supplies (Wooden Sledge) may be in decks on a visit after the peaks.
registerScenario({
  ...fatalMirageExploration,
  abilities: (state, self, investigator) => [
    ...(fatalMirageExploration.abilities?.(state, self, investigator) ?? []),
    ...sledgeAbilities(state, investigator),
  ],
  specific: (state, key, data) =>
    supplyStep(state, key, data) ?? fatalMirageExploration.specific?.(state, key, data) ?? state,
})
