import { classicSearch } from './encounter-search'
import type { ScenarioDefinition } from '@lcg/engine'
/** Revised guide pp. 4–5; original cards 01120–01141, without Return To. */
import {
  playerCardDef,
  activeInvestigators,
  controlledClues,
  spendableClues,
  getInvestigator,
  leadInvestigator,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerScenario,
  seedRng,
  shuffle,
  totalDoom,
  type EnemyCard,
  type LocationCard,
  type Message,
  type GameState,
  type AbilityOption,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import {
  damage,
  earnExperience,
  endScenario,
  effectTest,
  resignAbility,
  storyEntries,
} from '../scenario-helpers'
import { nearestEnemyChoice } from '../nearest-choice'
import { ENCOUNTER_SETS, encounterSpecific } from '../the-path-to-carcosa/encounter-sets'
import data from './classic-data.json'
import './classic-encounters'
import { ghoulPriest, ZEALOT_NOTES } from './the-gathering'
import { ZEALOT_CHAOS_BAGS } from './campaign'
export const MIDNIGHT = 'the-midnight-masks'
export const CULTISTS = ['01137', '01138', '01139', '01140', '01141', '01121b']
export const classicEnemies = data.enemies as Record<string, EnemyCard>
const specific = (key: string, data: Record<string, string | number | boolean> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
export const maskedHunterBlocksClues = (s: GameState, i: string) =>
  Object.values(s.enemies).some((e) => e.code === '01121b' && e.engagedWith === i)
const entry = storyEntries('midnightMasks')
const spawnAt: Record<string, string> = {
  '01137': 'downtown',
  '01138': '01133',
  '01139': '01129',
  '01140': '01134',
  '01141': '01128',
}
const groups: Record<string, string> = {
  '01124': 'house',
  '01125': 'river',
  '01126': 'south',
  '01127': 'south',
  '01128': 'hospital',
  '01129': 'university',
  '01130': 'downtown',
  '01131': 'downtown',
  '01132': 'east',
  '01133': 'graveyard',
  '01134': 'north',
}
const links: Record<string, string[]> = {
  house: ['river'],
  river: ['east', 'university', 'south', 'house', 'graveyard'],
  south: ['university', 'hospital', 'river'],
  hospital: ['university', 'south'],
  university: ['north', 'hospital', 'river', 'south'],
  downtown: ['east', 'north'],
  east: ['river', 'downtown'],
  graveyard: ['river'],
  north: ['university', 'downtown'],
}
const rawRooms: [string, string, number, number, number?][] = [
  ['01124', 'Your House', 2, 1],
  ['01125', 'Rivertown', 1, 1],
  ['01126', 'Southside', 3, 1],
  ['01127', 'Southside', 2, 1],
  ['01128', "St. Mary's Hospital", 2, 1],
  ['01129', 'Miskatonic University', 4, 2, 1],
  ['01130', 'Downtown', 3, 1],
  ['01131', 'Downtown', 4, 2, 1],
  ['01132', 'Easttown', 2, 1],
  ['01133', 'Graveyard', 1, 2, 1],
  ['01134', 'Northside', 3, 2, 1],
]
export function theMidnightMasks({
  difficulty,
  log,
  seed,
  investigators,
}: ScenarioContext): ScenarioDefinition {
  let rng = seedRng(seed)
  const [south, r1] = shuffle(['01126', '01127'], rng)
  rng = r1
  const [downtown, r2] = shuffle(['01130', '01131'], rng)
  rng = r2
  const [cultists] = shuffle(
    CULTISTS.filter((c) => c !== '01121b'),
    rng,
  )
  const burned = log.notes.includes(ZEALOT_NOTES.houseBurned)
  const chosen = rawRooms.filter(
    ([c]) =>
      !(c === '01124' && burned) &&
      !(['01126', '01127'].includes(c) && c !== south[0]) &&
      !(['01130', '01131'].includes(c) && c !== downtown[0]),
  )
  const locations: LocationCard[] = chosen.map(([id, name, shroud, clueValue, victory]) => ({
    id,
    name,
    shroud,
    clueValue,
    cluesPerInvestigator: true,
    traits: ['Arkham'],
    ...(victory ? { victory } : {}),
    connections: chosen.filter(([c]) => links[groups[id]!]!.includes(groups[c]!)).map(([c]) => c),
  }))
  const acolyte = ENCOUNTER_SETS.darkCult.find((c) => c.code === '01169')!
  const starts = [south[0]!, downtown[0]!, '01133'].slice(0, Math.max(0, investigators.length - 1))
  let removed = starts.length
  const encounters = [
    ...ENCOUNTER_SETS.midnightMasksTreacheries,
    ...ENCOUNTER_SETS.chillingCold,
    ...ENCOUNTER_SETS.lockedDoors,
    ...ENCOUNTER_SETS.darkCult.filter((c) => c.code !== '01169' || removed-- <= 0),
    ...(data.sets.nightgaunts as EnemyCard[]),
    ...(log.notes.includes(ZEALOT_NOTES.priestAlive) &&
    !log.crossedOut.includes(ZEALOT_NOTES.priestAlive)
      ? [ghoulPriest]
      : []),
  ]
  return {
    id: MIDNIGHT,
    intro: [
      entry(log.notes.includes(ZEALOT_NOTES.litaOthers) ? 'intro1' : 'intro2'),
      entry('intro3'),
    ],
    setupInstructions: entry('setup'),
    locations,
    startingLocation: burned ? '01125' : '01124',
    agendas: [
      { code: '01121a', name: 'Predator or Prey?', doomThreshold: 6 },
      { code: '01122', name: 'Time Is Running Short', doomThreshold: 8 },
    ],
    acts: [
      {
        code: '01123',
        name: 'Uncovering the Conspiracy',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective' as const,
      },
    ],
    encounterDeck: encounters,
    setAside: CULTISTS.map((c) => classicEnemies[c]!),
    chaosBag: [...ZEALOT_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      { type: 'SetScenarioMeta' as const, key: 'midnightCultists', value: cultists.join(',') },
      ...starts.map((location) => ({
        type: 'SpawnEnemy' as const,
        card: acolyte as EnemyCard,
        location,
        engageWith: null,
      })),
    ],
  }
}
registerScenario({
  id: MIDNIGHT,
  cannotSpendClues: maskedHunterBlocksClues,
  cannotDiscoverClues: (s, i) => maskedHunterBlocksClues(s, i),
  cardCostModifier: (s, i, c) =>
    getInvestigator(s, i).location === '01132' &&
    s.locations['01132']?.revealed &&
    playerCardDef(c)?.traits?.includes('Ally')
      ? -2
      : 0,
  tokenEffect: (s, t, i) => {
    const hard = s.difficulty === 'hard' || s.difficulty === 'expert'
    const cultists = Object.values(s.enemies).filter((e) => e.traits?.includes('Cultist'))
    if (t === 'skull')
      return {
        modifier: -(hard ? totalDoom(s) : Math.max(0, ...cultists.map((e) => e.doom ?? 0))),
      }
    if (t === 'cultist')
      return {
        modifier: -2,
        ...(hard
          ? {
              revealAnother: !cultists.length,
              immediate: cultists.map((e) => ({
                type: 'PlaceDoomOnEnemy' as const,
                enemy: e.id,
                amount: 1,
              })),
            }
          : {
              immediate: nearestEnemyChoice(s, i, cultists, (e) => [
                { type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 1 },
              ]),
            }),
      }
    if (t === 'tablet')
      return {
        modifier: hard ? -4 : -3,
        onFail: [
          {
            type: 'PlaceCluesOnLocation',
            investigator: i,
            amount: hard ? controlledClues(s, i) : 1,
          },
        ],
      }
    return { modifier: 0 }
  },
  resolution: (s, outcome) => {
    const n = outcome.type === 'resolution' ? outcome.resolution : 1
    const interviewed = CULTISTS.filter((c) => s.victoryDisplay.includes(c))
    const remaining = String(s.scenarioMeta?.midnightCultists ?? '')
      .split(',')
      .filter(Boolean)
    const escaped = [
      ...new Set([
        ...remaining,
        ...Object.values(s.enemies)
          .filter((e) => CULTISTS.includes(e.code))
          .map((e) => e.code),
        ...(s.agendaIndex === 0 ? ['01121b'] : []),
      ]),
    ]
    return [
      { type: 'Story', entry: entry('resolution' + n) },
      { type: 'RecordNote', note: 'zealotInterrogated', value: interviewed.join(',') },
      { type: 'RecordNote', note: 'zealotEscaped', value: escaped.join(',') },
      ...(n === 2 ? [{ type: 'RecordNote' as const, note: 'zealotPastMidnight' }] : []),
      ...(s.victoryDisplay.includes(ghoulPriest.code)
        ? [{ type: 'CrossOutNote' as const, note: ZEALOT_NOTES.priestAlive }]
        : []),
      earnExperience(0, true),
      endScenario({ type: 'resolution', resolution: n }),
    ]
  },
  specific: (s, key, d) => {
    const search = classicSearch(s, key, d)
    if (search) return search
    const common = encounterSpecific(s, key, d)
    if (common) return common
    if (key === 'midnightDraw') {
      const deck = String(s.scenarioMeta?.midnightCultists ?? '')
        .split(',')
        .filter(Boolean)
      const code = deck.shift()
      if (!code) return s
      const room =
        Object.keys(s.locations).find((c) => groups[c] === spawnAt[code]) ?? spawnAt[code]!
      return push(
        { ...s, scenarioMeta: { ...s.scenarioMeta, midnightCultists: deck.join(',') } },
        { type: 'SpawnSetAsideEnemy', code, location: room },
      )
    }
    return s
  },
})
registerAct({
  code: '01123',
  objectiveMet: (s) => CULTISTS.every((c) => s.victoryDisplay.includes(c)),
  onAdvance: () => [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } }],
  abilities: (s, _self, _i) => {
    const from = activeInvestigators(s)
      .filter((p) => spendableClues(s, p.id) > 0)
      .map((p) => p.id)
    const amount = 2 * s.investigators.length
    return from.reduce((n, id) => n + spendableClues(s, id), 0) >= amount &&
      s.scenarioMeta?.midnightCultists
      ? [
          {
            key: 'midnight:draw',
            label: 'ability.midnight.drawCultist',
            actions: 1,
            provokes: true,
            costs: [{ type: 'PayGroupClues', amount, from }],
            then: [specific('midnightDraw')],
          },
        ]
      : []
  },
})
for (const code of ['01121a', '01122'])
  registerAgenda({
    code,
    abilities: (_s, _a, i) => [resignAbility(i, 'midnight:resign')],
    onAdvance: (s) =>
      code === '01122'
        ? [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } }]
        : (() => {
            const players = activeInvestigators(s)
            const max = Math.max(...players.map((i) => controlledClues(s, i.id)))
            const tied = players.filter((i) => controlledClues(s, i.id) === max)
            return [
              {
                type: 'Ask' as const,
                investigator: leadInvestigator(s)!.id,
                question: {
                  kind: 'chooseOne' as const,
                  prompt: 'prompt.chooseInvestigator',
                  choices: tied.map((i) => ({
                    label: 'choice.investigator',
                    params: { name: i.name },
                    then: [
                      {
                        type: 'SpawnEnemy' as const,
                        card: classicEnemies['01121b']!,
                        location: i.location!,
                        engageWith: i.id,
                      },
                    ],
                  })),
                },
              },
            ]
          })(),
  })
registerEnemy({ code: '01121b', healthModifier: (s) => 2 * s.investigators.length })
for (const code of CULTISTS.filter((c) => c !== '01121b'))
  registerEnemy({
    code,
    spawn: (s) => {
      const where = spawnAt[code]
      return Object.keys(s.locations).filter((c) => c === where || groups[c] === where)
    },
    ...(code === '01137'
      ? {
          onAttack: (_s: GameState, e: { id: string }) => [
            { type: 'HealEnemy' as const, enemy: e.id, amount: 1 },
          ],
        }
      : {}),
    ...(code === '01141'
      ? {
          forced: (_s: GameState, t: import('@lcg/engine').Trigger, e: { id: string }) =>
            t.type === 'afterEvade' && t.enemy === e.id
              ? [{ type: 'EnemyToVictory' as const, enemy: e.id }]
              : [],
        }
      : {}),
    abilities: (s, e, i) => {
      const p = getInvestigator(s, i)
      const costs: Message[] =
        code === '01138'
          ? [{ type: 'ChooseDiscardFromHand', investigator: i, amount: 4 }]
          : code === '01139'
            ? [{ type: 'SpendClues', investigator: i, amount: 2 }]
            : code === '01140'
              ? [{ type: 'SpendResources', investigator: i, amount: 5 }]
              : []
      const legal =
        code === '01138'
          ? p.hand.length >= 4
          : code === '01139'
            ? spendableClues(s, i) >= 2
            : code === '01140'
              ? p.resources >= 5
              : false
      return legal
        ? [
            {
              key: e.id + ':parley',
              label: 'ability.midnight.interrogate',
              actions: 1,
              provokes: false,
              parley: true,
              costs,
              then: [{ type: 'EnemyToVictory', enemy: e.id }],
            },
          ]
        : []
    },
  })

for (const [code, ,] of rawRooms)
  registerLocation({
    code,
    forced: (s, t) =>
      code === '01133' &&
      t.type === 'afterMove' &&
      getInvestigator(s, t.investigator).location === code
        ? [
            effectTest(t.investigator, 'Graveyard', 'willpower', 3, {
              onFail: [
                {
                  type: 'Ask',
                  investigator: t.investigator,
                  question: {
                    kind: 'chooseOne',
                    prompt: 'prompt.chooseEffect',
                    choices: [
                      { label: 'choice.midnight.takeHorror', then: [damage(t.investigator, 0, 2)] },
                      {
                        label: 'choice.location',
                        params: { location: s.locations['01125']!.name },
                        target: { type: 'location', id: '01125' },
                        then: [{ type: 'MoveTo', investigator: t.investigator, location: '01125' }],
                      },
                    ],
                  },
                },
              ],
            }),
          ]
        : [],
    abilities: (s, _l, i) => {
      const once = { per: 'game' as const }
      const p = getInvestigator(s, i)
      const option = (
        then: Message[],
        limit: AbilityOption['limit'] = once,
        costs: Message[] = [],
      ): AbilityOption[] => [
        {
          key: code + ':ability',
          label: 'ability.midnight.location' + code,
          actions: 1,
          provokes: true,
          limit,
          costs,
          then,
        },
      ]
      switch (code) {
        case '01124':
          return option(
            [
              { type: 'DrawCards', investigator: i, amount: 1 },
              { type: 'GainResources', investigator: i, amount: 1 },
            ],
            { per: 'turn' },
          )
        case '01126':
          return option([{ type: 'DrawCards', investigator: i, amount: 3 }])
        case '01127':
          return option([
            {
              type: 'SearchDeck',
              investigator: i,
              traits: ['Ally'],
              cardType: 'asset',
              to: 'hand',
            },
          ])
        case '01128':
          return p.damage > 0
            ? option([{ type: 'Heal', investigator: i, damage: 3, horror: 0 }])
            : []
        case '01129':
          return [
            {
              key: code + ':search',
              label: 'ability.midnight.location01129',
              actions: 1,
              provokes: true,
              then: [
                {
                  type: 'SearchDeck',
                  investigator: i,
                  top: 6,
                  traits: ['Tome', 'Spell'],
                  to: 'hand',
                },
              ],
            },
          ]
        case '01130':
          return option([{ type: 'GainResources', investigator: i, amount: 3 }])
        case '01131':
          return p.horror > 0
            ? option([{ type: 'Heal', investigator: i, damage: 0, horror: 3 }])
            : []
        case '01134':
          return p.resources >= 5
            ? option(
                [{ type: 'GainClues', investigator: i, amount: 2 }],
                { per: 'game', group: true },
                [{ type: 'SpendResources', investigator: i, amount: 5 }],
              )
            : []
        default:
          return []
      }
    },
  })

registerEnemy({
  code: ghoulPriest.code,
  spawn: (s, _i) =>
    s.scenarioId === MIDNIGHT && s.locations['01124']
      ? ['01124']
      : [getInvestigator(s, _i).location!],
})
