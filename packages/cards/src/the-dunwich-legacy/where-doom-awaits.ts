import {
  activeInvestigators,
  controlledClues,
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
  shroudOf,
  type AbilityOption,
  type CampaignLog,
  type Difficulty,
  type GameState,
  type LocationCard,
  type Message,
  type ScenarioDefinition,
} from '@lcg/engine'
import {
  damage,
  earnExperience,
  endScenario,
  recordNote,
  resolution,
  storyEntries,
} from '../scenario-helpers'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { DUNWICH_CHAOS_BAGS } from './campaign'
import { DUNWICH_ENCOUNTER_SETS } from './encounter-sets'
import { HOUSE_SETS } from './house-encounters'
import { BN } from './altar-codes'
import { HN } from './house-codes'
import { MN } from './museum-codes'
import { TN } from './essex-codes'
import { UN } from './unseen-codes'
import { ALTERED_PATHS, DIVERGING_PATHS, W, WN, WHERE_DOOM_AWAITS } from './doom-codes'
import { doomSpecific as specific, atAltered } from './doom-helpers'
import { DOOM_ENCOUNTERS } from './doom-encounters'
import { sethBishop } from './seth-bishop'
import { conglomerationOfSpheres } from './conglomeration-of-spheres'
import { servantOfTheLurker } from './servant-of-the-lurker'
export { W, WN, WHERE_DOOM_AWAITS } from './doom-codes'
export { DOOM_ENCOUNTERS } from './doom-encounters'
export const DOOM_EXTRA_ENEMIES = [conglomerationOfSpheres, servantOfTheLurker]
const entry = storyEntries('doom')
const anchors: string[] = [W.base, W.ascent, W.peak]
const pathCards = [...DIVERGING_PATHS, ...ALTERED_PATHS]
const room = (
  id: string,
  name: string,
  shroud: number,
  clues: number,
  symbol: string,
  connectsTo: string[],
  position: [number, number],
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue: clues,
  cluesPerInvestigator: true,
  symbol,
  connectsTo,
  connections: [],
  position,
  ...(pathCards.includes(id)
    ? {
        unrevealed: { symbol: '', connectsTo: [] },
        unrevealedName: DIVERGING_PATHS.includes(id) ? 'Diverging Path' : 'Altered Path',
      }
    : {}),
})
export const DOOM_LOCATIONS: LocationCard[] = [
  room(
    W.base,
    'Base of the Hill',
    3,
    0,
    'triangle',
    ['square', 'cross', 'wave', 'hourglass'],
    [0, 2],
  ),
  room(
    W.ascent,
    'Ascending Path',
    3,
    0,
    'square',
    ['triangle', 'diamond', 'tee', 'slash', 'moon'],
    [0, 0],
  ),
  {
    ...room(W.peak, 'Sentinel Peak', 4, 2, 'diamond', ['square'], [0, -2]),
    enterCost: 2,
    victory: 2,
  },
  room(W.slaughtered, 'Slaughtered Woods', 2, 1, 'cross', ['triangle', 'hourglass'], [-2, 2]),
  room(W.eerie, 'Eerie Glade', 4, 1, 'hourglass', ['triangle', 'cross'], [2, 2]),
  room(W.destroyed, 'Destroyed Path', 3, 0, 'wave', ['triangle', 'slash'], [-2, 3]),
  room(W.frozen, 'Frozen Spring', 3, 1, 'cross', ['triangle', 'hourglass'], [2, 3]),
  room(W.gap, 'Dimensional Gap', 3, 1, 'tee', ['square', 'moon'], [-2, 0]),
  room(W.tear, 'A Tear in the Path', 3, 1, 'slash', ['square', 'wave'], [2, 0]),
  room(W.uprooted, 'Uprooted Woods', 2, 1, 'moon', ['square', 'tee'], [-2, -1]),
  room(W.memories, 'Lost Memories', 2, 1, 'tee', ['square', 'moon'], [2, -1]),
]
export function whereDoomAwaits({
  difficulty = 'standard',
  log,
}: { difficulty?: Difficulty; log?: CampaignLog } = {}): ScenarioDefinition {
  const notes = log?.notes ?? []
  const second = notes.includes(BN.restored)
    ? W.ascendingI
    : notes.includes(MN.failed) || notes.includes(TN.necronomiconStolen)
      ? W.ascendingII
      : W.ascendingIII
  return {
    id: WHERE_DOOM_AWAITS,
    intro: entry('intro'),
    setupInstructions: entry('setup'),
    locations: DOOM_LOCATIONS.filter((l) => anchors.includes(l.id)),
    setAsideLocations: DOOM_LOCATIONS.filter((l) => pathCards.includes(l.id)),
    startingLocation: W.base,
    agendas: [
      { code: W.calling, name: 'Calling Forth the Old Ones', doomThreshold: 12 },
      { code: W.beckoning, name: 'Beckoning for Power', doomThreshold: 10 },
    ],
    acts: [
      {
        code: W.path,
        name: 'The Path to the Hill',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'objective',
      },
      {
        code: second,
        name: 'Ascending the Hill',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: W.gate,
        name: 'The Gate Opens',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        cluesAtLocation: W.peak,
        advanceTiming: 'anytime',
      },
    ],
    encounterDeck: [
      ...DOOM_ENCOUNTERS,
      ...HOUSE_SETS.abominations,
      ...DUNWICH_ENCOUNTER_SETS.sorcery,
      ...DUNWICH_ENCOUNTER_SETS.bishopsThralls,
      ...ENCOUNTER_SETS.strikingFear,
      ...ENCOUNTER_SETS.ancientEvils,
      ...ENCOUNTER_SETS.chillingCold,
    ],
    setAside: [sethBishop],
    chaosBag: [...DUNWICH_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      ...(notes.includes(HN.naomi) ? [{ type: 'Story' as const, entry: entry('part1') }] : []),
      specific('doomSetup', { standalone: !log }),
    ],
  }
}
registerScenario({
  id: WHERE_DOOM_AWAITS,
  canEnter: (s, _i, _from, to) => to !== W.ascent || s.locations[W.ascent]?.revealed === true,
  cannotPlaceClues: (s, l) => s.actIndex === 1 && !atAltered(s, l),
  connections: (s, l) =>
    l.id === W.base
      ? Object.keys(s.locations).filter((id) => DIVERGING_PATHS.includes(id))
      : l.id === W.ascent
        ? Object.keys(s.locations).filter((id) => ALTERED_PATHS.includes(id))
        : DIVERGING_PATHS.includes(l.id)
          ? [W.base]
          : ALTERED_PATHS.includes(l.id)
            ? [W.ascent]
            : [],
  forced: (s, t) =>
    t.type === 'whenTreacheryDrawn' &&
    getInvestigator(s, t.investigator).location === W.peak &&
    s.treacheries[t.treachery]?.traits?.includes('Hex')
      ? [damage(t.investigator, 1)]
      : [],
  tokenEffect: (s, t, i) => {
    const hard = s.difficulty === 'hard' || s.difficulty === 'expert'
    if (t === 'skull')
      return {
        modifier: atAltered(s, getInvestigator(s, i).location) ? (hard ? -5 : -3) : hard ? -2 : -1,
      }
    if (t === 'cultist')
      return { modifier: 0, revealAnother: true, immediate: [{ type: 'CancelCommittedSkills' }] }
    if (t === 'tablet')
      return {
        modifier: hard ? -3 : s.agendaIndex === 1 ? -4 : -2,
        ...(hard && s.agendaIndex === 1 ? { autoFail: true } : {}),
      }
    if (t === 'elderThing') {
      const cards = getInvestigator(s, i).deck.slice(0, hard ? 3 : 2)
      return {
        modifier: -cards.reduce((sum, c) => sum + Math.max(0, playerCardDef(c)?.cost ?? 0), 0),
        immediate: [{ type: 'MillDeck', investigator: i, amount: hard ? 3 : 2 }],
      }
    }
    return { modifier: 0 }
  },
  resolution: (_s, o) => {
    const n = o.type === 'resolution' ? o.resolution : 2
    return [
      { type: 'Story', entry: entry(`resolution${n}`) },
      ...(n === 1
        ? [recordNote(WN.entered), earnExperience(0, true)]
        : [
            recordNote(WN.merged),
            recordNote('campaignLost'),
            { type: 'DriveDefeatedInsane' as const, all: true },
          ]),
      endScenario(resolution(n)),
    ]
  },
  specific: (s, key, data) => {
    const id = String(data.investigator ?? leadInvestigator(s)?.id ?? s.investigators[0]!.id)
    if (key === 'doomSetup') {
      let rng = s.rng
      const setAsideLocations: typeof s.setAsideLocations = {}
      for (const family of [DIVERGING_PATHS, ALTERED_PATHS]) {
        const [paths, r] = shuffle(family, rng)
        rng = r
        for (const code of paths.slice(0, 3)) setAsideLocations[code] = s.setAsideLocations[code]!
      }
      const silas = !data.standalone && s.campaignLog?.notes.includes(BN.killed)
      const [encounterDeck, r] = shuffle(
        [...s.encounterDeck, ...(silas ? [conglomerationOfSpheres, servantOfTheLurker] : [])],
        rng,
      )
      const tokens = { easy: -3, standard: -5, hard: -6, expert: -7 }
      return push(
        { ...s, rng: r, encounterDeck, setAsideLocations },
        { type: 'AddChaosTokens', tokens: [tokens[s.difficulty]] },
        ...(!data.standalone && s.campaignLog?.notes.includes(HN.naomi)
          ? [
              {
                type: 'MoveClues' as const,
                from: { type: 'pool' as const },
                to: { type: 'investigator' as const, id },
                amount: s.startingInvestigatorCount >= 3 ? 2 : 1,
              },
            ]
          : []),
        ...(!data.standalone
          ? [{ type: 'PlaceDoom' as const, amount: Number(s.campaignLog?.values[UN.escaped] ?? 0) }]
          : []),
        ...(silas
          ? [
              {
                type: 'SpawnEnemy' as const,
                card: conglomerationOfSpheres,
                location: W.ascent,
                engageWith: null,
              },
            ]
          : []),
      )
    }
    if (key === 'doomNewPath') {
      const family = String(data.family) === 'altered' ? ALTERED_PATHS : DIVERGING_PATHS
      const [paths, rng] = shuffle(
        Object.keys(s.setAsideLocations).filter((l) => family.includes(l)),
        s.rng,
      )
      const code = paths[0]
      if (!code) return s
      const card = s.setAsideLocations[code]!,
        { [code]: _used, ...setAsideLocations } = s.setAsideLocations
      const n = family.filter((l) => s.locations[l]).length
      return recomputeConnections({
        ...s,
        rng,
        setAsideLocations,
        locations: {
          ...s.locations,
          [code]: {
            ...card,
            position: [n === 0 ? -2 : 2, (family === ALTERED_PATHS ? 0 : 2) + (n === 2 ? 1 : 0)],
            revealed: false,
            clues: 0,
          },
        },
      })
    }
    if (key === 'doomClearClues')
      return {
        ...s,
        locations: Object.fromEntries(
          Object.entries(s.locations).map(([l, v]) => [l, { ...v, clues: 0 }]),
        ),
      }
    if (key === 'doomSeth') {
      const present = s.setAside.some((c) => c.code === W.seth)
      const next = { ...s, setAside: s.setAside.filter((c) => c.code !== W.seth) }
      return present && data.spawn
        ? push(next, {
            type: 'SpawnEnemy',
            card: sethBishop,
            location: W.peak,
            engageWith: null,
            initialDamage: data.damaged ? s.startingInvestigatorCount : 0,
          })
        : next
    }
    if (key === 'doomLocationDoom') {
      const l = String(data.location),
        location = s.locations[l]
      return location
        ? {
            ...s,
            locations: {
              ...s.locations,
              [l]: { ...location, doom: Math.max(0, (location.doom ?? 0) + Number(data.amount)) },
            },
          }
        : s
    }
    if (key === 'doomGap') {
      const index = s.encounterDeck.findIndex((c) => c.kind === 'enemy')
      const card = s.encounterDeck[index]
      if (!card || card.kind !== 'enemy')
        return {
          ...s,
          encounterDeck: [],
          encounterDiscard: [...s.encounterDiscard, ...s.encounterDeck],
        }
      return push(
        {
          ...s,
          encounterDeck: s.encounterDeck.slice(index + 1),
          encounterDiscard: [...s.encounterDiscard, ...s.encounterDeck.slice(0, index)],
        },
        { type: 'SpawnEnemy', card, location: W.gap, engageWith: null },
      )
    }
    if (key === 'doomRites') {
      const actors = activeInvestigators(s).filter((i) => atAltered(s, i.location))
      const cards = Object.fromEntries(
        actors.map((i) => [i.id, i.discard.filter((c) => playerCardDef(c)?.weakness)]),
      )
      return push(
        {
          ...s,
          investigators: s.investigators.map((i) =>
            cards[i.id]
              ? { ...i, discard: i.discard.filter((c) => !playerCardDef(c)?.weakness) }
              : i,
          ),
        },
        ...actors.map((i) => ({
          type: 'ShuffleCardsIntoDeck' as const,
          investigator: i.id,
          cards: cards[i.id]!,
        })),
      )
    }
    if (key === 'doomSpaces') {
      const paths = Object.values(s.locations).filter((l) => !anchors.includes(l.id)),
        destinations = Object.fromEntries(
          paths.map((l) => [l.id, DIVERGING_PATHS.includes(l.id) ? W.base : W.ascent]),
        )
      const [positions, rng] = shuffle(
        paths.map((l) => l.position),
        s.rng,
      )
      let next = recomputeConnections({
        ...s,
        rng,
        locations: {
          ...s.locations,
          ...Object.fromEntries(
            paths.map((l, n) => [
              l.id,
              { ...l, revealed: false, clues: 0, position: positions[n] ?? [0, 0] },
            ]),
          ),
        },
      })
      const moves: Message[] = [
        ...activeInvestigators(s)
          .filter((i) => i.location && destinations[i.location])
          .map((i) => ({
            type: 'MoveTo' as const,
            investigator: i.id,
            location: destinations[i.location!]!,
          })),
        ...Object.values(s.enemies)
          .filter((e) => destinations[e.location])
          .map((e) => ({
            type: 'MoveEnemy' as const,
            enemy: e.id,
            location: destinations[e.location]!,
          })),
      ]
      next = push(next, ...moves)
      return next
    }
    if (key === 'doomShuffleEncounter') {
      const [encounterDeck, rng] = shuffle([...s.encounterDeck, ...s.encounterDiscard], s.rng)
      return { ...s, encounterDeck, encounterDiscard: [], rng }
    }
    return s
  },
})
registerAct({
  code: W.path,
  objectiveRequiresClues: true,
  objectiveMet: (s) =>
    activeInvestigators(s).reduce((n, i) => n + controlledClues(s, i.id), 0) >=
    2 * s.startingInvestigatorCount,
  onAdvance: () => [
    { type: 'Story', entry: entry('act1') },
    specific('doomClearClues'),
    { type: 'RevealLocation', location: W.ascent },
  ],
})
for (const code of [W.ascendingI, W.ascendingII, W.ascendingIII])
  registerAct({
    code,
    forced: (_s, t) =>
      t.type === 'whenEnterLocation' && t.location === W.peak ? [{ type: 'AdvanceAct' }] : [],
    onAdvance: () => [
      {
        type: 'Story',
        entry: entry(
          code === W.ascendingI ? 'act2I' : code === W.ascendingII ? 'act2II' : 'act2III',
        ),
      },
      specific('doomSeth', { spawn: code !== W.ascendingI, damaged: code === W.ascendingIII }),
    ],
  })
registerAct({
  code: W.gate,
  onAdvance: () => [
    { type: 'Story', entry: entry('act3') },
    { type: 'EndScenario', outcome: resolution(1) },
  ],
})
registerAgenda({
  code: W.calling,
  onAdvance: () => [{ type: 'Story', entry: entry('agenda1') }, specific('doomShuffleEncounter')],
})
registerAgenda({
  code: W.beckoning,
  onAdvance: () => [
    { type: 'Story', entry: entry('agenda2') },
    { type: 'EndScenario', outcome: resolution(2) },
  ],
})
function investigate(
  s: GameState,
  investigator: string,
  location: string,
  then: Message[],
  limit = false,
): AbilityOption {
  return {
    key: `${location}:investigate`,
    label: 'ability.doom.investigate',
    actions: 1,
    actionKind: 'investigate',
    provokes: true,
    ...(limit ? { limit: { per: 'round' as const } } : {}),
    then: [
      {
        type: 'BeginSkillTest',
        investigator,
        skill: 'intellect',
        difficulty: shroudOf(s, location),
        kind: { type: 'investigate', location, replaceClue: true, onSuccess: then },
      },
    ],
  }
}
registerLocation({
  code: W.base,
  abilities: (s, l, i) => [
    ...(Object.keys(s.setAsideLocations).some((id) => DIVERGING_PATHS.includes(id))
      ? [investigate(s, i, l.id, [specific('doomNewPath', { family: 'diverging' })], true)]
      : []),
    {
      key: `${l.id}:resign`,
      label: 'ability.resign',
      actions: 1,
      provokes: false,
      then: [{ type: 'Resign', investigator: i }],
    },
  ],
})
registerLocation({
  code: W.ascent,
  abilities: (s, l, i) =>
    Object.keys(s.setAsideLocations).some((id) => ALTERED_PATHS.includes(id))
      ? [investigate(s, i, l.id, [specific('doomNewPath', { family: 'altered' })], true)]
      : [],
})
registerLocation({ code: W.peak })
for (const code of pathCards)
  registerLocation({
    code,
    abilities:
      code === W.destroyed
        ? (s, l, i) =>
            (l.doom ?? 0) > 0
              ? [
                  investigate(s, i, l.id, [
                    specific('doomLocationDoom', { location: l.id, amount: -1 }),
                  ]),
                ]
              : []
        : () => [],
    onReveal: (s, l, i) => {
      if (!i) return []
      const actions = getInvestigator(s, i).actionsRemaining
      return code === W.slaughtered
        ? actions === 0
          ? [damage(i, 0, 2)]
          : []
        : code === W.eerie
          ? [{ type: 'MillDeck', investigator: i, amount: 2 * actions }]
          : code === W.destroyed
            ? [
                specific('doomLocationDoom', {
                  location: l.id,
                  amount: s.startingInvestigatorCount,
                }),
              ]
            : code === W.frozen
              ? [{ type: 'EndCurrentTurn', investigator: i }]
              : code === W.gap
                ? [specific('doomGap')]
                : code === W.tear
                  ? actions === 0
                    ? [damage(i, 2)]
                    : []
                  : code === W.uprooted
                    ? actions === 0
                      ? [{ type: 'MillDeck', investigator: i, amount: 5 }]
                      : []
                    : [damage(i, 0, actions)]
    },
  })
