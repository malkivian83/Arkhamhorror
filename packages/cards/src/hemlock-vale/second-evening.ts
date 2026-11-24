/**
 * La fiesta del Valle de la Cicuta, Preludio: La segunda tarde (guía, pp. 43–45).
 * Preludio narrativo: se juega como una partida que solo contiene la historia, igual que La
 * primera tarde. Introducción según Simeon, baile (cada investigador elige una entrada distinta
 * del códice; en solitario, dos; no se puede elegir a un habitante tachado) y resoluciones, que
 * deciden el escenario de la Noche 2: La noche más larga u otro escenario sin tachar.
 */
import {
  activeInvestigators,
  push,
  registerPlayerCards,
  registerScenario,
  residentAvailable,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
  type ScenarioDefinition,
  type StoryEntry,
  type ValleyResident,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { hemlockValeChaosBag } from './chaos-bag'
import { SISTER } from './lost-sister'
import { VALE, valeDayLocations } from './vale-locations'
import { DAY_ONE_SCENARIOS, WELCOME_CODES } from './welcome'

export const SECOND_EVENING = 'hemlock-vale-second-evening'
export const LONGEST_NIGHT = 'hemlock-vale-longest-night'
export const PEARL_DIARY = '10715'

const AREA: Record<string, string> = {
  'hemlock-vale-written-in-rock': 'northPointMine',
  'hemlock-vale-hemlock-house': 'hemlockHarbor',
  'hemlock-vale-silent-heath': 'pearlRidge',
  'hemlock-vale-lost-sister': 'akwanShoreline',
  'hemlock-vale-thing-in-the-depths': 'eastwickBog',
}

/** Entradas del baile y el habitante de cada una (las tachadas no se pueden elegir). */
export const DANCES: { entry: string; resident?: ValleyResident }[] = [
  { entry: '1', resident: 'motherRachel' },
  { entry: '2', resident: 'leahAtwood' },
  { entry: '3', resident: 'simeonAtwood' },
  { entry: '4', resident: 'williamHemlock' },
  { entry: '5', resident: 'riverHawthorne' },
  { entry: '6', resident: 'gideonMizrah' },
  { entry: '7', resident: 'judithPark' },
  { entry: '8', resident: 'theoPeters' },
  { entry: '9' },
  { entry: 'omega' },
  { entry: 'theta' },
]

registerPlayerCards([
  {
    code: PEARL_DIARY,
    name: 'The Pearl Diary',
    story: true,
    type: 'asset',
    class: 'neutral',
    cost: 1,
    slots: ['hand'],
    traits: ['Item', 'Tome'],
    icons: { intellect: 1, agility: 1 },
  },
])

const entry = (key: string): StoryEntry => ({
  title: `story.hemlockVale.secondEvening.${key}.title`,
  body: `story.hemlockVale.secondEvening.${key}.body`,
})
const story = (key: string): Message => ({ type: 'Story', entry: entry(key) })
const meta = (state: GameState, key: string) => Number(state.scenarioMeta?.[key] ?? 0)
const setMeta = (key: string, value: number): Message => ({ type: 'SetScenarioMeta', key, value })
const specific = (key: string, data: Record<string, string | number> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})
const note = (resident: ValleyResident, n: string): Message => ({
  type: 'RecordResidentNote',
  resident,
  note: n,
})
const hasNote = (state: GameState, resident: ValleyResident, n: string) =>
  !!state.campaignLog?.valley?.residents?.[resident]?.notes?.includes(n)
const campaignNote = (state: GameState, n: string) => !!state.campaignLog?.notes?.includes(n)
const level = (state: GameState, resident: ValleyResident) =>
  state.campaignLog?.valley?.residents?.[resident]?.level ?? 0
const lead = (state: GameState): InvestigatorId => activeInvestigators(state)[0]?.id ?? ''
const available = (state: GameState, resident: ValleyResident) =>
  !state.campaignLog || residentAvailable(state.campaignLog, resident)

/** Mensajes de cada entrada del baile. */
function danceMessages(state: GameState, dance: string): Message[] {
  const pair = (resident: ValleyResident, key: string): Message[] =>
    level(state, resident) >= 3
      ? [story(`${key}Dance`), note(resident, `${resident}SharedADance`)]
      : [story(key)]
  switch (dance) {
    case '1':
      return [story('codex1'), note('motherRachel', 'motherRachelSharedHerDoubts')]
    case '2':
      return hasNote(state, 'leahAtwood', 'leahIsSearchingForSimeon')
        ? [story('codex2Searching')]
        : [story('codex2'), note('leahAtwood', 'leahAtwoodSharedADance')]
    case '3':
      return pair('simeonAtwood', 'codex3')
    case '4':
      return pair('williamHemlock', 'codex4')
    case '5':
      return pair('riverHawthorne', 'codex5')
    case '6':
      return pair('gideonMizrah', 'codex6')
    case '7':
      return pair('judithPark', 'codex7')
    case '8':
      return pair('theoPeters', 'codex8')
    case '9':
      return [story('codex9'), { type: 'EarnExperience', amount: 1 }]
    case 'omega':
      if (campaignNote(state, 'hemlockValeHelenJoinedTheSurvey'))
        return [
          story('codexOmegaJoined'),
          { type: 'RecordNote', note: 'hemlockValeHelenSharedADance' },
        ]
      if (campaignNote(state, 'hemlockValePetersFamilyReunited'))
        return [
          story('codexOmegaReunited'),
          { type: 'RecordNote', note: 'hemlockValeHelenJoinedTheSurvey' },
          ask(lead(state), 'prompt.hemlockVale.helenDeck', [
            ...activeInvestigators(state).map((i): Choice => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [{ type: 'AddStoryAsset', investigator: i.id, code: SISTER.helenPeters }],
            })),
            { label: 'choice.skip', then: [] },
          ]),
        ]
      return [story('codexOmega'), note('theoPeters', 'theoRejectedHisFamily')]
    case 'theta':
      // Cada investigador comienza el siguiente escenario con 2 recursos adicionales.
      return [story('codexTheta'), { type: 'RecordNote', note: 'hemlockValeMarquezSupplies' }]
  }
  return []
}

/** Turno de baile: cada investigador elige una entrada distinta (en solitario, dos). */
function nextDance(state: GameState, turn: number): GameState {
  const players = activeInvestigators(state)
  const solo = players.length === 1
  const total = solo ? 2 : players.length
  if (turn >= total) return push(state, ...resolution(state))
  const investigator = (solo ? players[0] : players[turn])!.id
  const options = DANCES.filter(
    (d) => !meta(state, `dance:${d.entry}`) && (!d.resident || available(state, d.resident)),
  )
  return push(
    state,
    ask(
      investigator,
      'prompt.hemlockVale.chooseDance',
      options.map((d) => ({
        label: `choice.hemlockVale.dance.${d.entry}`,
        then: [
          setMeta(`dance:${d.entry}`, 1),
          { type: 'ChooseCodexEntry', entry: `secondEvening.${d.entry}` } as Message,
          ...danceMessages(state, d.entry),
          specific('dance', { turn: turn + 1 }),
        ],
      })),
    ),
  )
}

function unexplored(state: GameState): string[] {
  const surveyed = state.campaignLog?.valley?.areasSurveyed ?? []
  return DAY_ONE_SCENARIOS.filter((id) => !surveyed.includes(AREA[id] as never))
}

/** Resoluciones 1–6: diario Perla, Bertie y escenario de la Noche 2. */
function resolution(state: GameState): Message[] {
  const diary = campaignNote(state, 'hemlockValeMadamePearlsDiaryRecovered')
  const rescued = campaignNote(state, 'hemlockValeBertieWasRescued')
  return [
    story('resolution1'),
    ...(diary
      ? [
          story('resolution2'),
          ask(lead(state), 'prompt.hemlockVale.diaryDeck', [
            ...activeInvestigators(state).map((i): Choice => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [{ type: 'AddStoryAsset', investigator: i.id, code: PEARL_DIARY }],
            })),
            { label: 'choice.skip', then: [] },
          ]),
        ]
      : []),
    story('resolution3'),
    ...(rescued
      ? [story('resolution4')]
      : [
          story('resolution5'),
          { type: 'RecordNote', note: 'hemlockValeBertieHadAnEpiphany' } as Message,
        ]),
    { type: 'AdvanceValleyTime' },
    {
      type: 'Story',
      entry: entry('resolution6'),
      choices: [
        {
          label: 'choice.hemlockVale.followMarquez',
          then: [{ type: 'ChooseValleyRoute', scenario: LONGEST_NIGHT }],
        },
        ...unexplored(state).map((scenario): Choice => ({
          label: `choice.hemlockVale.route.${scenario}`,
          then: [
            // Saltarse La noche más larga: tablilla, calavera y Primigenio permanentes.
            { type: 'AddChaosTokens', tokens: ['tablet', 'skull', 'elderThing'] },
            { type: 'ChooseValleyRoute', scenario },
          ],
        })),
      ],
    },
    { type: 'EndScenario', outcome: { type: 'resolution', resolution: 6 }, told: true },
  ]
}

/** Introducción: ¿sobrevivió Simeon? */
function introMessages(state: GameState): Message[] {
  const survived = hasNote(state, 'simeonAtwood', 'simeonSurvived')
  return [
    ...(survived
      ? [story('intro2')]
      : [
          story('intro3'),
          note('leahAtwood', 'leahIsSearchingForSimeon'),
          { type: 'CrossOutResident', resident: 'simeonAtwood' } as Message,
        ]),
    story('intro4'),
  ]
}

export function secondEvening(context: ScenarioContext): ScenarioDefinition {
  return {
    id: SECOND_EVENING,
    intro: entry('intro1'),
    locations: valeDayLocations,
    startingLocation: VALE.theCommons,
    agendas: [{ code: WELCOME_CODES.agenda, name: 'The Second Evening', doomThreshold: 99 }],
    acts: [
      {
        code: WELCOME_CODES.act,
        name: 'The Second Evening',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [],
    noEncounterDeck: true,
    chaosBag: hemlockValeChaosBag(context),
    tokenValues: {},
    setup: [specific('intro')],
  }
}

registerScenario({
  id: SECOND_EVENING,
  specific: (state, key, data) => {
    if (key === 'intro') return push(state, ...introMessages(state), specific('dance', { turn: 0 }))
    if (key === 'dance') return nextDance(state, Number(data.turn ?? 0))
    return state
  },
})
