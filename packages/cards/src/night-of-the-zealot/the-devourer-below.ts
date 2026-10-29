import { AGENTS_OF_YOG } from '../the-dunwich-legacy/remaining-encounters'
import { classicSearch } from './encounter-search'
import type { ScenarioDefinition } from '@lcg/engine'
/** Revised guide pp. 6–7; original cards 01142–01158. */
import {
  activeInvestigators,
  allPlayerCardDefs,
  playerCardDef,
  enemiesAt,
  getInvestigator,
  leadInvestigator,
  nextInt,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerScenario,
  registerTreachery,
  seedRng,
  shuffle,
  spendableClues,
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type LocationCard,
  type Message,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import {
  chooseSkillTest,
  damage,
  earnExperience,
  endScenario,
  effectTest,
  resignAbility,
  storyEntries,
} from '../scenario-helpers'
import { ENCOUNTER_SETS, encounterSpecific } from '../the-path-to-carcosa/encounter-sets'
import { nearestEnemyChoice } from '../nearest-choice'
import data from './classic-data.json'
import { CULTISTS, classicEnemies, maskedHunterBlocksClues } from './the-midnight-masks'
import { ghoulPriest, ZEALOT_NOTES } from './the-gathering'
import { LITA_CHANTLER } from './lita'
import { ZEALOT_CHAOS_BAGS } from './campaign'
export const DEVOURER = 'the-devourer-below'
const entry = storyEntries('devourerBelow')
const specific = (key: string, data: Record<string, string | number | boolean> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const woods = ['01150', '01151', '01152', '01153', '01154', '01155']
const icons: Record<string, string> = {
  '01150': 'triangle',
  '01151': 't',
  '01152': 'diamond',
  '01153': 'hourglass',
  '01154': 'equals',
  '01155': 'moon',
}
const links: Record<string, string[]> = {
  '01150': ['hourglass', 'diamond'],
  '01151': ['diamond', 'equals'],
  '01152': ['triangle', 't'],
  '01153': ['moon', 'triangle'],
  '01154': ['t', 'moon'],
  '01155': ['equals', 'hourglass'],
}
const site: LocationCard = {
  id: '01156',
  name: 'Ritual Site',
  shroud: 3,
  clueValue: 2,
  cluesPerInvestigator: true,
  connections: ['01149'],
  symbol: 'plus',
  connectsTo: ['squiggle'],
}
export function theDevourerBelow({
  difficulty,
  log,
  seed,
  investigators,
}: ScenarioContext): ScenarioDefinition {
  let rng = seedRng(seed)
  const [shuffled, r] = shuffle(woods, rng)
  rng = r
  const [agent] = nextInt(rng, 4)
  const agentSets = [
    AGENTS_OF_YOG,
    data.sets.agents_of_shub,
    data.sets.agents_of_cthulhu,
    ENCOUNTER_SETS.agentsOfHastur,
  ]
  const locations: LocationCard[] = [
    {
      id: '01149',
      name: 'Main Path',
      symbol: 'squiggle',
      connectsTo: ['square', 'plus'],
      shroud: 2,
      clueValue: 0,
      cluesPerInvestigator: true,

      connections: shuffled.slice(0, 4),
    },
    ...shuffled.slice(0, 4).map((id) => ({
      id,
      name: 'Arkham Woods',
      symbol: icons[id]!,
      connectsTo: ['squiggle', ...links[id]!],
      unrevealed: { symbol: 'square', connectsTo: ['squiggle'] },
      shroud: (
        { '01150': 4, '01151': 3, '01152': 2, '01153': 2, '01154': 2, '01155': 1 } as Record<
          string,
          number
        >
      )[id]!,
      clueValue: id === '01155' ? 0 : 1,
      cluesPerInvestigator: true,

      connections: ['01149'],
    })),
  ]
  const escaped = String(log.values.zealotEscaped ?? '')
    .split(',')
    .filter((c) => CULTISTS.includes(c))
  return {
    id: DEVOURER,
    intro: entry('intro'),
    setupInstructions: entry('setup'),
    locations,
    setAsideLocations: [site],
    startingLocation: '01149',
    agendas: [
      { code: '01143', name: 'The Arkham Woods', doomThreshold: 4 },
      { code: '01144', name: 'The Ritual Begins', doomThreshold: 5 },
      { code: '01145', name: 'Vengeance Awaits', doomThreshold: 5 },
    ],
    acts: [
      {
        code: '01146',
        name: 'Investigating the Trail',
        clueThreshold: 3,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime' as const,
      },
      {
        code: '01147',
        name: 'Into the Darkness',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective' as const,
      },
      {
        code: '01148',
        name: 'Disrupting the Ritual',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective' as const,
      },
    ],
    encounterDeck: [
      ...ENCOUNTER_SETS.ancientEvils,
      ...ENCOUNTER_SETS.strikingFear,
      ...ENCOUNTER_SETS.ghouls,
      ...ENCOUNTER_SETS.darkCult,
      ...(agentSets[agent]! as EncounterCard[]),
      ...Array.from({ length: 2 }, () => ({
        kind: 'treachery' as const,
        code: '01158',
        name: "Umôrdhoth's Wrath",
        traits: ['Curse'],
        keywords: [],
      })),
      ...(log.notes.includes(ZEALOT_NOTES.priestAlive) &&
      !log.crossedOut.includes(ZEALOT_NOTES.priestAlive)
        ? [ghoulPriest]
        : []),
    ],
    setAside: [classicEnemies['01157']!, ...escaped.map((c) => classicEnemies[c]!)],
    chaosBag: [...ZEALOT_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [
      { type: 'AddChaosTokens' as const, tokens: ['elderThing' as const] },
      { type: 'PlaceDoom' as const, amount: Math.ceil(escaped.length / 2) },
      ...(log.notes.includes('zealotPastMidnight')
        ? investigators.map((investigator) => ({
            type: 'DiscardRandomFromHand' as const,
            investigator,
            amount: 2,
          }))
        : []),
    ],
  }
}
function millEnemies(s: GameState, count: number, monster: boolean): GameState {
  const [deck, rng] = shuffle([...s.encounterDeck, ...s.encounterDiscard], s.rng)
  const drawn: EnemyCard[] = []
  const discard: EncounterCard[] = []
  while (deck.length && drawn.length < count) {
    const c = deck.shift()!
    if (c.kind === 'enemy' && (!monster || c.traits?.includes('Monster'))) drawn.push(c)
    else discard.push(c)
  }
  return push(
    { ...s, rng, encounterDeck: deck, encounterDiscard: discard },
    ...drawn.flatMap((card): Message[] => [
      { type: 'SpawnEnemy', card, location: monster ? '01149' : '01156', engageWith: null },
      ...(monster ? [specific('devourerDoomEnemy', { code: card.code })] : []),
    ]),
  )
}
registerScenario({
  id: DEVOURER,
  cannotSpendClues: maskedHunterBlocksClues,
  cannotDiscoverClues: (s, i) => maskedHunterBlocksClues(s, i),
  beforeMove: (s, m) =>
    !m.checked && getInvestigator(s, m.investigator).location === '01151'
      ? [
          effectTest(m.investigator, 'Twisting Paths', 'intellect', 3, {
            onSuccess: [{ ...m, checked: true }],
          }),
        ]
      : null,
  investigateSkill: (_s, l) =>
    l === '01152' ? 'willpower' : l === '01153' ? 'agility' : l === '01154' ? 'combat' : null,
  enemyStat: (s, _e) => (s.agendas[s.agendaIndex]?.code === '01144' ? 1 : 0),
  forced: (s, t) =>
    t.type === 'enemyDefeated' && t.enemy.code === '01180'
      ? activeInvestigators(s)
          .filter((i) => i.location === t.enemy.location)
          .map((i) => damage(i.id, 0, 1))
      : t.type === 'enemyDefeated' && t.enemy.code === '01157'
        ? [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } }]
        : [],
  tokenEffect: (s, t, i) => {
    const hard = s.difficulty === 'hard' || s.difficulty === 'expert'
    const monsters = Object.values(s.enemies).filter((e) => e.traits?.includes('Monster'))
    if (t === 'skull')
      return hard
        ? {
            modifier: -3,
            onFail: [
              {
                type: 'ModifySkillTest',
                after: [specific('devourerFindMonster', { investigator: i })],
              },
            ],
          }
        : { modifier: -monsters.length }
    if (t === 'cultist')
      return {
        modifier: hard ? -4 : -2,
        immediate: nearestEnemyChoice(s, i, Object.values(s.enemies), (e) => [
          { type: 'PlaceDoomOnEnemy', enemy: e.id, amount: hard ? 2 : 1 },
        ]),
      }
    if (t === 'tablet')
      return {
        modifier: hard ? -5 : -3,
        immediate: monsters.some((e) => e.location === getInvestigator(s, i).location)
          ? [damage(i, 1, hard ? 1 : 0)]
          : [],
      }
    return {
      modifier: hard ? -7 : -5,
      revealAnother: Object.values(s.enemies).some((e) => e.traits?.includes('Ancient One')),
    }
  },
  resolution: (s, o) => {
    const n = o.type === 'resolution' ? o.resolution : 0
    return [
      { type: 'Story', entry: entry(n ? 'resolution' + n : 'noResolution') },
      {
        type: 'RecordNote',
        note:
          n === 0
            ? 'zealotArkhamFell'
            : n === 1
              ? 'zealotRitualBroken'
              : n === 2
                ? 'zealotRepelledUmordhoth'
                : 'zealotSacrificedLita',
      },
      ...(n === 0
        ? [
            { type: 'KillInvestigators' as const },
            { type: 'RecordNote' as const, note: 'campaignLost' },
          ]
        : [
            { type: 'SufferTrauma' as const, mental: 2, physical: n === 1 ? 0 : 2 },
            earnExperience(n === 1 ? 5 : n === 2 ? 10 : 0, true),
            ...(n === 3
              ? s.investigators.map((i) =>
                  specific('devourerMadness', { investigator: i.id, toHand: false }),
                )
              : []),
            { type: 'RecordNote' as const, note: n === 3 ? 'campaignSurvived' : 'campaignWon' },
          ]),
      endScenario(o),
    ]
  },
  specific: (s, key, d) => {
    const search = classicSearch(s, key, d)
    if (search) return search
    const common = encounterSpecific(s, key, d)
    if (common) return common
    if (key === 'devourerMill') return millEnemies(s, Number(d.count), !!d.monster)
    if (key === 'devourerDoomEnemy') {
      const e = Object.values(s.enemies).findLast(
        (e) => e.code === d.code && e.location === '01149',
      )
      return e ? push(s, { type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 1 }) : s
    }
    if (key === 'devourerMadness') {
      const pool = allPlayerCardDefs()
        .filter((c) => c.weakness === 'basicweakness' && c.traits.includes('Madness'))
        .map((c) => c.code)
        .sort()
      if (!pool.length) throw new Error('Missing Madness weakness collection')
      const [n, rng] = nextInt(s.rng, pool.length)
      const investigator = String(d.investigator),
        code = pool[n]!
      return push(
        {
          ...s,
          rng,
          investigators: s.investigators.map((i) =>
            i.id === investigator && d.toHand ? { ...i, hand: [...i.hand, code] } : i,
          ),
        },
        { type: 'AddStoryAsset', investigator, code },
      )
    }
    if (key === 'devourerSacrifice') {
      if (!s.campaignLog) return s
      return {
        ...s,
        campaignLog: {
          ...s.campaignLog,
          investigators: Object.fromEntries(
            Object.entries(s.campaignLog.investigators).map(([id, r]) => [
              id,
              { ...r, storyAssets: r.storyAssets.filter((c) => c !== LITA_CHANTLER) },
            ]),
          ),
        },
      }
    }
    if (key === 'devourerWrath') {
      const investigator = String(d.investigator),
        p = getInvestigator(s, investigator)
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEffect',
          choices: [
            ...(p.hand.some((c) => !playerCardDef(c)?.weakness)
              ? [
                  {
                    label: 'choice.devourer.discard',
                    then: [{ type: 'ChooseDiscardFromHand' as const, investigator, amount: 1 }],
                  },
                ]
              : []),
            { label: 'choice.devourer.takeDamageHorror', then: [damage(investigator, 1, 1)] },
          ],
        },
      })
    }
    if (key === 'devourerAwake')
      return push(
        {
          ...s,
          acts: [
            {
              code: '01145b',
              name: 'The Devourer Below',
              clueThreshold: 0,
              cluesPerInvestigator: false,
              advanceTiming: 'objective',
            },
          ],
          actIndex: 0,
          agendas: [{ code: '01145b', name: 'The Devourer Below', doomThreshold: null }],
          agendaIndex: 0,
          doom: 0,
        },
        { type: 'CheckActObjective' },
      )
    return s
  },
})
registerAct({
  code: '01146',
  onAdvance: (s) => [
    { type: 'PutLocationIntoPlay', location: '01156' },
    ...String(s.campaignLog?.values.zealotEscaped ?? '')
      .split(',')
      .filter((c) => CULTISTS.includes(c))
      .map((code) => ({ type: 'SpawnSetAsideEnemy' as const, code, location: '01149' })),
  ],
})
registerAct({
  code: '01147',
  objectiveMet: (s) => activeInvestigators(s).some((i) => i.location === '01156'),
  onAdvance: (s) => [
    specific('devourerMill', { count: s.investigators.length >= 3 ? 2 : 1, monster: false }),
  ],
})
registerAct({
  code: '01148',
  objectiveMet: (s) => (s.actClues ?? 0) >= 2 * s.investigators.length,
  onAdvance: () => [{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } }],
  abilities: (s, _a, i) =>
    spendableClues(s, i) > 0
      ? [
          {
            key: 'devourer:ritual',
            label: 'ability.devourer.disrupt',
            actions: 1,
            provokes: true,
            costs: [{ type: 'SpendClues', investigator: i, amount: 1 }],
            then: [
              chooseSkillTest(i, 'Disrupting the Ritual', ['willpower', 'agility'], 3, {
                onSuccess: [
                  { type: 'MoveClues', from: { type: 'pool' }, to: { type: 'act' }, amount: 1 },
                ],
              }),
            ],
          },
        ]
      : [],
})
registerAct({ code: '01145b', objectiveMet: () => false })
registerAgenda({
  code: '01143',
  onAdvance: () => [specific('devourerMill', { count: 1, monster: true })],
})
registerAgenda({
  code: '01144',
  onAdvance: (s) => {
    const players = activeInvestigators(s),
      start = Math.max(
        0,
        players.findIndex((i) => i.id === leadInvestigator(s)?.id),
      )
    return [...players.slice(start), ...players.slice(0, start)].map((i) =>
      effectTest(i.id, 'The Will of Umôrdhoth', 'willpower', 6, {
        onFail: [specific('devourerMadness', { investigator: i.id, toHand: true })],
      }),
    )
  },
})
registerAgenda({
  code: '01145',
  onAdvance: (s) => [
    { type: 'PutLocationIntoPlay', location: '01156' },
    ...(s.actIndex >= 1
      ? enemiesAt(s, '01156').map((e) => ({ type: 'DiscardEnemy' as const, enemy: e.id }))
      : []),
    { type: 'SpawnSetAsideEnemy', code: '01157', location: '01156' },
    specific('devourerAwake'),
  ],
})
registerEnemy({
  code: '01157',
  healthModifier: (s) => 4 * s.investigators.length,
  forced: (_s, t, e) => (t.type === 'turnEnds' ? [{ type: 'ReadyEnemy', enemy: e.id }] : []),
  abilities: (s, _e, i) =>
    Object.values(s.assets).some((a) => a.owner === i && a.code === LITA_CHANTLER)
      ? [
          {
            key: 'devourer:sacrifice',
            label: 'ability.devourer.sacrifice',
            actions: 1,
            provokes: true,
            then: [
              ...Object.values(s.assets)
                .filter((a) => a.owner === i && a.code === LITA_CHANTLER)
                .map((a) => ({ type: 'RemoveAssetFromGame' as const, asset: a.id })),
              specific('devourerSacrifice'),
              { type: 'EndScenario', outcome: { type: 'resolution', resolution: 3 } },
            ],
          },
        ]
      : [],
})
registerLocation({ code: '01149', abilities: (_s, _l, i) => [resignAbility(i, 'devourer:resign')] })
registerLocation({
  code: '01150',
  forced: (s, t) =>
    t.type === 'afterMove' && getInvestigator(s, t.investigator).location === '01150'
      ? [
          effectTest(t.investigator, 'Unhallowed Ground', 'willpower', 4, {
            onFail: [damage(t.investigator, 1, 1)],
          }),
        ]
      : [],
})
registerLocation({
  code: '01155',
  abilities: (s, _l, i) =>
    getInvestigator(s, i).damage || getInvestigator(s, i).horror
      ? [
          {
            key: 'quietGlade:heal',
            label: 'ability.devourer.heal',
            actions: 1,
            provokes: true,
            limit: { per: 'turn' },
            then: [
              {
                type: 'Ask',
                investigator: i,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.chooseEffect',
                  choices: [
                    ...(getInvestigator(s, i).damage
                      ? [
                          {
                            label: 'choice.devourer.healDamage',
                            then: [
                              { type: 'Heal' as const, investigator: i, damage: 1, horror: 0 },
                            ],
                          },
                        ]
                      : []),
                    ...(getInvestigator(s, i).horror
                      ? [
                          {
                            label: 'choice.devourer.healHorror',
                            then: [
                              { type: 'Heal' as const, investigator: i, damage: 0, horror: 1 },
                            ],
                          },
                        ]
                      : []),
                  ],
                },
              },
            ],
          },
        ]
      : [],
})
registerLocation({
  code: '01156',
  forced: (s, t, l) =>
    t.type === 'roundEnds' && l.clues < 2 * s.investigators.length
      ? [
          {
            type: 'PlaceCluesOnLocationFromPool',
            location: l.id,
            amount: 2 * s.investigators.length - l.clues,
          },
        ]
      : [],
})

registerTreachery({
  code: '01158',
  revelation: (_s, i) => [
    effectTest(i, "Umôrdhoth's Wrath", 'willpower', 5, {
      onFailEach: [specific('devourerWrath', { investigator: i })],
    }),
  ],
})

registerAgenda({ code: '01145b' })
