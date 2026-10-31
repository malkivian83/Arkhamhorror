import {
  activeInvestigators,
  controlledClues,
  getInvestigator,
  leadInvestigator,
  nextInt,
  push,
  recomputeConnections,
  registerAct,
  registerAgenda,
  registerLocation,
  registerScenario,
  shuffle,
  type AbilityOption,
  type CampaignLog,
  type Difficulty,
  type GameState,
  type Location,
  type LocationCard,
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
  treachery,
} from '../scenario-helpers'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { DUNWICH_CHAOS_BAGS } from './campaign'
import { DUNWICH_ENCOUNTER_SETS } from './encounter-sets'
import { avianFight, HOUSE_SETS } from './house-encounters'
import { DUNWICH_COUNTRY } from './altar-encounters'
import { B, BN } from './altar-codes'
import { H } from './house-codes'
import { broodOfYogSothoth } from './brood-of-yog-sothoth'
import { UNSEEN_ENCOUNTERS } from './unseen-encounters'
import { U, UN, UNDIMENSIONED_AND_UNSEEN } from './unseen-codes'
import {
  broods,
  unseenEnemyChoice,
  unseenWeaknessPool,
  unseenSpecific as specific,
} from './unseen-helpers'
import { FIXED_CLUE_LOCATIONS } from './fixed-clues'
export { U, UN, UNDIMENSIONED_AND_UNSEEN } from './unseen-codes'
export { UNSEEN_ENCOUNTERS } from './unseen-encounters'
const entry = storyEntries('unseen')
const pairs = [
  [U.villageHounds, U.villageLure],
  [U.glenClues, U.glenRandom],
  [U.meadowRain, U.meadowBait],
  [U.heathClues, U.heathDamage],
  [U.ruinsPaint, U.ruinsMove],
  [U.yardFog, U.yardMud],
]
const positions: Record<string, [number, number]> = {
  circle: [0, 0],
  triangle: [0, -2],
  diamond: [2, -1],
  square: [-2, 1],
  cross: [2, 1],
  hourglass: [0, 2],
}
const room = (
  id: string,
  name: string,
  shroud: number,
  clues: number,
  symbol: string,
  connectsTo: string[],
): LocationCard => ({
  id,
  name,
  shroud,
  clueValue: clues,
  cluesPerInvestigator: !FIXED_CLUE_LOCATIONS.has(id),
  symbol,
  connectsTo,
  connections: [],
  position: positions[symbol]!,
})
export const UNSEEN_LOCATIONS = {
  villageHounds: room(U.villageHounds, 'Dunwich Village', 3, 1, 'circle', [
    'triangle',
    'square',
    'diamond',
  ]),
  villageLure: room(U.villageLure, 'Dunwich Village', 2, 3, 'circle', [
    'triangle',
    'square',
    'diamond',
  ]),
  glenClues: room(U.glenClues, 'Cold Spring Glen', 3, 2, 'triangle', [
    'circle',
    'diamond',
    'cross',
  ]),
  glenRandom: room(U.glenRandom, 'Cold Spring Glen', 2, 0, 'triangle', [
    'circle',
    'diamond',
    'cross',
  ]),
  meadowRain: room(U.meadowRain, 'Ten-Acre Meadow', 3, 1, 'diamond', [
    'circle',
    'triangle',
    'cross',
  ]),
  meadowBait: room(U.meadowBait, 'Ten-Acre Meadow', 2, 3, 'diamond', [
    'circle',
    'triangle',
    'cross',
  ]),
  heathClues: room(U.heathClues, 'Blasted Heath', 4, 3, 'square', ['circle', 'hourglass']),
  heathDamage: room(U.heathDamage, 'Blasted Heath', 3, 2, 'square', ['circle', 'hourglass']),
  ruinsPaint: room(U.ruinsPaint, 'Whateley Ruins', 3, 2, 'cross', [
    'triangle',
    'diamond',
    'hourglass',
  ]),
  ruinsMove: room(U.ruinsMove, 'Whateley Ruins', 2, 2, 'cross', [
    'triangle',
    'diamond',
    'hourglass',
  ]),
  yardFog: room(U.yardFog, "Devil's Hop Yard", 1, 2, 'hourglass', ['square', 'cross']),
  yardMud: room(U.yardMud, "Devil's Hop Yard", 2, 1, 'hourglass', ['square', 'cross']),
}
const at = (s: GameState, i: string) => getInvestigator(s, i).location
const localActors = (s: GameState, l: string) =>
  activeInvestigators(s).filter((i) => i.location === l)
const abominations = (s: GameState, l?: string) =>
  Object.values(s.enemies).filter(
    (e) => e.traits?.includes('Abomination') && (!l || e.location === l),
  )
const groupUsed = (s: GameState, l: string) => s.scenarioMeta?.[`unseenUsed:${l}`] === 1
const withData = (
  data: Record<string, string | number | boolean>,
  more: Record<string, string | number | boolean>,
) => ({ ...data, ...more })
export function undimensionedAndUnseen({
  difficulty = 'standard',
  log,
}: { difficulty?: Difficulty; log?: CampaignLog } = {}): ScenarioDefinition {
  return {
    id: UNDIMENSIONED_AND_UNSEEN,
    intro: entry('intro'),
    setupInstructions: entry('setup'),
    locations: [UNSEEN_LOCATIONS.villageHounds],
    setAsideLocations: Object.values(UNSEEN_LOCATIONS).filter((l) => l.id !== U.villageHounds),
    startingLocation: U.villageHounds,
    agendas: [
      { code: U.rampaging, name: 'Rampaging Creatures', doomThreshold: 5 },
      { code: U.biding, name: 'Biding Its Time', doomThreshold: 6 },
      { code: U.horrors, name: 'Horrors Unleashed', doomThreshold: 7 },
    ],
    acts: [
      {
        code: U.script,
        name: 'Saracenic Script',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      {
        code: U.destroyed,
        name: 'They Must Be Destroyed!',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...UNSEEN_ENCOUNTERS,
      ...DUNWICH_ENCOUNTER_SETS.whippoorwills,
      ...HOUSE_SETS.abominations,
      ...DUNWICH_COUNTRY,
      ...ENCOUNTER_SETS.strikingFear,
    ],
    setAside: [
      ...copies(broodOfYogSothoth, 5),
      ...copies(
        treachery({ code: U.formula, name: 'Esoteric Formula', traits: ['Spell'], keywords: [] }),
        4,
      ),
    ],
    chaosBag: [...DUNWICH_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      {
        type: 'Story',
        entry: entry('decision'),
        choices: [
          {
            label: 'choice.unseen.calm',
            then: [recordNote(UN.calmed), { type: 'Story', entry: entry('part1') }],
          },
          {
            label: 'choice.unseen.warn',
            then: [recordNote(UN.warned), { type: 'Story', entry: entry('part2') }],
          },
        ],
      },
      specific('unseenSetup', { standalone: !log }),
      ...(log ? [specific('unseenWeaknesses')] : []),
      specific('unseenPowder'),
    ],
  }
}
registerScenario({
  id: UNDIMENSIONED_AND_UNSEEN,
  skillModifier: (s, t) =>
    pairs[4]!.some((code) => code === at(s, t.investigator)) && t.skill === 'willpower' ? -1 : 0,
  enemyStat: (s, e, stat, source) =>
    (e.code === H.avian && stat === 'fight' ? avianFight(s, source) : 0) +
    (pairs[1]!.some((code) => code === e.location) && stat === 'evade' ? -1 : 0) +
    (s.agendaIndex === 2 && e.traits?.includes('Abomination') ? 1 : 0),
  forced: (s, t) =>
    t.type === 'enemyPhaseEnds'
      ? broods(s).map((e) => specific('unseenRandom', { purpose: 'move', enemy: e.id }))
      : t.type === 'roundEnds'
        ? Object.entries(s.scenarioMeta ?? {})
            .filter(([key]) => key.startsWith('unseenRain:'))
            .flatMap(([key]) => [
              {
                type: 'MoveClues' as const,
                from: { type: 'enemy' as const, id: key.slice('unseenRain:'.length) },
                to: { type: 'pool' as const },
                amount: 1,
              },
              specific('unseenClearMeta', { key }),
            ])
        : [],
  tokenEffect: (s, t, i) => {
    const hard = s.difficulty === 'hard' || s.difficulty === 'expert',
      test = s.skillTest,
      target =
        test && (test.kind.type === 'fight' || test.kind.type === 'evade')
          ? s.enemies[test.kind.enemy]
          : undefined
    return t === 'skull'
      ? { modifier: -broods(s).length * (hard ? 2 : 1) }
      : t === 'cultist'
        ? { modifier: 0, revealAnother: true, onFail: [damage(i, hard ? 1 : 0, 1)] }
        : t === 'tablet'
          ? { modifier: 0, immediate: [specific('unseenTablet', { investigator: i, hard })] }
          : t === 'elderThing'
            ? {
                modifier: hard ? -5 : -3,
                ...(target?.code === U.brood
                  ? {
                      immediate: [
                        {
                          type: 'EnemyAttack' as const,
                          enemy: target.id,
                          investigator: i,
                          exhaustAfter: false,
                          evenIfExhausted: true,
                        },
                      ],
                    }
                  : {}),
              }
            : { modifier: 0 }
  },
  resolution: (s, o) => {
    const n = o.type === 'resolution' ? o.resolution : 1,
      escaped = n === 2 ? 0 : broods(s).length + s.setAside.filter((c) => c.code === U.brood).length
    return [
      specific('unseenFinish', { escaped }),
      {
        type: 'Story',
        entry: entry(`resolution${n}`, [
          { key: 'story.unseen.escapedEffect', params: { amount: escaped } },
          { key: 'story.effect.experience', params: { bonus: 0 } },
        ]),
      },
      earnExperience(0, true),
      endScenario(resolution(n)),
    ]
  },
  specific: (s, key, data) => {
    const investigator = String(
      data.investigator ?? s.activeTurn ?? leadInvestigator(s)?.id ?? s.investigators[0]!.id,
    )
    if (key === 'unseenSetup') {
      let rng = s.rng
      const selected: string[] = []
      for (const pair of pairs) {
        const [cards, r] = shuffle(pair, rng)
        rng = r
        selected.push(cards[0]!)
      }
      const locations: typeof s.locations = {}
      selected.forEach((id) => {
        const card = Object.values(UNSEEN_LOCATIONS).find((l) => l.id === id)!
        locations[id] = { ...card, connections: [], revealed: false, clues: 0 }
      })
      const sacrificed = data.standalone
          ? 3
          : (s.campaignLog?.values[BN.sacrificed] ?? '').split(',').filter(Boolean).length,
        total = sacrificed >= 4 ? 2 : sacrificed === 3 ? 3 : sacrificed === 2 ? 4 : 5,
        initial = sacrificed >= 4 ? 0 : sacrificed <= 1 ? 2 : 1
      const next = recomputeConnections({
        ...s,
        scenarioMeta: {
          ...s.scenarioMeta,
          ...(data.standalone ? { unseenStandaloneArmitage: 1 } : {}),
        },
        rng,
        locations,
        setAsideLocations: {},
        investigators: s.investigators.map((i) => ({ ...i, location: selected[0]! })),
        acts: s.acts.map((a, n) => (n === 0 ? { ...a, cluesAtLocation: selected[4]! } : a)),
        setAside: [
          ...copies(broodOfYogSothoth, total - initial),
          ...s.setAside.filter((c) => c.code !== U.brood),
        ],
      })
      return push(
        next,
        {
          type: 'RevealLocation',
          location: selected[0]!,
          investigator: leadInvestigator(s)?.id ?? s.investigators[0]!.id,
        },
        ...(initial
          ? [
              {
                type: 'SpawnEnemy' as const,
                card: broodOfYogSothoth,
                location: selected[1]!,
                engageWith: null,
              },
            ]
          : []),
        ...(initial === 2
          ? [
              {
                type: 'SpawnEnemy' as const,
                card: broodOfYogSothoth,
                location: selected[3]!,
                engageWith: null,
              },
            ]
          : []),
      )
    }
    if (key === 'unseenWeaknesses') {
      const pool = unseenWeaknessPool(s)
      if (!pool.length) return s
      let rng = s.rng
      const messages: Message[] = []
      for (const i of s.investigators) {
        const [n, r] = nextInt(rng, pool.length)
        rng = r
        const code = pool[n]!
        pool.splice(n, 1)
        messages.push(
          { type: 'AddStoryAsset', investigator: i.id, code },
          { type: 'PlaceOnDeck', investigator: i.id, code, where: 'top' },
          { type: 'ShuffleDeck', investigator: i.id },
        )
      }
      return push({ ...s, rng }, ...messages)
    }
    if (key === 'unseenPowder')
      return push(
        s,
        ...s.investigators
          .filter((i) => i.deck.includes(B.powder))
          .map((i): Message => ({
            type: 'Ask',
            investigator: i.id,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.unseen.powder',
              choices: [
                {
                  label: 'choice.unseen.powder',
                  then: [
                    { type: 'TakeFromDeck', investigator: i.id, code: B.powder, to: 'hand' },
                    { type: 'PutAssetIntoPlay', investigator: i.id, code: B.powder },
                    specific('unseenRemoveHand', { investigator: i.id, code: B.powder }),
                    { type: 'ShuffleDeck', investigator: i.id },
                  ],
                },
                { label: 'choice.skip', then: [] },
              ],
            },
          })),
      )
    if (key === 'unseenRemoveHand')
      return {
        ...s,
        investigators: s.investigators.map((i) =>
          i.id === investigator ? { ...i, hand: i.hand.filter((c) => c !== data.code) } : i,
        ),
      }
    if (key === 'unseenRandom') {
      if (data.purpose === 'spawn' && !s.setAside.some((c) => c.code === U.brood)) return s
      if (data.purpose === 'move' && !s.enemies[String(data.enemy)]) return s
      const ids = Object.keys(s.locations).filter((id) => id !== data.exclude),
        [n, rng] = nextInt(s.rng, ids.length),
        location = ids[n]!
      const next = { ...s, rng }
      const actors = location === U.glenRandom ? localActors(s, location) : []
      const continuation = specific('unseenRandomDone', withData(data, { location }))
      return actors.length
        ? push(next, {
            type: 'Ask',
            investigator: actors[0]!.id,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.unseen.randomGlen',
              choices: [
                ...actors.map((i) => ({
                  label: 'choice.investigator',
                  params: { name: i.name },
                  then: [
                    effectTest(i.id, 'Cold Spring Glen', 'agility', 3, {
                      onSuccess: [specific('unseenRandom', withData(data, { exclude: location }))],
                      onFail: [continuation],
                    }),
                  ],
                })),
                { label: 'choice.skip', then: [continuation] },
              ],
            },
          })
        : push(next, continuation)
    }
    if (key === 'unseenRandomDone') {
      const location = String(data.location)
      if (data.purpose === 'move')
        return push(s, {
          type: 'HuntOnce',
          enemy: String(data.enemy),
          toward: location,
          attack: false,
        })
      return push(s, specific('unseenSpawn', { location }))
    }
    if (key === 'unseenSpawn') {
      const n = s.setAside.findIndex((c) => c.code === U.brood)
      if (n < 0) return s
      return push(
        { ...s, setAside: s.setAside.filter((_, i) => i !== n) },
        {
          type: 'SpawnEnemy',
          card: broodOfYogSothoth,
          location: String(data.location),
          engageWith: null,
        },
        ...(data.ambush ? [specific('unseenAmbush', { location: String(data.location) })] : []),
      )
    }
    if (key === 'unseenAmbush') {
      const location = String(data.location),
        e = broods(s)
          .filter((e) => e.location === location)
          .at(-1)
      if (!e) return s
      return push(
        s,
        ...localActors(s, location).map((i) =>
          effectTest(i.id, 'Biding Its Time', 'agility', 4, {
            onFail: [
              {
                type: 'EnemyAttack',
                enemy: e.id,
                investigator: i.id,
                exhaustAfter: false,
                evenIfExhausted: true,
              },
            ],
          }),
        ),
      )
    }
    if (key === 'unseenShuffle') {
      const [encounterDeck, rng] = shuffle([...s.encounterDeck, ...s.encounterDiscard], s.rng)
      return { ...s, rng, encounterDeck, encounterDiscard: [] }
    }
    if (key === 'unseenFormula') {
      let left = s.investigators.length
      const setAside = s.setAside.filter((c) => {
        if (c.code !== U.formula || left <= 0) return true
        left--
        return false
      })
      return push(
        { ...s, setAside },
        ...s.investigators.map((i): Message => ({
          type: 'PutAssetIntoPlay',
          investigator: i.id,
          code: U.formula,
        })),
      )
    }
    if (key === 'unseenTablet')
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.unseen.tablet',
          choices: [
            ...broods(s)
              .filter((e) => (e.clues ?? 0) > 0)
              .map((e) => ({
                ...unseenEnemyChoice(s, e),
                label: 'choice.unseen.removeClues',
                then: [
                  {
                    type: 'MoveClues' as const,
                    from: { type: 'enemy' as const, id: e.id },
                    to: { type: 'pool' as const },
                    amount: e.clues ?? 0,
                  },
                ],
              })),
            {
              label: data.hard ? 'choice.unseen.autoFail' : 'choice.unseen.minusFour',
              then: [specific('unseenTabletPenalty', { hard: !!data.hard })],
            },
          ],
        },
      })
    if (key === 'unseenTabletPenalty')
      return s.skillTest
        ? {
            ...s,
            skillTest: {
              ...s.skillTest,
              ...(data.hard
                ? { autoFail: true }
                : { tokenModifier: s.skillTest.tokenModifier - 4 }),
            },
          }
        : s
    if (key === 'unseenChooseMove')
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEnemy',
          choices: broods(s).map((e) => ({
            ...unseenEnemyChoice(s, e),
            then: data.toward
              ? [{ type: 'HuntOnce', enemy: e.id, toward: String(data.toward), attack: false }]
              : [specific('unseenMoveDirection', { enemy: e.id, investigator })],
          })),
        },
      })
    if (key === 'unseenMoveDirection') {
      const e = s.enemies[String(data.enemy)]
      if (!e) return s
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseLocation',
          choices: s.locations[e.location]!.connections.map((id) => ({
            label: 'choice.location',
            params: { location: s.locations[id]!.name },
            then: [
              { type: 'MoveEnemy', enemy: e.id, location: id },
              { type: 'CheckEngagement', location: id },
            ],
          })),
        },
      })
    }
    if (key === 'unseenClueStart') {
      const location = String(data.location),
        mode = String(data.mode)
      return push(
        { ...s, scenarioMeta: { ...s.scenarioMeta, [`unseenUsed:${location}`]: 1 } },
        ...(mode === 'each'
          ? localActors(s, location).map((i) =>
              specific('unseenEachClue', { investigator: i.id, location }),
            )
          : [
              {
                type: 'Ask' as const,
                investigator,
                question: {
                  kind: 'chooseOne' as const,
                  prompt: 'prompt.chooseEnemy',
                  choices: abominations(s, data.global ? undefined : location).map((e) => ({
                    ...unseenEnemyChoice(s, e),
                    then:
                      mode === 'rain'
                        ? [
                            {
                              type: 'MoveClues' as const,
                              from: { type: 'pool' as const },
                              to: { type: 'enemy' as const, id: e.id },
                              amount: 1,
                            },
                            {
                              type: 'SetScenarioMeta' as const,
                              key: `unseenRain:${e.id}`,
                              value: s.round,
                            },
                          ]
                        : [
                            specific(
                              'unseenClueAmount',
                              withData(data, { enemy: e.id, investigator }),
                            ),
                          ],
                  })),
                },
              },
            ]),
      )
    }
    if (key === 'unseenEachClue') {
      if (
        controlledClues(s, investigator) <= 0 ||
        at(s, investigator) !== data.location ||
        !abominations(s, String(data.location)).length
      )
        return s
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.unseen.clue',
          choices: [
            ...abominations(s, String(data.location)).map((e) => ({
              ...unseenEnemyChoice(s, e),
              then: [
                {
                  type: 'MoveControlledClues' as const,
                  investigator,
                  to: { type: 'enemy' as const, id: e.id },
                  amount: 1,
                },
              ],
            })),
            { label: 'choice.skip', then: [] },
          ],
        },
      })
    }
    if (key === 'unseenClueAmount') {
      const actors = localActors(s, String(data.location)).filter(
          (i) => controlledClues(s, i.id) > 0,
        ),
        personal = data.mode === 'single',
        total = personal
          ? Math.max(0, ...actors.map((i) => controlledClues(s, i.id)))
          : actors.reduce((n, i) => n + controlledClues(s, i.id), 0),
        max = Math.min(Number(data.max), total)
      if (personal && !data.donor)
        return push(s, {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.unseen.donor',
            choices: actors.map((i) => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [specific('unseenClueAmount', withData(data, { donor: i.id }))],
            })),
          },
        })
      const limit = data.donor ? Math.min(max, controlledClues(s, String(data.donor))) : max
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.unseen.amount',
          choices: Array.from({ length: limit + 1 }, (_, amount) => ({
            label: 'choice.unseen.amount',
            params: { amount },
            then: [specific('unseenDonate', withData(data, { remaining: amount }))],
          })),
        },
      })
    }
    if (key === 'unseenDonate') {
      if (Number(data.remaining) <= 0) return s
      const actors = localActors(s, String(data.location)).filter(
        (i) => controlledClues(s, i.id) > 0 && (!data.donor || i.id === data.donor),
      )
      if (!actors.length) return s
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.unseen.donor',
          choices: actors.map((i) => ({
            label: 'choice.investigator',
            params: { name: i.name },
            then: [
              {
                type: 'MoveControlledClues',
                investigator: i.id,
                to: { type: 'enemy', id: String(data.enemy) },
                amount: 1,
              },
              specific('unseenDonate', withData(data, { remaining: Number(data.remaining) - 1 })),
            ],
          })),
        },
      })
    }
    if (key === 'unseenClearMeta') {
      const meta = { ...s.scenarioMeta }
      delete meta[String(data.key)]
      return { ...s, scenarioMeta: meta }
    }
    if (key === 'unseenFinish') {
      const log = s.campaignLog
      return log
        ? {
            ...s,
            campaignLog: {
              ...log,
              values: { ...log.values, [UN.escaped]: String(data.escaped) },
              investigators: Object.fromEntries(
                Object.entries(log.investigators).map(([id, r]) => [
                  id,
                  { ...r, storyAssets: r.storyAssets.filter((c) => c !== B.powder) },
                ]),
              ),
            },
          }
        : s
    }
    return s
  },
})
registerAct({
  code: U.script,
  onAdvance: (s) => {
    const sacrificed =
      s.scenarioMeta?.unseenStandaloneArmitage === 1 ||
      (s.campaignLog?.values[BN.sacrificed] ?? '').split(',').includes(H.armitage)
    return [
      {
        type: 'Story',
        entry: entry(sacrificed ? 'formulaWithoutArmitage' : 'formulaWithArmitage'),
      },
      specific('unseenFormula'),
      ...(sacrificed ? [{ type: 'PlaceDoom' as const, amount: 1 }] : []),
    ]
  },
})
registerAct({
  code: U.destroyed,
  objectiveMet: (s) => broods(s).length === 0 && !s.setAside.some((c) => c.code === U.brood),
  onAdvance: () => [{ type: 'EndScenario', outcome: resolution(2) }],
})
registerAgenda({
  code: U.rampaging,
  onAdvance: () => [specific('unseenShuffle'), specific('unseenRandom', { purpose: 'spawn' })],
})
registerAgenda({
  code: U.biding,
  onAdvance: (s) => [
    specific('unseenShuffle'),
    ...(s.setAside.some((c) => c.code === U.brood)
      ? [
          { type: 'Story' as const, entry: entry('storm') },
          specific('unseenSpawn', { location: leadInvestigator(s)!.location!, ambush: true }),
        ]
      : []),
  ],
})
registerAgenda({
  code: U.horrors,
  onAdvance: () => [{ type: 'EndScenario', outcome: resolution(1) }],
})
const clueAbility = (
  s: GameState,
  l: Location,
  i: string,
  mode: string,
  max: number,
  global = false,
): AbilityOption[] =>
  groupUsed(s, l.id) ||
  !abominations(s, global ? undefined : l.id).length ||
  (mode !== 'rain' && !localActors(s, l.id).some((i) => controlledClues(s, i.id) > 0))
    ? []
    : [
        {
          key: `${l.id}:clue`,
          label: `ability.unseen.${mode}`,
          params: { amount: max },
          actions: 0,
          provokes: false,
          then: [
            specific('unseenClueStart', { location: l.id, investigator: i, mode, max, global }),
          ],
        },
      ]
for (const code of [U.villageHounds, U.villageLure])
  registerLocation({
    code,
    abilities: (s, l, i) => [
      {
        key: `${l.id}:resign`,
        label: 'action.resign',
        actions: 1,
        provokes: false,
        then: [{ type: 'Resign', investigator: i }],
      },
      ...(code === U.villageHounds
        ? clueAbility(s, l, i, 'single', 1, true)
        : broods(s).length
          ? [
              {
                key: `${l.id}:lure`,
                label: 'ability.unseen.lure',
                actions: 1,
                provokes: true,
                then: [specific('unseenChooseMove', { investigator: i, toward: l.id })],
              },
            ]
          : []),
    ],
  })
for (const [code, mode, max] of [
  [U.glenClues, 'group', 2],
  [U.meadowRain, 'rain', 1],
  [U.meadowBait, 'each', 1],
  [U.heathClues, 'group', 2],
  [U.ruinsPaint, 'single', 3],
  [U.yardFog, 'single', 2],
  [U.yardMud, 'each', 1],
] as const)
  registerLocation({ code, abilities: (s, l, i) => clueAbility(s, l, i, mode, max) })
registerLocation({
  code: U.heathDamage,
  forced: (_s, t, self) =>
    t.type === 'turnEnds' &&
    _s.investigators.some((i) => i.id === t.investigator && i.location === self.id)
      ? [damage(t.investigator, 1)]
      : [],
})
registerLocation({
  code: U.ruinsMove,
  abilities: (s, _l, i) =>
    broods(s).length
      ? [
          {
            key: 'unseen:move',
            label: 'ability.unseen.move',
            actions: 1,
            provokes: true,
            then: [
              effectTest(i, 'Whateley Ruins', 'intellect', 4, {
                onSuccess: [specific('unseenChooseMove', { investigator: i })],
              }),
            ],
          },
        ]
      : [],
})
