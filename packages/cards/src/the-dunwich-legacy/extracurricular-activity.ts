import { armitageInterlude } from './house-assets'
import './jazz-mulligan'
import './professor-warren-rice'
import './alchemical-concoction'
import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerScenario,
  shuffle,
  shroudOf,
  type CampaignLog,
  type Difficulty,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type Message,
  type ScenarioDefinition,
  type ScenarioOutcome,
  type AbilityOption,
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
  treachery,
} from '../scenario-helpers'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { DUNWICH_CHAOS_BAGS } from './campaign'
import { DUNWICH_ENCOUNTER_SETS } from './encounter-sets'
import { EA, DUNWICH_NOTES as N, EXTRACURRICULAR_ACTIVITY } from './extracurricular-codes'
export { EA, DUNWICH_NOTES, EXTRACURRICULAR_ACTIVITY } from './extracurricular-codes'

export const experiment = enemy({
  code: EA.experiment,
  name: 'The Experiment',
  traits: ['Monster', 'Abomination', 'Elite'],
  fight: 4,
  health: 7,
  evade: 2,
  damage: 2,
  horror: 2,
  keywords: ['massive'],
  victory: 2,
})
const room = (
  id: string,
  name: string,
  shroud: number,
  clues: number,
  connections: string[],
  position: [number, number],
  victory?: number,
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue: clues,
  cluesPerInvestigator: id !== EA.union,
  connections,
  position,
  ...(victory ? { victory } : {}),
})
export const locationCards = {
  quad: room(
    EA.quad,
    'Miskatonic Quad',
    3,
    0,
    [EA.humanities, EA.library, EA.union, EA.science, EA.administration],
    [1, 0],
  ),
  humanities: room(EA.humanities, 'Humanities Building', 3, 2, [EA.quad, EA.library], [0, 1]),
  library: room(EA.library, 'Orne Library', 3, 1, [EA.quad, EA.humanities], [0, 0], 1),
  union: room(EA.union, 'Student Union', 1, 2, [EA.quad, EA.dormitories], [1, 1]),
  administration: room(
    EA.administration,
    'Administration Building',
    4,
    1,
    [EA.quad, EA.facultyEarly, EA.facultyLate],
    [2, 1],
  ),
  science: room(EA.science, 'Science Building', 2, 1, [EA.quad, EA.labs], [2, 0]),
  dormitories: room(EA.dormitories, 'Dormitories', 1, 3, [EA.union], [1, 2], 1),
  facultyEarly: room(EA.facultyEarly, 'Faculty Offices', 2, 2, [EA.administration], [2, 2], 1),
  facultyLate: room(EA.facultyLate, 'Faculty Offices', 2, 0, [EA.administration], [2, 2]),
  labs: room(EA.labs, 'Alchemy Labs', 5, 0, [EA.science], [3, 0]),
}
locationCards.library.investigateExtraActions = 1
const specific = (key: string, data: Record<string, string | number | boolean> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const entry = storyEntries('extracurricular')
const jazz = treachery({
  code: EA.jazz,
  name: '"Jazz" Mulligan',
  traits: ['Ally', 'Miskatonic'],
  keywords: [],
})
const late = (s: GameState) => s.scenarioMeta?.eaLate === 1
const here = (s: GameState, i: InvestigatorId) => getInvestigator(s, i).location
const faculty = (s: GameState) => (late(s) ? EA.facultyLate : EA.facultyEarly)

export function extracurricularActivity({
  difficulty = 'standard',
  log,
}: { difficulty?: Difficulty; log?: CampaignLog } = {}): ScenarioDefinition {
  const second = log?.values.openingScenario === 'the-house-always-wins'
  return {
    id: EXTRACURRICULAR_ACTIVITY,
    intro: entry('intro'),
    setupInstructions: entry('setup'),
    locations: [
      locationCards.quad,
      locationCards.humanities,
      locationCards.library,
      locationCards.union,
      locationCards.administration,
      locationCards.science,
    ],
    setAsideLocations: [
      locationCards.dormitories,
      locationCards.labs,
      second ? locationCards.facultyLate : locationCards.facultyEarly,
    ],
    startingLocation: EA.quad,
    agendas: [
      { code: EA.quietHalls, name: 'Quiet Halls', doomThreshold: 7 },
      { code: EA.deadOfNight, name: 'Dead of Night', doomThreshold: 3 },
      { code: EA.beastUnleashed, name: 'The Beast Unleashed', doomThreshold: 2 },
    ],
    acts: [
      {
        code: EA.afterHours,
        name: 'After Hours',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      {
        code: EA.ricesWhereabouts,
        name: "Rice's Whereabouts",
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: EA.campusSafety,
        name: 'Campus Safety',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...Object.values(DUNWICH_ENCOUNTER_SETS).flat(),
      ...ENCOUNTER_SETS.ancientEvils,
      ...ENCOUNTER_SETS.lockedDoors,
    ],
    setAside: [{ ...experiment }, { ...jazz }],
    chaosBag: [...DUNWICH_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [{ type: 'SetScenarioMeta', key: 'eaLate', value: second ? 1 : 0 }],
  }
}

function resolutionStory(state: GameState, outcome: ScenarioOutcome): Message[] {
  const n =
    state.scenarioMeta?.eaResolution4 === 1
      ? 4
      : outcome.type === 'resolution'
        ? outcome.resolution
        : 0
  const notes: string[] =
    n === 1
      ? [N.riceRescued, N.studentsLost]
      : n === 2
        ? [N.riceKidnapped, N.studentsRescued]
        : n === 3
          ? [N.riceKidnapped, N.experimentDefeated]
          : [N.riceKidnapped, N.studentsLost, ...(n === 4 ? [N.unconscious] : [])]
  const lost = notes.includes(N.studentsLost)
  const messages: Message[] = [
    {
      type: 'Story',
      entry: entry(n ? `resolution${n}` : 'noResolution', [
        ...notes.map(noteEffect),
        { key: 'story.effect.experience', params: { bonus: n === 0 || n === 4 ? 1 : 0 } },
        ...(lost ? [{ key: 'story.extracurricular.tabletEffect' }] : []),
      ]),
    },
    ...notes.map((note) => recordNote(note)),
    ...(lost ? [{ type: 'AddChaosTokens' as const, tokens: ['tablet' as const] }] : []),
    earnExperience(n === 0 || n === 4 ? 1 : 0, true),
  ]
  if (n === 1)
    messages.push({
      type: 'Story',
      entry: entry('riceReward'),
      choices: [
        ...state.investigators
          .filter((i) => !i.eliminated || i.resigned)
          .map((i) => ({
            label: 'choice.investigator',
            params: { name: i.name },
            then: [{ type: 'AddStoryAsset' as const, investigator: i.id, code: EA.rice }],
          })),
        { label: 'choice.skip', then: [] },
      ],
    })
  return [
    ...messages,
    ...(late(state) ? armitageInterlude(state, n === 4) : []),
    endScenario(n ? resolution(n) : outcome),
  ]
}

function payObjective(
  s: GameState,
  investigator: InvestigatorId,
  location: string,
  perPlayer: number,
  n: number,
): AbilityOption[] {
  const investigators = activeInvestigators(s).filter((i) => i.location === location)
  const amount = perPlayer * s.startingInvestigatorCount
  return investigators.reduce((total, i) => total + i.clues, 0) < amount
    ? []
    : [
        {
          key: `${location}:objective`,
          label: 'ability.dunwich.rescue',
          actions: 0,
          provokes: false,
          then: [
            { type: 'PayGroupClues', amount, from: investigators.map((i) => i.id) },
            { type: 'EndScenario', outcome: resolution(n) },
          ],
        },
      ]
}

registerScenario({
  id: EXTRACURRICULAR_ACTIVITY,
  resolution: resolutionStory,
  assetLeavesPlay: (_s, asset) =>
    asset.code === EA.jazz ? [specific('eaDiscardJazz', { asset: asset.id })] : null,
  handSizeModifier: (s) => (s.agendaIndex === 1 && s.phase === 'upkeep' ? -3 : 0),
  canEnter: (s, investigator, _from, to) =>
    ![EA.dormitories, EA.facultyEarly, EA.facultyLate, EA.labs].includes(
      to as typeof EA.dormitories,
    ) ||
    !!s.locations[to]?.revealed ||
    Object.values(s.assets).some((a) => a.owner === investigator && a.code === EA.jazz),
  tokenEffect: (s, token, investigator) => {
    const hard = s.difficulty === 'hard' || s.difficulty === 'expert'
    const i = getInvestigator(s, investigator)
    if (token === 'skull')
      return {
        modifier: hard ? -2 : -1,
        onFail: [{ type: 'MillDeck', investigator, amount: hard ? 5 : 3 }],
      }
    if (token === 'cultist') return { modifier: i.discard.length >= 10 ? (hard ? -5 : -3) : -1 }
    if (token === 'elderThing')
      return {
        modifier: -i.deck
          .slice(0, hard ? 3 : 2)
          .reduce(
            (n, c) =>
              n +
              (typeof playerCardDef(c)?.cost === 'number' ? (playerCardDef(c)!.cost as number) : 0),
            0,
          ),
        immediate: [{ type: 'MillDeck', investigator, amount: hard ? 3 : 2 }],
      }
    return { modifier: 0 }
  },
  forced: (s, trigger) => {
    if (
      trigger.type === 'encounterCardDiscarded' &&
      trigger.card.code === EA.jazz &&
      s.actIndex === 1
    )
      return [
        specific('eaJazzAppears', {
          investigator:
            trigger.investigator ??
            s.activeTurn ??
            leadInvestigator(s)?.id ??
            s.investigators[0]!.id,
        }),
      ]
    return []
  },
  specific: (s, key, data) => {
    if (key === 'eaDiscardJazz' || key === 'placedDefeated') {
      const assets = { ...s.assets }
      const placedAssets = { ...s.placedAssets }
      const card =
        key === 'eaDiscardJazz' ? assets[String(data.asset)] : placedAssets[String(data.placed)]
      if (!card) return s
      if (key === 'eaDiscardJazz') delete assets[card.id]
      else delete placedAssets[card.id]
      return {
        ...s,
        assets,
        placedAssets,
        encounterDiscard:
          card.code === EA.jazz ? [...s.encounterDiscard, { ...jazz }] : s.encounterDiscard,
      }
    }
    if (key === 'eaJazzAppears') {
      if (
        Object.values(s.assets).some((a) => a.code === EA.jazz) ||
        Object.values(s.placedAssets ?? {}).some((a) => a.code === EA.jazz)
      )
        return s
      const treacheries = { ...s.treacheries }
      if (typeof data.treachery === 'string') delete treacheries[data.treachery]
      const investigator = String(data.investigator)
      const location = here(s, investigator)
      return location
        ? push(
            {
              ...s,
              treacheries,
              encounterDiscard: s.encounterDiscard.filter((c) => c.code !== EA.jazz),
              encounterDeck: s.encounterDeck.filter((c) => c.code !== EA.jazz),
              setAside: s.setAside.filter((c) => c.code !== EA.jazz),
            },
            {
              type: 'PlaceAsset',
              code: EA.jazz,
              name: '"Jazz" Mulligan',
              placement: { type: 'location', location },
            },
          )
        : s
    }
    if (key === 'eaShuffleJazz') {
      const moving = s.setAside.filter((c) => c.code === EA.jazz)
      const [encounterDeck, rng] = shuffle(
        [...s.encounterDeck, ...s.encounterDiscard, ...moving],
        s.rng,
      )
      return {
        ...s,
        encounterDeck,
        rng,
        encounterDiscard: [],
        setAside: s.setAside.filter((c) => c.code !== EA.jazz),
      }
    }
    if (key === 'eaFacultyEnemy') {
      const choices = [...s.encounterDeck, ...s.encounterDiscard].filter(
        (c) => c.kind === 'enemy' && c.traits?.includes('Humanoid'),
      )
      if (!choices.length) {
        const [encounterDeck, rng] = shuffle(s.encounterDeck, s.rng)
        return { ...s, encounterDeck, rng }
      }
      const investigator = leadInvestigator(s)?.id ?? s.investigators[0]!.id
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEnemy',
          choices: [...new Map(choices.map((c) => [c.code, c])).values()].map((c) => ({
            label: 'choice.enemy',
            params: { enemy: c.name },
            then: [specific('eaSpawnFacultyEnemy', { code: c.code })],
          })),
        },
      })
    }
    if (key === 'eaSpawnFacultyEnemy') {
      const deck = [...s.encounterDeck],
        discard = [...s.encounterDiscard]
      const index = deck.findIndex((c) => c.code === data.code)
      const card =
        index >= 0
          ? deck.splice(index, 1)[0]
          : discard.splice(
              discard.findIndex((c) => c.code === data.code),
              1,
            )[0]
      const [encounterDeck, rng] = shuffle(deck, s.rng)
      return card?.kind === 'enemy'
        ? push(
            { ...s, encounterDeck, rng, encounterDiscard: discard },
            { type: 'SpawnEnemy', card, location: faculty(s), engageWith: null },
          )
        : s
    }
    if (key === 'eaResolution4')
      return push(
        { ...s, scenarioMeta: { ...s.scenarioMeta, eaResolution4: 1 } },
        ...activeInvestigators(s).map((i) => damage(i.id, 0, 3)),
        { type: 'EndScenario', outcome: resolution(4) },
      )
    return s
  },
})

registerEnemy({
  code: EA.experiment,
  healthModifier: (s) => 3 * s.startingInvestigatorCount,
  forced: (_s, trigger, self) =>
    trigger.type === 'enemyPhaseBegins'
      ? [{ type: 'ReadyEnemy', enemy: self.id }]
      : trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id
        ? [
            { type: 'SetAct', index: 2 },
            { type: 'AdvanceAct', paid: true },
          ]
        : [],
})
registerLocation({
  code: EA.quad,
  abilities: (_s, _self, investigator) => [resignAbility(investigator, 'quad:resign')],
})
registerLocation({
  code: EA.humanities,
  forced: (s, t) =>
    t.type === 'turnEnds' && here(s, t.investigator) === EA.humanities
      ? [
          {
            type: 'MillDeck',
            investigator: t.investigator,
            amount: getInvestigator(s, t.investigator).horror,
          },
        ]
      : [],
})
registerLocation({
  code: EA.administration,
  onReveal: (s) => [{ type: 'PutLocationIntoPlay', location: faculty(s) }],
  forced: (s, t) =>
    t.type === 'turnEnds' && here(s, t.investigator) === EA.administration
      ? [{ type: 'MillDeck', investigator: t.investigator, amount: 1 }]
      : [],
})
registerLocation({
  code: EA.union,
  onReveal: () => [{ type: 'PutLocationIntoPlay', location: EA.dormitories }],
  abilities: (s, _self, investigator) =>
    getInvestigator(s, investigator).damage || getInvestigator(s, investigator).horror
      ? [
          {
            key: 'union:heal',
            label: 'ability.dunwich.heal',
            actions: 2,
            provokes: true,
            then: [{ type: 'Heal', investigator, damage: 1, horror: 1 }],
          },
        ]
      : [],
})
registerLocation({
  code: EA.science,
  onReveal: () => [{ type: 'PutLocationIntoPlay', location: EA.labs }],
  forced: (s, t) =>
    t.type === 'afterSkillTest' &&
    !t.succeeded &&
    here(s, t.investigator) === EA.science &&
    s.skillTest?.skill === 'willpower'
      ? [damage(t.investigator, 1)]
      : [],
})
registerLocation({
  code: EA.facultyEarly,
  onReveal: () => [specific('eaFacultyEnemy')],
  abilities: (s, _self, investigator) => payObjective(s, investigator, EA.facultyEarly, 2, 1),
})
registerLocation({
  code: EA.dormitories,
  abilities: (s, _self, investigator) => payObjective(s, investigator, EA.dormitories, 3, 2),
})
registerLocation({
  code: EA.labs,
  abilities: (s, _self, investigator) => [
    {
      key: 'labs:investigate',
      label: 'ability.dunwich.findConcoction',
      actions: 1,
      provokes: true,
      actionKind: 'investigate',
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          skill: 'intellect',
          difficulty: shroudOf(s, EA.labs),
          kind: {
            type: 'investigate',
            location: EA.labs,
            replaceClue: true,
            onSuccess: Object.values(s.placedAssets ?? {})
              .filter((a) => a.code === EA.concoction)
              .map((a) => ({ type: 'TakeControlOfPlaced', placed: a.id, investigator })),
          },
        },
      ],
    },
  ],
})

registerAct({ code: EA.afterHours, onAdvance: () => [specific('eaShuffleJazz')] })
registerAct({
  code: EA.campusSafety,
  onAdvance: () => [{ type: 'EndScenario', outcome: resolution(3) }],
})
registerAct({
  code: EA.ricesWhereabouts,
  abilities: (s, _self, investigator) =>
    getInvestigator(s, investigator).clues > 0
      ? [
          {
            key: 'rice:search',
            label: 'ability.dunwich.findJazz',
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendClues', investigator, amount: 1 }],
            then: Array.from(
              { length: s.startingInvestigatorCount === 1 ? 10 : 5 },
              (): Message => ({ type: 'DiscardTopEncounter', investigator }),
            ),
          },
        ]
      : [],
  objectiveMet: (s) => Object.values(s.assets).some((a) => a.code === EA.jazz),
  onAdvance: (s) => [
    { type: 'PutLocationIntoPlay', location: EA.labs },
    ...(s.agendaIndex < 2
      ? [{ type: 'SpawnSetAsideEnemy' as const, code: EA.experiment, location: EA.labs }]
      : []),
    ...(late(s)
      ? [
          {
            type: 'PlaceAsset' as const,
            code: EA.concoction,
            name: 'Alchemical Concoction',
            placement: { type: 'location' as const, location: EA.labs },
            faceDown: true,
          },
        ]
      : []),
  ],
})
registerAgenda({
  code: EA.quietHalls,
  onAdvance: (s) =>
    activeInvestigators(s)
      .filter((i) => i.discard.length >= 5)
      .map((i) => damage(i.id, 0, i.discard.length >= 10 ? 2 : 1)),
  afterAdvance: (s) => (late(s) ? [{ type: 'AdvanceAgenda' }] : []),
})
registerAgenda({
  code: EA.deadOfNight,
  onAdvance: (s) => [
    { type: 'PutLocationIntoPlay', location: EA.dormitories },
    ...(Object.values(s.enemies).some((e) => e.code === EA.experiment)
      ? Object.values(s.enemies)
          .filter((e) => e.code === EA.experiment)
          .map((e): Message => ({
            type: 'HuntOnce',
            enemy: e.id,
            toward: EA.dormitories,
            attack: false,
          }))
      : [{ type: 'SpawnSetAsideEnemy' as const, code: EA.experiment, location: EA.science }]),
  ],
})
registerAgenda({
  code: EA.beastUnleashed,
  insteadOfAdvance: (s) => [
    { type: 'RemoveAllDoom' },
    ...Object.values(s.enemies)
      .filter((e) => e.code === EA.experiment)
      .map((e): Message => ({
        type: 'HuntOnce',
        enemy: e.id,
        toward: EA.dormitories,
        attack: false,
      })),
  ],
  forced: (s, t) =>
    t.type === 'enemyEntersLocation' &&
    t.location === EA.dormitories &&
    s.enemies[t.enemy]?.code === EA.experiment
      ? [{ type: 'AdvanceAgenda' }]
      : [],
  onAdvance: () => [specific('eaResolution4')],
})
