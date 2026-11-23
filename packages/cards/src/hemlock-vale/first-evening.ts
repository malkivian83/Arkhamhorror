/**
 * La fiesta del Valle de la Cicuta, Preludio: La primera tarde (guía, pp. 31–33).
 * Preludio narrativo: se juega como una partida que solo contiene la historia. Cada
 * investigador decide si termina la comida y elige dónde sentarse (una entrada del códice
 * distinta; en solitario, dos, y Π no puede ser la primera). La Resolución 1 decide el
 * escenario de la Noche 1: La hondonada retorcida u otro escenario sin tachar (con una
 * tablilla y un Primigenio más en la bolsa).
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

export const FIRST_EVENING = 'hemlock-vale-first-evening'
export const TWISTED_HOLLOW = 'hemlock-vale-twisted-hollow'
export const WORRY_ROCK = '10713'

/** Zona explorada de cada escenario de exploración. */
const AREA: Record<string, string> = {
  'hemlock-vale-written-in-rock': 'northPointMine',
  'hemlock-vale-hemlock-house': 'hemlockHarbor',
  'hemlock-vale-silent-heath': 'pearlRidge',
  'hemlock-vale-lost-sister': 'akwanShoreline',
  'hemlock-vale-thing-in-the-depths': 'eastwickBog',
}

/** Entradas del códice de la cena, en el orden de la guía. */
export const SEATS = ['theta', 'delta', 'sigma', 'omega', 'gamma', 'pi'] as const
type Seat = (typeof SEATS)[number]

registerPlayerCards([
  {
    code: WORRY_ROCK,
    name: 'Worry Rock',
    story: true,
    type: 'asset',
    class: 'neutral',
    cost: 1,
    slots: ['accessory'],
    traits: ['Item', 'Charm', 'Blessed'],
  },
])

const entry = (key: string): StoryEntry => ({
  title: `story.hemlockVale.firstEvening.${key}.title`,
  body: `story.hemlockVale.firstEvening.${key}.body`,
})
const story = (key: string, choices?: Choice[]): Message => ({
  type: 'Story',
  entry: entry(key),
  ...(choices ? { choices } : {}),
})
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
const raise = (resident: ValleyResident): Message[] => [
  { type: 'ChangeRelationship', resident },
  { type: 'EarnExperience', amount: 1 },
]
const note = (resident: ValleyResident, n: string): Message => ({
  type: 'RecordResidentNote',
  resident,
  note: n,
})
const residentNote = (state: GameState, resident: ValleyResident, n: string) =>
  !!state.campaignLog?.valley?.residents?.[resident]?.notes?.includes(n)

/** Mensajes de cada entrada del códice (con sus decisiones). */
function seatMessages(state: GameState, seat: Seat, investigator: InvestigatorId): Message[] {
  switch (seat) {
    case 'theta':
      return [
        story('theta1', [
          {
            label: 'choice.hemlockVale.whoAreTheAtwoods',
            then: [story('theta2'), ...raise('motherRachel')],
          },
          {
            label: 'choice.hemlockVale.whoAreTheChildren',
            then: [story('theta3'), ...raise('motherRachel')],
          },
          {
            label: 'choice.hemlockVale.whoAreTheHemlocks',
            then: [
              story('theta4'),
              ...raise('williamHemlock'),
              note('williamHemlock', 'williamSharedHisLegacy'),
            ],
          },
        ]),
      ]
    case 'delta':
      return [
        story('delta1', [
          {
            label: 'choice.hemlockVale.jazzIsDelightful',
            then: [
              story('delta2'),
              ...raise('riverHawthorne'),
              note('riverHawthorne', 'riverSharedHerAmbitions'),
            ],
          },
          {
            label: 'choice.hemlockVale.jazzIsHell',
            then: [story('delta3'), ...raise('judithPark')],
          },
        ]),
      ]
    case 'sigma':
      return [
        story('sigma1', [
          {
            label: 'choice.hemlockVale.askGideon',
            then: [
              story('sigma2'),
              ...raise('gideonMizrah'),
              note('gideonMizrah', 'gideonToldTheStoryOfCaptainHemlock'),
            ],
          },
          {
            label: 'choice.hemlockVale.askLeah',
            then: [
              story('sigma3'),
              ...raise('leahAtwood'),
              ...(residentNote(state, 'leahAtwood', 'leahSearchedThePearlRuins')
                ? [story('sigma4'), note('leahAtwood', 'leahSharedHerFrustrations')]
                : []),
            ],
          },
        ]),
      ]
    case 'omega':
      if (state.campaignLog?.notes?.includes('hemlockValePetersFamilyReunited'))
        return [
          story('omegaReunited'),
          ...raise('theoPeters'),
          { type: 'RecordNote', note: 'hemlockValeHelenJoinedTheSurvey' },
          ask(investigator, 'prompt.hemlockVale.helenDeck', [
            ...activeInvestigators(state).map((i): Choice => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [{ type: 'AddStoryAsset', investigator: i.id, code: SISTER.helenPeters }],
            })),
            { label: 'choice.skip', then: [] },
          ]),
        ]
      return [story('omega'), ...raise('theoPeters')]
    case 'gamma':
      if (state.campaignLog && !residentAvailable(state.campaignLog, 'simeonAtwood'))
        return [story('gammaCrossedOut'), { type: 'EarnExperience', amount: 1 }]
      return [story('gamma'), ...raise('simeonAtwood'), note('simeonAtwood', 'simeonHasAPlan')]
    case 'pi':
      return [story('pi'), { type: 'AddStoryAsset', investigator, code: WORRY_ROCK }]
  }
}

/** Turno de asiento: cada investigador elige una entrada distinta (en solitario, dos). */
function nextSeat(state: GameState, turn: number): GameState {
  const players = activeInvestigators(state)
  const solo = players.length === 1
  const total = solo ? 2 : players.length
  if (turn >= total) return push(state, ...resolution(state))
  const investigator = (solo ? players[0] : players[turn])!.id
  const free = SEATS.filter((s) => !meta(state, `seat:${s}`))
  // En solitario, Π no puede ser la primera elección.
  const options = solo && turn === 0 ? free.filter((s) => s !== 'pi') : free
  return push(
    state,
    ask(
      investigator,
      'prompt.hemlockVale.chooseSeat',
      options.map((seat) => ({
        label: `choice.hemlockVale.seat.${seat}`,
        then: [
          setMeta(`seat:${seat}`, 1),
          { type: 'ChooseCodexEntry', entry: `firstEvening.${seat}` } as Message,
          ...seatMessages(state, seat, investigator),
          specific('seat', { turn: turn + 1 }),
        ],
      })),
    ),
  )
}

/** Escenarios de exploración sin tachar (para jugar de noche). */
function unexplored(state: GameState): string[] {
  const surveyed = state.campaignLog?.valley?.areasSurveyed ?? []
  return DAY_ONE_SCENARIOS.filter((id) => !surveyed.includes(AREA[id] as never))
}

/** Resolución 1: la experiencia queda anotada y se elige el escenario de la Noche 1. */
function resolution(state: GameState): Message[] {
  return [
    { type: 'AdvanceValleyTime' },
    {
      type: 'Story',
      entry: entry('resolution1'),
      choices: [
        {
          label: 'choice.hemlockVale.searchForBertie',
          then: [{ type: 'ChooseValleyRoute', scenario: TWISTED_HOLLOW }],
        },
        ...unexplored(state).map((scenario): Choice => ({
          label: `choice.hemlockVale.route.${scenario}`,
          then: [
            // Saltarse la Hondonada añade una tablilla y un Primigenio de forma permanente.
            { type: 'AddChaosTokens', tokens: ['tablet', 'elderThing'] },
            { type: 'ChooseValleyRoute', scenario },
          ],
        })),
      ],
    },
    { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 }, told: true },
  ]
}

/** Decisión de la comida, de uno en uno. */
function mealMessages(state: GameState): Message[] {
  return activeInvestigators(state).map((i) =>
    ask(i.id, 'prompt.hemlockVale.meal', [
      {
        label: 'choice.hemlockVale.keepEating',
        then: [{ type: 'RecordNote', note: `hemlockValeFinishedTheirMeal:${i.id}` }],
      },
      { label: 'choice.hemlockVale.dontEat', then: [] },
    ]),
  )
}

export function firstEvening(context: ScenarioContext): ScenarioDefinition {
  return {
    id: FIRST_EVENING,
    intro: entry('intro'),
    locations: valeDayLocations,
    startingLocation: VALE.theCrossroads,
    agendas: [{ code: WELCOME_CODES.agenda, name: 'The First Evening', doomThreshold: 99 }],
    acts: [
      {
        code: WELCOME_CODES.act,
        name: 'The First Evening',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [],
    noEncounterDeck: true,
    chaosBag: hemlockValeChaosBag(context),
    tokenValues: {},
    setup: [specific('meal')],
  }
}

registerScenario({
  id: FIRST_EVENING,
  specific: (state, key, data) => {
    if (key === 'meal') return push(state, ...mealMessages(state), specific('seat', { turn: 0 }))
    if (key === 'seat') return nextSeat(state, Number(data.turn ?? 0))
    return state
  },
})
