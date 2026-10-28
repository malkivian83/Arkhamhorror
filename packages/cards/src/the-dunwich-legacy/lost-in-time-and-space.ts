import {
  activeInvestigators,
  controlledClues,
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  printedCode,
  push,
  registerAct,
  registerAgenda,
  registerLocation,
  registerScenario,
  shuffle,
  shroudOf,
  type AbilityOption,
  type CampaignLog,
  type Difficulty,
  type EncounterLocationCard,
  type GameState,
  type Message,
  type ScenarioDefinition,
} from '@lcg/engine'
import {
  copies,
  damage,
  earnExperience,
  effectTest,
  endScenario,
  recordNote,
  resolution,
  storyEntries,
} from '../scenario-helpers'
import { DUNWICH_CHAOS_BAGS } from './campaign'
import { DUNWICH_ENCOUNTER_SETS } from './encounter-sets'
import { BN } from './altar-codes'
import { DUNWICH_NOTES } from './extracurricular-codes'
import { UN } from './unseen-codes'
import { WN } from './doom-codes'
import { L, LN, LOST_IN_TIME_AND_SPACE } from './lost-codes'
import { lostSpecific as specific, extradimensional, isExtradimensional } from './lost-helpers'
import { LOST_ENCOUNTERS, LOST_LOCATIONS } from './lost-encounters'
import { yogSothoth } from './yog-sothoth'
import { conglomerationOfSpheres } from './conglomeration-of-spheres'
import { servantOfTheLurker } from './servant-of-the-lurker'
export { L, LN, LOST_IN_TIME_AND_SPACE } from './lost-codes'
export { LOST_ENCOUNTERS, LOST_LOCATIONS, LOST_ENCOUNTER_LOCATIONS } from './lost-encounters'
const entry = storyEntries('lost')
const standaloneBag = [
  1,
  0,
  0,
  -1,
  -1,
  -1,
  -2,
  -2,
  -3,
  -3,
  -4,
  -5,
  'skull',
  'skull',
  'cultist',
  'tablet',
  'elderThing',
  'autoFail',
  'elderSign',
] as const
export function lostInTimeAndSpace({
  difficulty = 'standard',
  log,
}: { difficulty?: Difficulty; log?: CampaignLog } = {}): ScenarioDefinition {
  return {
    id: LOST_IN_TIME_AND_SPACE,
    intro: entry('intro'),
    setupInstructions: entry('setup'),
    locations: [LOST_LOCATIONS[0]!],
    setAsideLocations: LOST_LOCATIONS.slice(1),
    startingLocation: L.another,
    agendas: [
      { code: L.all, name: 'All is One', doomThreshold: 4 },
      { code: L.past, name: 'Past, Present and Future', doomThreshold: 4 },
      { code: L.breaking, name: 'Breaking Through', doomThreshold: 6 },
      { code: L.end, name: 'The End of All Things', doomThreshold: 2 },
    ],
    acts: [
      {
        code: L.out,
        name: 'Out of this World',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      {
        code: L.beyond,
        name: 'Into the Beyond',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: L.close,
        name: 'Close the Rift',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        cluesAtLocation: L.edge,
        advanceTiming: 'anytime',
      },
      {
        code: L.finding,
        name: 'Finding a New Way',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...LOST_ENCOUNTERS,
      ...DUNWICH_ENCOUNTER_SETS.sorcery,
      ...DUNWICH_ENCOUNTER_SETS.theBeyond,
      ...copies(conglomerationOfSpheres, 2),
      servantOfTheLurker,
      ...DUNWICH_ENCOUNTER_SETS.agentsOfYog,
    ],
    setAside: [yogSothoth],
    chaosBag: log ? [...DUNWICH_CHAOS_BAGS[difficulty]] : [...standaloneBag],
    tokenValues: {},
    setup: [{ type: 'SetScenarioMeta', key: 'lostStandalone', value: log ? 0 : 1 }],
  }
}
function locationChoice(card: EncounterLocationCard) {
  return { label: 'choice.location', params: { location: card.name } }
}
const explore = (investigator: string): AbilityOption => ({
  key: 'lost:explore',
  label: 'ability.lost.explore',
  actions: 1,
  provokes: true,
  then: [specific('lostExplore', { investigator })],
})
const movingOut = (s: GameState, id: string) => s.scenarioMeta?.[`lostRemoving:${id}`] === 1
function decay(s: GameState, location: string, investigator?: string): Message[] {
  const lead = investigator ?? leadInvestigator(s)?.id
  if (!lead || !s.locations[location] || movingOut(s, location)) return []
  return [
    {
      type: 'Ask',
      investigator: lead,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.lost.decay',
        promptParams: { location: s.locations[location]!.name },
        choices: [
          { label: 'choice.lost.doom', then: [specific('lostLocationDoom', { location })] },
          { label: 'choice.lost.discard', then: [{ type: 'RemoveLocation', location }] },
        ],
      },
    },
  ]
}
registerScenario({
  id: LOST_IN_TIME_AND_SPACE,
  canEnter: (s, i, _from, to) => printedCode(to) !== L.edge || controlledClues(s, i) >= 2,
  cannotDrawCards: (s, i) => s.phase === 'upkeep' && getInvestigator(s, i).location === L.edge,
  beforeMove: (s, m) => {
    const from = getInvestigator(s, m.investigator).location
    return from && printedCode(from) === L.steps
      ? [
          effectTest(m.investigator, "Steps of Y'hagharl", 'willpower', 2, {
            onSuccess: [{ ...m, checked: true }],
            onFail: [{ type: 'RemoveLocation', location: from, shuffleIntoEncounter: true }],
          }),
        ]
      : null
  },
  beforeRemoveLocation: (s, m) => {
    if (m.location === L.another) return []
    const moves: Message[] = activeInvestigators(s)
      .filter((i) => i.location === m.location)
      .map((i) => ({
        type: 'MoveTo',
        investigator: i.id,
        location: L.another,
        unpreventable: true,
        encounterEffect: true,
      }))
    const unengaged = Object.values(s.enemies)
      .filter((e) => e.location === m.location && !e.engagedWith)
      .map((e) => ({ type: 'MoveEnemy' as const, enemy: e.id, location: L.another }))
    return [
      specific('lostRemoving', { location: m.location, value: 1 }),
      ...moves,
      ...unengaged,
      m,
      specific('lostRemoving', { location: m.location, value: 0 }),
    ]
  },
  forced: (_s, t) =>
    t.type === 'afterMove' && t.encounterEffect ? [damage(t.investigator, 0, 1)] : [],
  tokenEffect: (s, t, i) => {
    const hard = s.difficulty === 'hard' || s.difficulty === 'expert'
    if (t === 'skull')
      return { modifier: -Math.min(hard ? Infinity : 5, extradimensional(s).length) }
    if (t === 'cultist') {
      const after: Message = {
        type: 'AfterCurrentSkillTest',
        then: [specific('lostMillLocation', { investigator: i, move: true, revelation: false })],
      }
      return {
        modifier: 0,
        revealAnother: true,
        ...(hard ? { immediate: [after] } : { onFail: [after] }),
      }
    }
    if (t === 'tablet') {
      const yog = Object.values(s.enemies).find((e) => e.code === L.yog)
      return {
        modifier: hard ? -5 : -3,
        ...(yog
          ? {
              after: [
                {
                  type: 'EnemyAttack' as const,
                  enemy: yog.id,
                  investigator: i,
                  exhaustAfter: false,
                  evenIfExhausted: true,
                },
              ],
            }
          : {}),
      }
    }
    if (t === 'elderThing') {
      const at = getInvestigator(s, i).location
      return {
        modifier: -(at ? shroudOf(s, at) : 0) * (hard ? 2 : 1),
        onFail: [specific('lostDiscardCurrent', { investigator: i })],
      }
    }
    return { modifier: 0 }
  },
  resolution: (s, o) => {
    const defeated = s.investigators.filter((i) => i.eliminated && !i.resigned)
    const n =
      o.type === 'resolution'
        ? o.resolution
        : s.actIndex === 3
          ? s.investigators.some((i) => i.resigned)
            ? 1
            : 2
          : 4
    const win = n !== 4,
      epilogue =
        s.scenarioMeta?.lostStandalone !== 1 && win
          ? s.campaignLog?.notes.includes(UN.warned)
            ? 'epilogue2'
            : s.campaignLog?.notes.includes(UN.calmed)
              ? 'epilogue1'
              : null
          : null
    return [
      ...(defeated.length
        ? [
            { type: 'Story' as const, entry: entry('defeated') },
            ...defeated.map((i) => ({ type: 'KillInvestigators' as const, investigator: i.id })),
          ]
        : []),
      ...(n === 1 && o.type !== 'resolution'
        ? [{ type: 'Story' as const, entry: entry('act4') }]
        : []),
      {
        type: 'Story',
        entry: entry(`resolution${n}`, [{ key: `story.lost.resolution${n}Effect` }]),
      },
      ...(n === 1
        ? [
            recordNote(LN.closed),
            { type: 'SufferTrauma' as const, physical: 2, mental: 2 },
            earnExperience(5, true),
          ]
        : n === 3
          ? [recordNote(LN.fled), { type: 'KillInvestigators' as const }]
          : n === 4
            ? [recordNote(WN.merged), { type: 'DriveDefeatedInsane' as const, all: true }]
            : []),
      recordNote(win ? 'campaignWon' : 'campaignLost'),
      ...(epilogue ? [{ type: 'Story' as const, entry: entry(epilogue) }] : []),
      endScenario(resolution(n)),
    ]
  },
  specific: (s, key, data) => {
    const id = String(data.investigator ?? leadInvestigator(s)?.id ?? s.investigators[0]!.id)
    if (key === 'lostExplore') {
      const discarded = s.encounterDeck.slice(0, 3),
        choices = discarded.filter((c): c is EncounterLocationCard => c.kind === 'location')
      const next = {
        ...s,
        encounterDeck: s.encounterDeck.slice(3),
        encounterDiscard: [...s.encounterDiscard, ...discarded],
      }
      return choices.length
        ? push(next, {
            type: 'Ask',
            investigator: id,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.lost.explore',
              choices: choices.map((c, n) => ({
                ...locationChoice(c),
                then: [
                  specific('lostFromDiscard', { investigator: id, code: c.code, occurrence: n }),
                ],
              })),
            },
          })
        : next
    }
    if (key === 'lostFromDiscard') {
      const index = s.encounterDiscard.findLastIndex(
          (c) => c.code === data.code && c.kind === 'location',
        ),
        card = s.encounterDiscard[index]
      return card?.kind === 'location'
        ? push(
            { ...s, encounterDiscard: s.encounterDiscard.filter((_, n) => n !== index) },
            { type: 'PutEncounterLocation', card, investigator: id },
          )
        : s
    }
    if (key === 'lostMillLocation') {
      const index = s.encounterDeck.findIndex((c) => c.kind === 'location'),
        card = s.encounterDeck[index]
      if (card?.kind !== 'location')
        return {
          ...s,
          encounterDiscard: [...s.encounterDiscard, ...s.encounterDeck],
          encounterDeck: [],
        }
      // Resolving a revelation is not drawing the card and never triggers Surge.
      return push(
        {
          ...s,
          encounterDeck: s.encounterDeck.slice(index + 1),
          encounterDiscard: [...s.encounterDiscard, ...s.encounterDeck.slice(0, index)],
        },
        {
          type: 'PutEncounterLocation',
          card,
          investigator: id,
          moveAfter: !!data.move,
          resolveRevelation: data.revelation !== false,
        },
      )
    }
    if (key === 'lostDiscardCurrent') {
      const location = getInvestigator(s, id).location
      return location && isExtradimensional(s, location)
        ? push(s, { type: 'RemoveLocation', location })
        : s
    }
    if (key === 'lostRemoving')
      return {
        ...s,
        scenarioMeta: { ...s.scenarioMeta, [`lostRemoving:${data.location}`]: Number(data.value) },
      }
    if (key === 'lostLocationDoom') {
      const location = String(data.location),
        l = s.locations[location]
      return l
        ? { ...s, locations: { ...s.locations, [location]: { ...l, doom: (l.doom ?? 0) + 1 } } }
        : s
    }
    if (key === 'lostShuffleEncounter') {
      const [encounterDeck, rng] = shuffle([...s.encounterDeck, ...s.encounterDiscard], s.rng)
      return { ...s, rng, encounterDeck, encounterDiscard: [] }
    }
    if (key === 'lostAgendaMemory') {
      if (s.scenarioMeta?.lostStandalone === 1) return s
      if (data.agenda === 1 && s.campaignLog?.notes.includes(DUNWICH_NOTES.studentsLost))
        return push(
          s,
          { type: 'Story', entry: entry('students') },
          ...activeInvestigators(s).map((i) => damage(i.id, 0, 1)),
        )
      const count = (s.campaignLog?.values[BN.sacrificed] ?? '').split(',').filter(Boolean).length
      return data.agenda === 2 && count > 0
        ? push(
            s,
            { type: 'Story', entry: entry('sacrificed') },
            ...activeInvestigators(s).map((i) =>
              effectTest(i.id, 'The Price of Failure', 'willpower', count, {
                onFailEach: [damage(i.id, 1)],
              }),
            ),
          )
        : s
    }
    if (key === 'lostSpawnYog') {
      const card = s.setAside.find((c) => c.code === L.yog)
      return card?.kind === 'enemy'
        ? push(
            { ...s, setAside: s.setAside.filter((c) => c.code !== L.yog) },
            {
              type: 'SpawnEnemy',
              card,
              location: s.locations[L.edge] ? L.edge : L.another,
              engageWith: null,
            },
          )
        : s
    }
    if (key === 'lostMadness') {
      const i = getInvestigator(s, id),
        index = i.discard.findLastIndex((c) => playerCardDef(c)?.traits.includes('Madness')),
        card = i.discard[index]
      return card
        ? push(
            {
              ...s,
              investigators: s.investigators.map((a) =>
                a.id === id
                  ? {
                      ...a,
                      discard: a.discard.filter((_, n) => n !== index),
                      deck: [card, ...a.deck],
                    }
                  : a,
              ),
            },
            { type: 'DrawCards', investigator: id, amount: 1 },
          )
        : s
    }
    if (key === 'lostHex') {
      const card = [...s.encounterDiscard].reverse().find((c) => c.traits?.includes('Hex'))
      return card
        ? push(s, { type: 'DrawFromEncounterDiscard', investigator: id, code: card.code })
        : s
    }
    if (key === 'lostDoorway') {
      const location = String(data.location),
        i = getInvestigator(s, id)
      const leave: Message = { type: 'RemoveLocation', location, shuffleIntoEncounter: true }
      return i.resources >= 2
        ? push(s, {
            type: 'Ask',
            investigator: id,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.lost.doorway',
              choices: [
                {
                  label: 'choice.lost.resources',
                  then: [{ type: 'LoseResources', investigator: id, amount: 2 }],
                },
                { label: 'choice.lost.shuffle', then: [leave] },
              ],
            },
          })
        : push(s, leave)
    }
    if (key === 'lostYogHorror')
      return push(
        s,
        {
          type: 'ReduceEnemyAttackHorror',
          enemy: String(data.enemy),
          investigator: id,
          amount: Number(data.amount),
        },
        { type: 'MillDeck', investigator: id, amount: Number(data.amount) },
        specific('lostYogEmpty', { investigator: id }),
      )
    if (key === 'lostYogEmpty')
      return getInvestigator(s, id).deck.length === 0
        ? push(s, { type: 'DriveInvestigatorInsane', investigator: id })
        : s
    return s
  },
})
for (const code of [L.out, L.beyond, L.close, L.finding])
  registerAct({
    code,
    abilities: (_s, _a, i) => [explore(i)],
    ...(code === L.finding
      ? {
          objectiveMet: (s: GameState) =>
            s.investigators.some((i) => i.resigned) && activeInvestigators(s).length === 0,
        }
      : {}),
    ...(code === L.beyond
      ? {
          forced: (
            _s: GameState,
            t: Parameters<NonNullable<import('@lcg/engine').ActBehavior['forced']>>[1],
          ): Message[] =>
            t.type === 'whenEnterLocation' && t.location === L.edge ? [{ type: 'AdvanceAct' }] : [],
        }
      : {}),
    onAdvance: () => [
      {
        type: 'Story',
        entry: entry(
          code === L.out ? 'act1' : code === L.beyond ? 'act2' : code === L.close ? 'act3' : 'act4',
        ),
      },
      ...(code === L.out
        ? [{ type: 'PutLocationIntoPlay' as const, location: L.edge }]
        : code === L.close
          ? [
              { type: 'RemoveLocation' as const, location: L.edge },
              { type: 'PutLocationIntoPlay' as const, location: L.time },
            ]
          : code === L.finding
            ? [{ type: 'EndScenario' as const, outcome: resolution(1) }]
            : []),
    ],
  })
for (const [code, n] of [
  [L.all, 1],
  [L.past, 2],
  [L.breaking, 3],
] as const)
  registerAgenda({
    code,
    onAdvance: () => [
      { type: 'Story', entry: entry(`agenda${n}`) },
      ...(n < 3
        ? [
            specific('lostShuffleEncounter'),
            specific('lostMillLocation'),
            specific('lostAgendaMemory', { agenda: n }),
          ]
        : [specific('lostSpawnYog')]),
    ],
  })
registerAgenda({
  code: L.end,
  forced: (_s, t) =>
    t.type === 'enemyDefeated' && t.enemy.code === L.yog
      ? [{ type: 'EndScenario', outcome: resolution(3) }]
      : [],
  repeats: true,
  onAdvance: (s) => {
    const yog = Object.values(s.enemies).find((e) => e.code === L.yog)
    return [
      { type: 'Story', entry: entry('agenda4') },
      ...(yog
        ? activeInvestigators(s).map((i) => ({
            type: 'EnemyAttack' as const,
            enemy: yog.id,
            investigator: i.id,
            exhaustAfter: false,
            evenIfExhausted: true,
          }))
        : []),
    ]
  },
})
registerLocation({ code: L.another })
registerLocation({ code: L.edge })
registerLocation({
  code: L.time,
  abilities: (s, l, i) =>
    controlledClues(s, i) >= 2
      ? [
          {
            key: `${l.id}:resign`,
            label: 'ability.lost.resign',
            actions: 1,
            provokes: false,
            costs: [{ type: 'SpendClues', investigator: i, amount: 2 }],
            then: [{ type: 'Resign', investigator: i }],
          },
        ]
      : [],
})
registerLocation({
  code: L.space,
  forced: (s, t, l) => (t.type === 'roundEnds' ? decay(s, l.id) : []),
})
registerLocation({
  code: L.cascade,
  revelation: (_s, _l, i) => [{ type: 'DiscardRandomFromHand', investigator: i, amount: 1 }],
  forced: (_s, t, l) =>
    t.type === 'locationCluesRemoved' && t.location === l.id && l.clues === 0
      ? [{ type: 'RemoveLocation', location: l.id }]
      : [],
})
registerLocation({
  code: L.bridge,
  revelation: (_s, _l, i) => [{ type: 'LoseResources', investigator: i, amount: 2 }],
  forced: (s, t, l) =>
    t.type === 'afterMove' && t.from === l.id ? decay(s, l.id, t.investigator) : [],
})
registerLocation({
  code: L.steps,
  revelation: (_s, _l, i) => [specific('lostMadness', { investigator: i })],
})
registerLocation({
  code: L.doorway,
  revelation: (_s, _l, i) => [specific('lostHex', { investigator: i })],
  forced: (s, t, l) =>
    t.type === 'turnEnds' && getInvestigator(s, t.investigator).location === l.id
      ? [specific('lostDoorway', { investigator: t.investigator, location: l.id })]
      : [],
})
