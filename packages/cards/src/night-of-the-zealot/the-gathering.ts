/** El encuentro: guía revisada ES pp. 2–3 y cartas 01104–01119. */
import {
  activeInvestigators,
  enemiesAt,
  getInvestigator,
  leadInvestigator,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerScenario,
  shuffle,
  type Difficulty,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type Message,
  type ScenarioDefinition,
  type ScenarioOutcome,
} from '@lcg/engine'
import {
  damage,
  earnExperience,
  endScenario,
  enemy,
  noteEffect,
  recordNote,
  resignAbility,
  resolution,
  storyEntries,
} from '../scenario-helpers'
// Reutilización de los conjuntos clásicos ya registrados y probados. No son variantes de Carcosa.
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { ZEALOT_CHAOS_BAGS } from './campaign'
import { LITA_CHANTLER } from './lita'
import { classicSearch } from './encounter-search'

export const THE_GATHERING = 'the-gathering'
export const CODES = {
  scenario: '01104',
  whatsGoingOn: '01105',
  riseOfTheGhouls: '01106',
  theyreGettingOut: '01107',
  trapped: '01108',
  theBarrier: '01109',
  whatHaveYouDone: '01110',
  study: '01111',
  hallway: '01112',
  attic: '01113',
  cellar: '01114',
  parlor: '01115',
  ghoulPriest: '01116',
  fleshEater: '01118',
  icyGhoul: '01119',
} as const
export const ZEALOT_NOTES = {
  houseStanding: 'zealotHouseStanding',
  houseBurned: 'zealotHouseBurned',
  priestAlive: 'zealotGhoulPriestAlive',
  litaOthers: 'zealotLitaFoundOthers',
} as const

export const ghoulPriest = enemy({
  code: CODES.ghoulPriest,
  name: 'Ghoul Priest',
  traits: ['Humanoid', 'Monster', 'Ghoul', 'Elite'],
  fight: 4,
  health: 5,
  healthPerInvestigator: true,
  evade: 4,
  damage: 2,
  horror: 2,
  keywords: ['hunter', 'retaliate'],
  prey: { type: 'highestSkill', skill: 'combat' },
  victory: 2,
})
export const fleshEater = enemy({
  code: CODES.fleshEater,
  name: 'Flesh-Eater',
  traits: ['Humanoid', 'Monster', 'Ghoul'],
  fight: 4,
  health: 4,
  evade: 1,
  damage: 1,
  horror: 2,
  keywords: [],
  victory: 1,
})
export const icyGhoul = enemy({
  code: CODES.icyGhoul,
  name: 'Icy Ghoul',
  traits: ['Humanoid', 'Monster', 'Ghoul'],
  fight: 3,
  health: 4,
  evade: 4,
  damage: 2,
  horror: 1,
  keywords: [],
  victory: 1,
})
const room = (c: LocationCard) => c
export const locationCards = {
  study: room({
    id: CODES.study,
    name: 'Study',
    shroud: 2,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [],
    position: [1, 1],
  }),
  hallway: room({
    id: CODES.hallway,
    name: 'Hallway',
    shroud: 1,
    clueValue: 0,
    cluesPerInvestigator: false,
    connections: [CODES.attic, CODES.cellar, CODES.parlor],
    position: [1, 1],
  }),
  attic: room({
    id: CODES.attic,
    name: 'Attic',
    shroud: 1,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [CODES.hallway],
    victory: 1,
    position: [1, 0],
  }),
  cellar: room({
    id: CODES.cellar,
    name: 'Cellar',
    shroud: 4,
    clueValue: 2,
    cluesPerInvestigator: true,
    connections: [CODES.hallway],
    victory: 1,
    position: [1, 2],
  }),
  parlor: room({
    id: CODES.parlor,
    name: 'Parlor',
    shroud: 2,
    clueValue: 0,
    cluesPerInvestigator: false,
    connections: [CODES.hallway],
    position: [2, 1],
  }),
}

export function theGathering(difficulty: Difficulty = 'standard'): ScenarioDefinition {
  return {
    id: THE_GATHERING,
    intro: { title: 'story.theGathering.introTitle', body: 'story.theGathering.intro' },
    setupInstructions: { title: 'story.theGathering.setupTitle', body: 'story.theGathering.setup' },
    locations: [locationCards.study],
    setAsideLocations: [
      locationCards.hallway,
      locationCards.attic,
      locationCards.cellar,
      locationCards.parlor,
    ],
    startingLocation: CODES.study,
    agendas: [
      { code: CODES.whatsGoingOn, name: "What's Going On?!", doomThreshold: 3 },
      { code: CODES.riseOfTheGhouls, name: 'Rise of the Ghouls', doomThreshold: 7 },
      { code: CODES.theyreGettingOut, name: "They're Getting Out!", doomThreshold: 10 },
    ],
    acts: [
      {
        code: CODES.trapped,
        name: 'Trapped',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      {
        code: CODES.theBarrier,
        name: 'The Barrier',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        advanceTiming: 'endOfRound',
        cluesAtLocation: CODES.hallway,
      },
      {
        code: CODES.whatHaveYouDone,
        name: 'What Have You Done?',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      fleshEater,
      icyGhoul,
      ...ENCOUNTER_SETS.rats,
      ...ENCOUNTER_SETS.ghouls,
      ...ENCOUNTER_SETS.strikingFear,
      ...ENCOUNTER_SETS.ancientEvils,
      ...ENCOUNTER_SETS.chillingCold,
    ],
    setAside: [ghoulPriest],
    chaosBag: [...ZEALOT_CHAOS_BAGS[difficulty]],
    tokenValues: {},
  }
}

const entry = storyEntries('theGathering')
const specific = (key: string, investigator?: InvestigatorId): Message => ({
  type: 'ScenarioSpecific',
  key,
  ...(investigator ? { data: { investigator } } : {}),
})
const isGhoul = (e: { traits?: string[] }) => e.traits?.includes('Ghoul') ?? false

function resolutionStory(state: GameState, outcome: ScenarioOutcome): Message[] {
  const n = outcome.type === 'resolution' ? outcome.resolution : 0
  // Conservamos al último jefe elegido aunque al resolverse ya haya dejado el escenario.
  const chief = getInvestigator(state, state.leadInvestigatorId ?? state.investigators[0]!.id)
  const notes =
    n === 1
      ? [ZEALOT_NOTES.houseBurned]
      : n === 3
        ? [ZEALOT_NOTES.litaOthers, ZEALOT_NOTES.houseStanding, ZEALOT_NOTES.priestAlive]
        : n === 0
          ? [ZEALOT_NOTES.houseStanding, ZEALOT_NOTES.priestAlive]
          : [ZEALOT_NOTES.houseStanding]
  const messages: Message[] = [
    {
      type: 'Story',
      entry: entry(n ? `resolution${n}` : 'noResolution', [
        ...notes.map(noteEffect),
        ...(n === 0 || n === 1
          ? [{ key: 'story.theGathering.litaEffect', params: { name: chief.name } }]
          : []),
        ...(n === 1
          ? [{ key: 'story.theGathering.leadMentalTrauma', params: { name: chief.name } }]
          : []),
        ...(n === 2
          ? [{ key: 'story.theGathering.leadBonusXp', params: { name: chief.name } }]
          : []),
        ...(n === 3
          ? [
              { key: 'story.theGathering.killEffect' },
              { key: 'story.theGathering.litaReassignEffect' },
            ]
          : [{ key: 'story.effect.experience', params: { bonus: 2 } }]),
      ]),
    },
    ...notes.map((key) => recordNote(key)),
  ]
  if (n === 3) {
    messages.push({ type: 'KillInvestigators', exceptResigned: true })
    if (!chief.resigned) {
      const survivors = state.investigators.filter((i) => i.resigned)
      if (survivors.length)
        messages.push({
          type: 'Story',
          entry: entry('litaBearer'),
          choices: survivors.map((i) => ({
            label: 'choice.investigator',
            params: { name: i.name },
            then: [{ type: 'AddStoryAsset', investigator: i.id, code: LITA_CHANTLER }],
          })),
        })
      // Si todos mueren, queda pendiente para elegir portador tras incorporar sustitutos.
      else messages.push(specific('litaForReplacement', chief.id))
    }
  } else {
    messages.push(earnExperience(2, true))
    if (n === 0 || n === 1)
      messages.push({ type: 'AddStoryAsset', investigator: chief.id, code: LITA_CHANTLER })
    if (n === 1) messages.push({ type: 'SufferTrauma', mental: 1, investigator: chief.id })
    if (n === 2) messages.push({ type: 'EarnExperience', amount: 1, investigator: chief.id })
  }
  return [...messages, endScenario(outcome)]
}

registerScenario({
  id: THE_GATHERING,
  resolution: resolutionStory,
  canEnter: (state, _investigator, _from, to) =>
    to !== CODES.parlor || !!state.locations[CODES.parlor]?.revealed,
  tokenEffect: (state, token, investigator) => {
    const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
    const here = getInvestigator(state, investigator).location
    const ghouls = here === null ? 0 : enemiesAt(state, here).filter(isGhoul).length
    switch (token) {
      case 'skull':
        return hard
          ? {
              modifier: -2,
              onFail: [
                {
                  type: 'ModifySkillTest',
                  after: [specific('searchGhoul', investigator)],
                },
              ],
            }
          : { modifier: -ghouls }
      case 'cultist':
        return {
          modifier: hard ? 0 : -1,
          ...(hard ? { revealAnother: true } : {}),
          onFail: [damage(investigator, 0, hard ? 2 : 1)],
        }
      case 'tablet':
        return {
          modifier: hard ? -4 : -2,
          immediate: ghouls ? [damage(investigator, 1, hard ? 1 : 0)] : [],
        }
      case 'elderThing':
        return { modifier: 0 }
    }
  },
  specific: (state, key, data) => {
    const search = classicSearch(state, key, data)
    if (search) return search
    if (key === 'litaForReplacement' && state.campaignLog)
      return {
        ...state,
        campaignLog: {
          ...state.campaignLog,
          values: {
            ...state.campaignLog.values,
            [`transfer:${LITA_CHANTLER}`]: String(data.investigator),
          },
        },
      }
    if (key === 'scatterGhouls') {
      const [deck, rng] = shuffle([...state.encounterDeck, ...state.encounterDiscard], state.rng)
      const at = deck.findIndex((c) => c.kind === 'enemy' && isGhoul(c))
      const card = at < 0 ? undefined : deck[at]
      const next = {
        ...state,
        rng,
        encounterDeck: at < 0 ? [] : deck.slice(at + 1),
        encounterDiscard: at < 0 ? deck : deck.slice(0, at),
      }
      const lead = leadInvestigator(state)
      return card && lead
        ? push(next, { type: 'ResolveEncounterCard', investigator: lead.id, card })
        : next
    }
    // Retain the legacy continuation for already saved pre-zone-search queues.
    if (key === 'drawSearchedGhoul') {
      const index = state.encounterDeck.findIndex((c) => c.code === data.code)
      const discardIndex = state.encounterDiscard.findIndex((c) => c.code === data.code)
      const card = index >= 0 ? state.encounterDeck[index] : state.encounterDiscard[discardIndex]
      if (!card) return state
      const [encounterDeck, rng] = shuffle(
        state.encounterDeck.filter((_, n) => n !== index),
        state.rng,
      )
      return push(
        {
          ...state,
          rng,
          encounterDeck,
          encounterDiscard:
            index >= 0
              ? state.encounterDiscard
              : state.encounterDiscard.filter((_, n) => n !== discardIndex),
        },
        { type: 'ResolveEncounterCard', investigator: String(data.investigator), card },
      )
    }
    return state
  },
})

registerEnemy({
  code: CODES.fleshEater,
  spawn: (state) => (state.locations[CODES.attic] ? [CODES.attic] : []),
})
registerEnemy({
  code: CODES.icyGhoul,
  spawn: (state) => (state.locations[CODES.cellar] ? [CODES.cellar] : []),
})

for (const [code, wounds, horror] of [
  [CODES.attic, 0, 1],
  [CODES.cellar, 1, 0],
] as const) {
  registerLocation({
    code,
    forced: (state, trigger) =>
      trigger.type === 'afterMove' && getInvestigator(state, trigger.investigator).location === code
        ? [damage(trigger.investigator, wounds, horror)]
        : [],
  })
}
registerLocation({
  code: CODES.parlor,
  abilities: (_state, _self, investigator) => [resignAbility(investigator, 'parlor:resign')],
})

registerAct({
  code: CODES.trapped,
  onAdvance: (state) => [
    ...[CODES.hallway, CODES.attic, CODES.cellar, CODES.parlor].map((location): Message => ({
      type: 'PutLocationIntoPlay',
      location,
    })),
    ...enemiesAt(state, CODES.study).map((e): Message => ({ type: 'DiscardEnemy', enemy: e.id })),
    // "Coloca" no es movimiento: no arrastra enemigos ni abre ventanas de movimiento.
    { type: 'PlaceAtStart', lead: CODES.hallway, others: CODES.hallway },
    { type: 'RemoveLocation', location: CODES.study },
  ],
})
registerAct({
  code: CODES.theBarrier,
  onAdvance: () => [
    { type: 'RevealLocation', location: CODES.parlor },
    {
      type: 'PlaceAsset',
      code: LITA_CHANTLER,
      name: 'Lita Chantler',
      placement: { type: 'location', location: CODES.parlor },
    },
    { type: 'SpawnSetAsideEnemy', code: CODES.ghoulPriest, location: CODES.hallway },
  ],
})
registerAct({
  code: CODES.whatHaveYouDone,
  objectiveMet: (state) => state.victoryDisplay.includes(CODES.ghoulPriest),
  onAdvance: () => [
    {
      type: 'Story',
      entry: entry('decide'),
      choices: [
        {
          label: 'story.theGathering.burn',
          then: [{ type: 'EndScenario', outcome: resolution(1) }],
        },
        {
          label: 'story.theGathering.keep',
          then: [{ type: 'EndScenario', outcome: resolution(2) }],
        },
      ],
    },
  ],
})

registerAgenda({
  code: CODES.whatsGoingOn,
  onAdvance: (state) => {
    const lead = leadInvestigator(state)
    return lead
      ? [
          {
            type: 'Ask',
            investigator: lead.id,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEffect',
              choices: [
                {
                  label: 'choice.zealot.discardRandomEach',
                  then: activeInvestigators(state).map((i): Message => ({
                    type: 'DiscardRandomFromHand',
                    investigator: i.id,
                    amount: 1,
                  })),
                },
                { label: 'choice.zealot.leadHorror', then: [damage(lead.id, 0, 2)] },
              ],
            },
          },
        ]
      : []
  },
})
registerAgenda({ code: CODES.riseOfTheGhouls, onAdvance: () => [specific('scatterGhouls')] })
registerAgenda({
  code: CODES.theyreGettingOut,
  forced: (state, trigger) => {
    if (trigger.type === 'enemyPhaseEnds')
      return Object.values(state.enemies)
        .filter((e) => isGhoul(e) && e.engagedWith === null)
        .map((e): Message => ({
          type: 'HuntOnce',
          enemy: e.id,
          toward: CODES.parlor,
          attack: false,
        }))
    if (trigger.type === 'roundEnds')
      return [
        {
          type: 'PlaceDoom',
          amount: Object.values(state.enemies).filter(
            (e) => isGhoul(e) && (e.location === CODES.hallway || e.location === CODES.parlor),
          ).length,
        },
      ]
    return []
  },
  onAdvance: (state) =>
    state.actIndex < 2
      ? [{ type: 'EndScenario', outcome: resolution(3) }]
      : [
          ...activeInvestigators(state).map((i): Message => ({
            type: 'SufferTrauma',
            physical: 1,
            investigator: i.id,
          })),
          ...activeInvestigators(state).map((i): Message => ({
            type: 'DefeatInvestigator',
            investigator: i.id,
          })),
          { type: 'EndScenario', outcome: { type: 'noResolution' } },
        ],
})
