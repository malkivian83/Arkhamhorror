import {
  activeInvestigators,
  getInvestigator,
  registerAct,
  registerAgenda,
  type GameState,
  type Message,
  type ScenarioDefinition,
} from '@lcg/engine'
import { endScenario, resolution } from '../scenario-helpers'
import { PRISON_OF_MEMORIES, recordMirageMemories } from './fatal-mirage-map'

const versions = ['I', 'II', 'III'] as const
const thresholds = [15, 13, 11] as const

export function mirageDecks(visit: 1 | 2 | 3) {
  const version = versions[visit - 1]
  return {
    agendas: [
      {
        code: String(8549 + visit).padStart(5, '0'),
        name: `Ethereal Tangle (v. ${version})`,
        doomThreshold: thresholds[visit - 1]!,
      },
    ],
    acts: [
      {
        code: String(8552 + visit).padStart(5, '0'),
        name: `Shadow of the Past (v. ${version})`,
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
  } satisfies Pick<ScenarioDefinition, 'agendas' | 'acts'>
}

export function mirageConclusion(state: GameState, success: boolean): Message[] {
  const story = success ? 'mirageResolution1' : 'mirageNoResolution'
  const memories = state.campaignLog
    ? recordMirageMemories(state.campaignLog, Object.keys(state.locations), state.victoryDisplay)
    : undefined
  const records: Message[] = memories
    ? Object.entries(memories.log.values)
        .filter(([key, value]) => state.campaignLog?.values[key] !== value)
        .map(([note, value]) => ({ type: 'RecordNote', note, value }))
    : []
  return [
    {
      type: 'Story',
      entry: {
        title: `story.edgeOfTheEarth.${story}.title`,
        body: `story.edgeOfTheEarth.${story}.body`,
      },
    },
    ...records,
    ...(state.campaignLog
      ? [
          {
            type: 'RecordNote' as const,
            note: 'edgeOfTheEarthMirageVisits',
            value: String(Number(state.campaignLog.values.edgeOfTheEarthMirageVisits ?? 0) + 1),
          },
        ]
      : []),
    { type: 'EarnExperience', amount: memories?.storyXp ?? 0, victory: true },
    endScenario(success ? resolution(1) : { type: 'noResolution' }),
  ]
}

for (const visit of [1, 2, 3] as const) {
  const { agendas, acts } = mirageDecks(visit)
  const code = agendas[0]!.code
  registerAgenda({
    code,
    abilities: (state, _agenda, investigator) => {
      const current = getInvestigator(state, investigator)
      if (
        !current.location ||
        current.location === PRISON_OF_MEMORIES ||
        !state.locations[PRISON_OF_MEMORIES]
      )
        return []
      return [
        {
          key: code + ':returnToPrison',
          label: 'ability.edgeOfTheEarth.returnToPrison',
          actions: 0,
          provokes: false,
          then: [
            { type: 'TakeDamage', investigator, damage: 0, horror: 1, direct: true, source: code },
            { type: 'MoveTo', investigator, location: PRISON_OF_MEMORIES },
          ],
        },
      ]
    },
    onAdvance: (state) =>
      activeInvestigators(state).flatMap(({ id }): Message[] => [
        visit === 3
          ? { type: 'SufferTrauma', investigator: id, mental: 1 }
          : { type: 'ShuffleTekeliliIntoDeck', investigator: id, amount: visit },
        { type: 'DefeatInvestigator', investigator: id },
      ]),
  })
  registerAct({ code: acts[0]!.code, onAdvance: (state) => mirageConclusion(state, true) })
}
