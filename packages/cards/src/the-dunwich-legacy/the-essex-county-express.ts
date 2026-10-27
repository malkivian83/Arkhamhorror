import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  push,
  recomputeConnections,
  registerAct,
  registerAgenda,
  registerLocation,
  registerScenario,
  shuffle,
  type CampaignLog,
  type Difficulty,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type Message,
  type ScenarioDefinition,
  type SkillIcon,
} from '@lcg/engine'
import {
  copies,
  damage,
  earnExperience,
  effectTest,
  endScenario,
  noteEffect,
  recordNote,
  resolution,
  storyEntries,
  treachery,
} from '../scenario-helpers'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { DUNWICH_ENCOUNTER_SETS } from './encounter-sets'
import { DUNWICH_CHAOS_BAGS } from './campaign'
import { ESSEX_ENCOUNTERS, helplessPassenger } from './essex-encounters'
import {
  trainCars,
  trainNeighbor,
  trainSpecific as specific,
  trainAllHorror,
} from './essex-helpers'
import { T, TN, THE_ESSEX_COUNTY_EXPRESS } from './essex-codes'
import { M } from './museum-codes'
import { EA, DUNWICH_NOTES as N } from './extracurricular-codes'
import { H, HN } from './house-codes'
export { T, TN, THE_ESSEX_COUNTY_EXPRESS } from './essex-codes'
export { ESSEX_ENCOUNTERS } from './essex-encounters'
const entry = storyEntries('essex')
const passengerCodes = [
  T.agilityCar,
  T.combatCar,
  T.willCar,
  T.intellectCar,
  T.wildCar,
  T.sleeping,
  T.dining,
  T.parlor,
]
const engines = [T.enginePlain, T.engineHorror, T.engineDraw]
const room = (
  id: string,
  name: string,
  shroud: number,
  clues: number,
  victory?: number,
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue: clues,
  cluesPerInvestigator: true,
  connections: [],
  unrevealedName: engines.includes(id as typeof T.enginePlain) ? 'Engine Car' : 'Train Car',
  ...(victory ? { victory } : {}),
})
export const ESSEX_LOCATIONS = {
  agility: room(T.agilityCar, 'Passenger Car', 1, 3),
  combat: room(T.combatCar, 'Passenger Car', 4, 1),
  will: room(T.willCar, 'Passenger Car', 2, 2),
  intellect: room(T.intellectCar, 'Passenger Car', 3, 2),
  wild: room(T.wildCar, 'Passenger Car', 1, 1),
  sleeping: room(T.sleeping, 'Sleeping Car', 4, 1),
  dining: room(T.dining, 'Dining Car', 2, 0),
  parlor: room(T.parlor, 'Parlor Car', 3, 1, 1),
  enginePlain: room(T.enginePlain, 'Engine Car', 4, 2, 1),
  engineHorror: room(T.engineHorror, 'Engine Car', 2, 2, 1),
  engineDraw: room(T.engineDraw, 'Engine Car', 1, 2, 1),
}
const at = (s: GameState, i: InvestigatorId) => getInvestigator(s, i).location
const engine = (s: GameState) =>
  trainCars(s).find((l) => engines.includes(l.id as typeof T.enginePlain))
const iconCount = (code: string, skill: SkillIcon) => {
  const d = playerCardDef(code)
  return d?.weakness ? 0 : (d?.icons?.[skill] ?? 0) + (skill === 'wild' ? 0 : (d?.icons?.wild ?? 0))
}
const discardIcons = (
  s: GameState,
  i: InvestigatorId,
  skill: SkillIcon,
  remaining: number,
): Message[] => {
  if (remaining <= 0) return []
  return [
    {
      type: 'Ask',
      investigator: i,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.essex.icons',
        promptParams: { amount: remaining },
        choices: [...new Set(getInvestigator(s, i).hand)]
          .filter((c) => iconCount(c, skill) > 0)
          .map((card) => ({
            label: 'choice.card',
            params: { card: playerCardDef(card)?.name ?? card },
            then: [
              { type: 'DiscardFromHand', investigator: i, card },
              specific('trainPayIcons', {
                investigator: i,
                skill,
                remaining: remaining - iconCount(card, skill),
              }),
            ],
          })),
      },
    },
  ]
}
export function theEssexCountyExpress({
  difficulty = 'standard',
  log: _log,
}: { difficulty?: Difficulty; log?: CampaignLog } = {}): ScenarioDefinition {
  return {
    id: THE_ESSEX_COUNTY_EXPRESS,
    intro: entry('intro'),
    setupInstructions: entry('setup'),
    locations: Object.values(ESSEX_LOCATIONS),
    startingLocation: T.agilityCar,
    agendas: [
      { code: T.tear, name: 'A Tear in Reality', doomThreshold: 4 },
      { code: T.maw, name: 'The Maw Widens', doomThreshold: 3 },
      { code: T.rolling, name: 'Rolling Backwards', doomThreshold: 4 },
      { code: T.drawn, name: 'Drawn In', doomThreshold: 3 },
      { code: T.outOfTime, name: 'Out of Time', doomThreshold: 3 },
    ],
    acts: [
      {
        code: T.run,
        name: 'Run!',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: T.engine,
        name: 'Get the Engine Running!',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...ESSEX_ENCOUNTERS,
      ...DUNWICH_ENCOUNTER_SETS.theBeyond,
      ...ENCOUNTER_SETS.strikingFear,
      ...ENCOUNTER_SETS.ancientEvils,
      ...ENCOUNTER_SETS.darkCult,
    ],
    setAside: copies(
      treachery({
        code: T.across,
        name: 'Across Space and Time',
        traits: ['Madness'],
        keywords: [],
      }),
      4,
    ),
    chaosBag: [...DUNWICH_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      specific('trainSetup'),
      {
        type: 'AddChaosTokens',
        tokens: [
          difficulty === 'easy'
            ? -2
            : difficulty === 'standard'
              ? -3
              : difficulty === 'hard'
                ? -4
                : -5,
        ],
      },
    ],
  }
}
registerScenario({
  id: THE_ESSEX_COUNTY_EXPRESS,
  canEnter: (s, _i, _from, to) =>
    s.phase === 'setup' ||
    !!s.locations[to]?.revealed ||
    !trainNeighbor(s, to, -1) ||
    s.locations[trainNeighbor(s, to, -1)!]?.clues === 0,
  cannotLeave: (s, i) =>
    s.scenarioMeta?.[`trainStuck:${i}`] === s.round ||
    Object.values(s.enemies).some((e) => e.code === T.grappling && e.engagedWith === i),
  cannotInvestigate: (_s, _i, l) => l === T.parlor,
  actionAllowed: (s, i, k) => !(k === 'investigate' && at(s, i) === T.parlor),
  forced: (s, t) =>
    t.type === 'afterMove' && engines.includes(at(s, t.investigator) as typeof T.enginePlain)
      ? [
          { type: 'SetScenarioMeta', key: 'trainEngineEntrant', value: t.investigator },
          { type: 'CheckActObjective' },
        ]
      : [],
  tokenEffect: (s, t, i) => {
    const hard = s.difficulty === 'hard' || s.difficulty === 'expert'
    return t === 'skull'
      ? { modifier: -(s.agendaIndex + 1 + (hard ? 1 : 0)) }
      : t === 'cultist'
        ? {
            modifier: hard ? 0 : -1,
            ...(hard ? { revealAnother: true } : {}),
            onFail: [specific('trainEndTurn', { investigator: i })],
          }
        : t === 'tablet'
          ? {
              modifier: hard ? -4 : -2,
              immediate: [specific('trainTablet', { investigator: i, hard })],
            }
          : t === 'elderThing'
            ? {
                modifier: -3,
                onFail: hard
                  ? [
                      {
                        type: 'ForEachPointFailed' as const,
                        then: [
                          { type: 'ChooseDiscardFromHand' as const, investigator: i, amount: 1 },
                        ],
                      },
                    ]
                  : [{ type: 'ChooseDiscardFromHand' as const, investigator: i, amount: 1 }],
              }
            : { modifier: 0 }
  },
  resolution: (s, outcome) => {
    const n = outcome.type === 'resolution' ? outcome.resolution : 2,
      defeated = s.investigators.filter((i) => i.eliminated && !i.resigned),
      messages: Message[] = []
    if (defeated.length) {
      messages.push({
        type: 'Story',
        entry: entry('defeated', [{ key: 'story.essex.defeatedEffect' }]),
      })
      for (const i of defeated)
        messages.push(
          { type: 'AddStoryAsset', investigator: i.id, code: T.across },
          { type: 'EarnExperience', investigator: i.id, amount: 1 },
          specific('trainLosses', { investigator: i.id }),
        )
    }
    messages.push(
      {
        type: 'Story',
        entry: entry(`resolution${n}`, [
          ...(n === 2 ? [noteEffect(TN.delayed)] : []),
          { key: 'story.effect.experience', params: { bonus: 0 } },
        ]),
      },
      ...(n === 2 ? [recordNote(TN.delayed)] : []),
      earnExperience(0, true),
      endScenario(resolution(n)),
    )
    return messages
  },
  specific: (s, key, data) => {
    const investigator = String(
      data.investigator ?? s.activeTurn ?? leadInvestigator(s)?.id ?? s.investigators[0]!.id,
    )
    if (key === 'trainSetup') {
      const [cars, r1] = shuffle(passengerCodes, s.rng),
        [front, rng] = shuffle(engines, r1),
        ids = [...cars.slice(0, 6), front[0]!],
        locations: typeof s.locations = {}
      ids.forEach((id, n) => {
        const card = Object.values(ESSEX_LOCATIONS).find((l) => l.id === id)!
        locations[id] = {
          ...card,
          position: [n, 0],
          connections: [ids[n - 1], ids[n + 1]].flatMap((v) => (v ? [v] : [])),
          revealed: false,
          clues: 0,
        }
      })
      const meta = { ...s.scenarioMeta },
        critical = [H.armitage, EA.rice, H.morgan, M.necronomicon]
      for (const i of s.investigators) {
        const all = [
          ...(s.campaignLog?.investigators[i.id]?.storyAssets ?? []),
          ...i.deck,
          ...i.hand,
          ...i.discard,
          ...Object.values(s.assets)
            .filter((a) => (a.originalOwner ?? a.owner) === i.id)
            .map((a) => a.code),
        ]
        meta[`trainCarried:${i.id}`] = critical.filter((c) => all.includes(c)).join(',')
      }
      return push(
        recomputeConnections({
          ...s,
          rng,
          locations,
          setAsideLocations: {},
          investigators: s.investigators.map((i) => ({ ...i, location: ids[0]! })),
          scenarioMeta: meta,
        }),
        {
          type: 'RevealLocation',
          location: ids[0]!,
          investigator: leadInvestigator(s)?.id ?? s.investigators[0]!.id,
        },
      )
    }
    if (key === 'trainCollapse') {
      const removing = trainCars(s).slice(0, Number(data.count ?? 1)),
        locations = new Set(removing.map((l) => l.id))
      return push(
        s,
        ...activeInvestigators(s).map((i): Message => ({
          type: 'SpendClues',
          investigator: i.id,
          amount: i.clues,
        })),
        ...activeInvestigators(s)
          .filter((i) => !!i.location && locations.has(i.location))
          .map((i): Message => ({ type: 'EliminateInvestigator', investigator: i.id })),
        ...Object.values(s.enemies)
          .filter((e) => locations.has(e.location))
          .map((e): Message => ({ type: 'DiscardEnemy', enemy: e.id })),
        ...Object.values(s.placedAssets ?? {})
          .filter((a) => a.placement.type === 'location' && locations.has(a.placement.location))
          .map((a): Message => specific('trainDiscardPlaced', { placed: a.id })),
        ...removing.map((l) => specific('trainRemoveCar', { location: l.id })),
      )
    }
    if (key === 'trainRemoveCar') {
      const l = s.locations[String(data.location)]
      if (!l) return s
      const next =
        l.victory && l.clues === 0
          ? {
              ...s,
              victoryDisplay: [...s.victoryDisplay, l.id],
              victoryPoints: (s.victoryPoints ?? 0) + l.victory,
            }
          : s
      return push(next, { type: 'RemoveLocation', location: l.id })
    }
    if (key === 'trainPassengerAppears') {
      const treacheries = { ...s.treacheries }
      delete treacheries[String(data.treachery)]
      return push(
        { ...s, treacheries },
        {
          type: 'PlaceAsset',
          code: T.passenger,
          name: 'Helpless Passenger',
          placement: { type: 'location', location: String(data.location) },
        },
      )
    }
    if (key === 'trainPassengerLeaves') {
      const a = s.assets[String(data.asset)]
      if (!a) return s
      const assets = { ...s.assets }
      delete assets[a.id]
      return push(
        { ...s, assets, encounterDiscard: [...s.encounterDiscard, { ...helplessPassenger }] },
        ...trainAllHorror(s, String(data.exclude || '')),
      )
    }
    if (key === 'placedDefeated' || key === 'trainDiscardPlaced') {
      const a = s.placedAssets?.[String(data.placed)]
      if (!a) return s
      return push(
        {
          ...s,
          ...(a.code === T.passenger
            ? { encounterDiscard: [...s.encounterDiscard, { ...helplessPassenger }] }
            : {}),
        },
        { type: 'RemovePlacedAsset', placed: a.id },
        ...(a.code === T.passenger ? trainAllHorror(s) : []),
      )
    }
    if (key === 'trainPassengerCost') {
      const skill = String(data.skill) as SkillIcon,
        amount = Number(data.amount),
        have = getInvestigator(s, investigator).hand.reduce((n, c) => n + iconCount(c, skill), 0)
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.essex.passengerCost',
          choices: [
            ...(have >= amount
              ? [
                  {
                    label: 'choice.essex.icons',
                    then: [specific('trainPayIcons', { investigator, skill, remaining: amount })],
                  },
                ]
              : []),
            {
              label: 'choice.essex.damage',
              then: [damage(investigator, Number(data.damage ?? 0), Number(data.horror ?? 0))],
            },
          ],
        },
      })
    }
    if (key === 'trainPayIcons')
      return push(
        s,
        ...discardIcons(s, investigator, String(data.skill) as SkillIcon, Number(data.remaining)),
      )
    if (key === 'trainEndTurn')
      return s.activeTurn === investigator
        ? push(
            s,
            {
              type: 'LoseActions',
              investigator,
              amount: getInvestigator(s, investigator).actionsRemaining,
            },
            { type: 'EndTurn', investigator },
          )
        : s
    if (key === 'trainTablet') {
      const enemies = Object.values(s.enemies).filter((e) => e.traits?.includes('Cultist'))
      if (!enemies.length) return s
      const place = (ids: string[]) => ({
        ...s,
        enemies: Object.fromEntries(
          Object.entries(s.enemies).map(([id, e]) => [
            id,
            ids.includes(id) ? { ...e, doom: (e.doom ?? 0) + 1 } : e,
          ]),
        ),
      })
      if (data.hard === true) return place(enemies.map((e) => e.id))
      const here = at(s, investigator)
      if (!here) return s
      const distances = distancesFrom(s, here),
        distance = Math.min(...enemies.map((e) => distances.get(e.location) ?? Infinity)),
        nearest = enemies.filter((e) => (distances.get(e.location) ?? Infinity) === distance)
      if (nearest.length === 1) return place([nearest[0]!.id])
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEnemy',
          choices: nearest.map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            then: [specific('trainEnemyDoom', { enemy: e.id })],
          })),
        },
      })
    }
    if (key === 'trainEnemyDoom') {
      const e = s.enemies[String(data.enemy)]
      return e ? { ...s, enemies: { ...s.enemies, [e.id]: { ...e, doom: (e.doom ?? 0) + 1 } } } : s
    }
    if (key === 'trainLosses') {
      const carried = String(s.scenarioMeta?.[`trainCarried:${investigator}`] ?? '').split(','),
        record = s.campaignLog?.investigators[investigator]
      if (!record || !s.campaignLog) return s
      const notes: Record<string, string> = {
        [M.necronomicon]: TN.necronomiconStolen,
        [H.armitage]: HN.armitageKidnapped,
        [EA.rice]: N.riceKidnapped,
        [H.morgan]: HN.morganKidnapped,
      }
      const lost = carried.filter((c) => notes[c]),
        campaignLog = {
          ...s.campaignLog,
          investigators: {
            ...s.campaignLog.investigators,
            [investigator]: {
              ...record,
              storyAssets: record.storyAssets.filter((c) => !lost.includes(c)),
            },
          },
        }
      return push({ ...s, campaignLog }, ...lost.map((c) => recordNote(notes[c]!)))
    }
    return s
  },
})
for (const [code, skill, amount, hurt, fear] of [
  [T.agilityCar, 'agility', 2, 2, 0],
  [T.combatCar, 'combat', 2, 2, 0],
  [T.willCar, 'willpower', 2, 0, 2],
  [T.intellectCar, 'intellect', 2, 0, 2],
  [T.wildCar, 'wild', 1, 1, 1],
] as const)
  registerLocation({
    code,
    forced: (s, t, self) =>
      t.type === 'afterMove' && s.phase !== 'setup' && at(s, t.investigator) === self.id
        ? [
            specific('trainPassengerCost', {
              investigator: t.investigator,
              skill,
              amount,
              damage: hurt,
              horror: fear,
            }),
          ]
        : [],
  })
registerLocation({
  code: T.sleeping,
  abilities: (s, _l, i) =>
    s.scenarioMeta?.trainLuggage === 1
      ? []
      : [
          {
            key: 'train:luggage',
            label: 'ability.essex.luggage',
            actions: 1,
            provokes: true,
            then: [
              { type: 'SetScenarioMeta', key: 'trainLuggage', value: 1 },
              {
                type: 'GainResources',
                investigator: i,
                amount: 3,
              },
            ],
          },
        ],
})
registerLocation({
  code: T.parlor,
  abilities: (s, _l, i) =>
    getInvestigator(s, i).resources >= 3
      ? [
          {
            key: 'train:parlor',
            label: 'ability.essex.parlor',
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendResources', investigator: i, amount: 3 }],
            then: [{ type: 'DiscoverClues', investigator: i, location: T.parlor, amount: 1 }],
          },
        ]
      : [],
})
for (const code of [T.dining, T.engineHorror])
  registerLocation({
    code,
    onReveal: (s, _l, i) => [
      {
        type: 'SearchAndDrawEncounter',
        investigator: i ?? s.activeTurn ?? leadInvestigator(s)!.id,
        code: T.grappling,
        amount: 1,
      },
    ],
  })
registerLocation({
  code: T.engineDraw,
  onReveal: (s, _l, i) =>
    Array.from({ length: 3 }, (): Message => ({
      type: 'DrawEncounterCard',
      investigator: i ?? s.activeTurn ?? leadInvestigator(s)!.id,
    })),
})
registerAct({
  code: T.run,
  objectiveMet: (s) =>
    activeInvestigators(s).some((i) => engines.includes(i.location as typeof T.enginePlain)),
  onAdvance: (s) => {
    const i = String(
      s.scenarioMeta?.trainEngineEntrant ??
        activeInvestigators(s).find((i) => engines.includes(i.location as typeof T.enginePlain))
          ?.id ??
        leadInvestigator(s)!.id,
    )
    return [
      {
        type: 'Ask',
        investigator: i,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.essex.steam',
          choices: [
            {
              label: 'choice.essex.agility',
              then: [
                effectTest(i, 'Wings of Steam', 'agility', 3, {
                  onFail: [{ type: 'SufferTrauma', investigator: i, mental: 1 }],
                }),
              ],
            },
            {
              label: 'choice.essex.combat',
              then: [
                effectTest(i, 'Wings of Steam', 'combat', 3, {
                  onFail: [{ type: 'SufferTrauma', investigator: i, physical: 1 }],
                }),
              ],
            },
          ],
        },
      },
    ]
  },
})
registerAct({
  code: T.engine,
  objectiveMet: (s) => !!engine(s)?.revealed && engine(s)!.clues === 0,
  onAdvance: () => [{ type: 'EndScenario', outcome: resolution(1) }],
})
for (const [code, count] of [
  [T.tear, 1],
  [T.maw, 1],
  [T.rolling, 2],
  [T.drawn, 2],
] as const)
  registerAgenda({ code, onAdvance: () => [specific('trainCollapse', { count })] })
registerAgenda({
  code: T.outOfTime,
  onAdvance: (s) => [
    ...activeInvestigators(s).map((i): Message => ({
      type: 'SufferTrauma',
      investigator: i.id,
      mental: 1,
    })),
    ...activeInvestigators(s).map((i): Message => ({
      type: 'EliminateInvestigator',
      investigator: i.id,
    })),
    { type: 'EndScenario', outcome: resolution(2) },
  ],
})
