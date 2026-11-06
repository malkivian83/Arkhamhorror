import {
  activeInvestigators,
  getInvestigator,
  nextInt,
  push,
  registerAct,
  registerAgenda,
  registerScenario,
  type Difficulty,
  type GameState,
  type Message,
  type ScenarioDefinition,
} from '@lcg/engine'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { endScenario, recordNote } from '../scenario-helpers'
import { PLAGUEBEARER_CHAOS_BAGS } from './campaign'
import { C, ask, on, run, specific } from './helpers'
import { treacheries } from './data'
import { HIBBS, N, TOWN, abhorrentPustule, nightDeck, townLocations } from './night-data'
import { defendValue, fixedDefend, townSettled } from './night-helpers'
import { defendReactions, townReactions } from './night-citizens'
import './night-locations'
import './night-encounters'
import { friendsInLowPlaces } from './friends-in-low-places'

export const NIGHT_ON_THE_TOWN = 'night-on-the-town'
export function nightOnTheTown({
  difficulty = 'standard',
  seed = 1,
}: { difficulty?: Difficulty; seed?: number } = {}): ScenarioDefinition {
  const [docks, rng1] = nextInt(seed, 2)
  const [boarding, rng2] = nextInt(rng1, 2)
  const [lost] = nextInt(rng2, 2)
  const selected = [
    HIBBS,
    '78024',
    '78025',
    '78028',
    docks ? '78029' : '78023',
    boarding ? '78027' : '78030',
  ]
  const missing = TOWN.filter((row) => !selected.includes(row.id))
  const locations = townLocations()
  return {
    id: NIGHT_ON_THE_TOWN,
    intro: { title: 'story.plaguebearer.night.introTitle', body: 'story.plaguebearer.night.intro' },
    setupInstructions: {
      title: 'story.plaguebearer.night.setupTitle',
      body: 'story.plaguebearer.night.setup',
    },
    locations: locations.filter((l) => selected.includes(l.id)),
    setAsideLocations: locations.filter((l) => !selected.includes(l.id)),
    startingLocation: HIBBS,
    agendas: [
      { code: N.agendas[0], name: 'Spreading Uncertainty', doomThreshold: 8 },
      { code: N.agendas[1], name: 'Spreading Corruption', doomThreshold: 8 },
    ],
    acts: [
      {
        code: N.act,
        name: 'Community Service',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...nightDeck(),
      ...treacheries
        .filter((t) => t.code === C.urge || t.code === C.another)
        .flatMap((t) => Array.from({ length: t.code === C.urge ? 3 : 2 }, () => ({ ...t }))),
      ...ENCOUNTER_SETS.ancientEvils,
      ...ENCOUNTER_SETS.midnightMasksTreacheries.filter((t) => t.code === '01135'),
    ],
    setAside: [abhorrentPustule],
    chaosBag: [...PLAGUEBEARER_CHAOS_BAGS[difficulty]],
    tokenValues: { skull: 0, cultist: -4, tablet: -3, elderThing: 0 },
    setup: [
      specific('night.setup', { lost: missing[lost]!.id }),
      specific('night.briefcaseChoice'),
    ],
  }
}
const round = (s: GameState): Message[] => [
  { type: 'SetScenarioMeta', key: 'nightRoundEnds', value: s.round },
  ...Object.keys(s.locations).map((location) => specific('night.roundLocation', { location })),
  { type: 'CheckActObjective' },
]
registerAgenda({
  code: N.agendas[0],
  forced: (s, t) => (t.type === 'roundEnds' ? round(s) : []),
  onAdvance: () => [specific('night.spawnPustule')],
})
registerAgenda({
  code: N.agendas[1],
  forced: (s, t) => (t.type === 'roundEnds' ? round(s) : []),
  onAdvance: (s) => [
    ...activeInvestigators(s).flatMap((i): Message[] => [
      { type: 'SufferTrauma', physical: 1, investigator: i.id },
      { type: 'DefeatInvestigator', investigator: i.id },
    ]),
  ],
})
on('night.spawnPustule', (s) => {
  const location = s.locations['78025'] ? '78025' : s.locations['78277'] ? '78277' : undefined
  return location ? push(s, { type: 'SpawnSetAsideEnemy', code: N.pustule, location }) : s
})
registerAct({
  code: N.act,
  abilities: (s, _self, by) => {
    const here = getInvestigator(s, by).location
    return here && (s.locations[here]?.resources ?? 0) > 0
      ? [
          {
            key: 'night:resign',
            label: 'ability.plaguebearer.night.resign',
            actions: 1,
            provokes: false,
            then: [{ type: 'Resign', investigator: by }],
          },
        ]
      : []
  },
  objectiveMet: (s) => s.scenarioMeta?.nightRoundEnds === s.round && townSettled(s),
  onAdvance: (s) => activeInvestigators(s).map((i) => ({ type: 'Resign', investigator: i.id })),
})
on('night.briefcaseChoice', (s) => {
  const owner = s.investigators.find((i) =>
    s.campaignLog?.investigators[i.id]?.storyAssets.includes(C.briefcase),
  )
  return !owner
    ? s
    : ask(s, owner.id, [
        {
          label: 'choice.plaguebearer.night.briefcase',
          then: [specific('night.startBriefcase', { investigator: owner.id })],
        },
        { label: 'choice.skip', then: [] },
      ])
})
on('night.startBriefcase', (s, d) => {
  const by = String(d.investigator),
    i = getInvestigator(s, by),
    inHand = i.hand.includes(C.briefcase)
  const next = {
    ...s,
    investigators: s.investigators.map((other) =>
      other.id !== by
        ? other
        : {
            ...other,
            hand: other.hand.filter((c) => c !== C.briefcase),
            deck: other.deck.filter((c) => c !== C.briefcase),
            discard: other.discard.filter((c) => c !== C.briefcase),
          },
    ),
  }
  return push(
    next,
    { type: 'PutAssetIntoPlay', investigator: by, code: C.briefcase },
    ...(inHand ? [{ type: 'DrawCards' as const, investigator: by, amount: 1 }] : []),
  )
})
on('night.tablet', (s, d) => {
  const code = [...s.encounterDiscard]
    .reverse()
    .find((c) => c.kind === 'treachery' && c.traits?.includes('Miasma'))?.code
  return code
    ? push(s, { type: 'DrawFromEncounterDiscard', investigator: String(d.investigator), code })
    : s
})
registerScenario({
  id: NIGHT_ON_THE_TOWN,
  rulesVersion: 1,
  preserveCluesOnReveal: true,
  simultaneousAssetAssignment: true,
  sequentialEnemyMovement: true,
  specific: (s, key, data) => run(s, key, data),
  skillBase: defendValue,
  skillUnmodified: (_s, test) => fixedDefend(test),
  cannotCommit: (s) => fixedDefend(s.skillTest),
  reactions: (s, t) => [...defendReactions(s, t), ...townReactions(s, t)],
  forced: (s, t) =>
    t.type === 'afterSkillTest' &&
    !t.succeeded &&
    t.margin <= -2 &&
    s.skillTest?.kind.type === 'effect' &&
    s.skillTest.kind.source === C.urge
      ? [{ type: 'TakeDamage', investigator: t.investigator, damage: 0, horror: 2 }]
      : [],
  tokenEffect: (s, token, by) => {
    const hard = s.difficulty === 'hard' || s.difficulty === 'expert'
    if (token === 'skull')
      return {
        modifier: -Object.values(s.locations).filter(
          (l) => (l.resources ?? 0) > 0 || (hard && (l.horror ?? 0) > 0),
        ).length,
      }
    if (token === 'cultist')
      return {
        modifier: hard ? -6 : -4,
        onSuccess: [
          { type: 'DrawCards', investigator: by, amount: 1 },
          { type: 'GainResources', investigator: by, amount: 1 },
        ],
      }
    if (token === 'tablet')
      return {
        modifier: -3,
        ...(hard
          ? { immediate: [specific('night.tablet', { investigator: by })] }
          : { onFail: [specific('night.tablet', { investigator: by })] }),
      }
    throw new Error(`Night on the Town: token ${token} is not implemented`)
  },
  resolution: (s) => {
    const defended = Object.values(s.locations).filter((l) => (l.resources ?? 0) > 0),
      n = defended.length >= 6 ? 2 : 1,
      covered = n === 2 || (defended.length >= 3 && defended.some((l) => l.id === HIBBS))
    return [
      {
        type: 'Story',
        entry: {
          title: `story.plaguebearer.night.resolution${n}Title`,
          body: `story.plaguebearer.night.resolution${n}`,
        },
      },
      { type: 'EarnExperience', amount: 0, victory: true },
      ...TOWN.flatMap((row) =>
        s.locations[row.ruin]
          ? [
              specific('night.recordTown', { location: row.id, status: 'Infected' }),
              recordNote(`plaguebearerTown${row.id}Infected`),
            ]
          : defended.some((l) => l.id === row.id)
            ? [
                specific('night.recordTown', { location: row.id, status: 'Defended' }),
                recordNote(`plaguebearerTown${row.id}Defended`),
              ]
            : [],
      ),
      ...(n === 2
        ? [recordNote('plaguebearerArkhamTogether')]
        : covered
          ? [recordNote('plaguebearerHibbsCovered')]
          : []),
      // Interludio I: se resuelve antes de cerrar el escenario.
      ...friendsInLowPlaces(s, covered, endScenario({ type: 'resolution', resolution: n })),
    ]
  },
})
