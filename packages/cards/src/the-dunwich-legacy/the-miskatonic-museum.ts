import './museum-assets'
import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  push,
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
} from '@lcg/engine'
import {
  chooseAssetToDiscard,
  damage,
  earnExperience,
  effectTest,
  endScenario,
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
import { HOUSE_SETS } from './house-encounters'
import { HN } from './house-codes'
import { storyReward } from './house-assets'
import { M, MN, THE_MISKATONIC_MUSEUM } from './museum-codes'
import {
  horrorInPlay,
  huntingHorror,
  MUSEUM_ENCOUNTERS,
  museumSpecific as specific,
} from './museum-encounters'
export { M, MN, THE_MISKATONIC_MUSEUM } from './museum-codes'
export { huntingHorror, MUSEUM_ENCOUNTERS } from './museum-encounters'
const entry = storyEntries('museum')
const exhibits = [M.athabaskan, M.medusa, M.nature, M.egypt, M.dead, M.restrictedHall]
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
  cluesPerInvestigator: true,
  connections,
  position,
  ...(victory ? { victory } : {}),
})
export const MUSEUM_LOCATIONS = {
  entrance: room(M.entrance, 'Museum Entrance', 3, 2, [M.halls], [1, 0]),
  halls: room(
    M.halls,
    'Museum Halls',
    2,
    0,
    [M.entrance, M.securitySearch, M.securityLook, M.adminResources, M.adminHand, ...exhibits],
    [1, 1],
  ),
  securitySearch: room(M.securitySearch, 'Security Office', 2, 1, [M.halls], [0, 1]),
  securityLook: room(M.securityLook, 'Security Office', 3, 2, [M.halls], [0, 1]),
  adminResources: room(M.adminResources, 'Administration Office', 1, 1, [M.halls], [2, 1]),
  adminHand: room(M.adminHand, 'Administration Office', 2, 2, [M.halls], [2, 1]),
  athabaskan: room(M.athabaskan, 'Exhibit Hall', 1, 0, [M.halls], [0, 2]),
  medusa: room(M.medusa, 'Exhibit Hall', 2, 1, [M.halls], [1, 2], 1),
  nature: room(M.nature, 'Exhibit Hall', 4, 1, [M.halls], [2, 2], 1),
  egypt: room(M.egypt, 'Exhibit Hall', 3, 2, [M.halls], [0, 3], 1),
  dead: room(M.dead, 'Exhibit Hall', 3, 2, [M.halls], [1, 3], 1),
  restricted: room(M.restrictedHall, 'Exhibit Hall', 3, 2, [M.halls], [2, 3], 1),
}
const shadow = treachery({
  code: M.shadow,
  name: 'Shadow-spawned',
  traits: ['Power'],
  keywords: [],
})
const at = (s: GameState, i: InvestigatorId) => getInvestigator(s, i).location
const deck = (s: GameState): string[] =>
  String(s.scenarioMeta?.museumExhibits ?? '')
    .split(',')
    .filter(Boolean)
const adam = (s: GameState, i: InvestigatorId) =>
  Object.values(s.assets).some((a) => a.owner === i && a.code === M.adam)
const investigateBlocked = (s: GameState, i: InvestigatorId, l: string) =>
  (l === M.restrictedHall && horrorInPlay(s)?.location === l) ||
  (l === M.adminResources && getInvestigator(s, i).resources <= 4) ||
  (l === M.adminHand && getInvestigator(s, i).hand.length <= 4)
const recipients = (s: GameState, code: string): Message => ({
  type: 'Ask',
  investigator: leadInvestigator(s)?.id ?? s.investigators[0]!.id,
  question: {
    kind: 'chooseOne',
    prompt: 'prompt.museum.ally',
    choices: activeInvestigators(s).map((i) => ({
      label: 'choice.investigator',
      params: { name: i.name },
      then: [{ type: 'PutAssetIntoPlay' as const, investigator: i.id, code, noSlot: true }],
    })),
  },
})
export function theMiskatonicMuseum({
  difficulty = 'standard',
  log,
}: { difficulty?: Difficulty; log?: CampaignLog } = {}): ScenarioDefinition {
  return {
    id: THE_MISKATONIC_MUSEUM,
    intro: [entry('intro'), entry(log?.notes.includes(HN.armitageRescued) ? 'intro2' : 'intro1')],
    setupInstructions: entry('setup'),
    locations: [MUSEUM_LOCATIONS.entrance, MUSEUM_LOCATIONS.halls],
    setAsideLocations: Object.values(MUSEUM_LOCATIONS).filter(
      (l) => ![M.entrance, M.halls].includes(l.id as typeof M.entrance),
    ),
    startingLocation: M.entrance,
    agendas: [
      { code: M.restricted, name: 'Restricted Access', doomThreshold: 5 },
      { code: M.shadows, name: 'Shadows Deepen', doomThreshold: 7 },
      { code: M.everyShadow, name: 'In Every Shadow', doomThreshold: 7 },
    ],
    acts: [
      {
        code: M.inside,
        name: 'Finding A Way Inside',
        clueThreshold: 2,
        cluesPerInvestigator: true,
        advanceTiming: 'anytime',
      },
      {
        code: M.night,
        name: 'Night at the Museum',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: M.tome,
        name: 'Searching for the Tome',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...MUSEUM_ENCOUNTERS,
      ...HOUSE_SETS.badLuck,
      ...DUNWICH_ENCOUNTER_SETS.sorcery,
      ...DUNWICH_ENCOUNTER_SETS.theBeyond,
      ...ENCOUNTER_SETS.chillingCold,
      ...ENCOUNTER_SETS.lockedDoors,
    ],
    setAside: [shadow],
    chaosBag: [...DUNWICH_CHAOS_BAGS[difficulty]],
    tokenValues: {},
    setup: [specific('museumSetup')],
  }
}
registerScenario({
  id: THE_MISKATONIC_MUSEUM,
  connections: (s, l) => {
    const pairs: Record<string, string> = {
      [M.medusa]: M.egypt,
      [M.egypt]: M.medusa,
      [M.nature]: M.dead,
      [M.dead]: M.nature,
    }
    const other = pairs[l.id]
    return l.revealed && other && s.locations[other]?.revealed ? [other] : []
  },
  cannotGainResources: (s, i) => at(s, i) === M.entrance,
  actionAllowed: (s, i, k) =>
    !(k === 'resource' && at(s, i) === M.entrance) &&
    !(k === 'investigate' && !!at(s, i) && investigateBlocked(s, i, at(s, i)!)),
  cannotInvestigate: investigateBlocked,
  canEnter: (s, _i, _from, to) => to !== M.halls || !!s.locations[M.halls]?.revealed,
  skillModifier: (s, test) =>
    test.skill === 'agility' && at(s, test.investigator) === M.athabaskan ? 2 : 0,
  enemyStat: (s, e) =>
    e.code === M.horror ? Number(s.scenarioMeta?.museumShadowResources ?? 0) : 0,
  tokenEffect: (s, t, i) => {
    const hard = s.difficulty === 'hard' || s.difficulty === 'expert',
      here = at(s, i),
      horror = horrorInPlay(s),
      present = !!horror && horror.location === here
    return t === 'skull'
      ? { modifier: present ? (hard ? -4 : -3) : hard ? -2 : -1 }
      : t === 'cultist'
        ? {
            modifier: hard ? -3 : -1,
            onFail: [specific('museumSpawn', { location: here ?? M.entrance, investigator: i })],
          }
        : t === 'tablet'
          ? {
              modifier: hard ? -4 : -2,
              ...(hard
                ? {
                    immediate: present
                      ? [
                          {
                            type: 'EnemyAttack' as const,
                            enemy: horror!.id,
                            investigator: i,
                            exhaustAfter: false,
                            evenIfExhausted: true,
                          },
                        ]
                      : [],
                  }
                : {
                    immediate: [
                      { type: 'PlaceCluesOnLocation' as const, investigator: i, amount: 1 },
                    ],
                  }),
            }
          : t === 'elderThing'
            ? { modifier: hard ? -5 : -3, onFail: chooseAssetToDiscard(s, i) }
            : { modifier: 0 }
  },
  forced: (s, t) =>
    t.type === 'enemySpawned' && s.enemies[t.enemy]?.code === M.horror
      ? [specific('museumShadow', { enemy: t.enemy })]
      : [],
  resolution: (s, outcome) => {
    const n = outcome.type === 'resolution' ? outcome.resolution : 0,
      note = n === 1 ? MN.destroyed : n === 2 ? MN.kept : MN.failed
    return [
      {
        type: 'Story',
        entry: entry(n ? `resolution${n}` : 'noResolution', [
          noteEffect(note),
          { key: 'story.effect.experience', params: { bonus: 0 } },
          ...(n === 2 ? [{ key: 'story.museum.temptation' }] : []),
        ]),
      },
      recordNote(note),
      ...(n === 2
        ? [
            storyReward(s, M.necronomicon, entry('reward')),
            { type: 'AddChaosTokens' as const, tokens: ['elderThing' as const] },
          ]
        : []),
      earnExperience(0, true),
      endScenario(outcome),
    ]
  },
  specific: (s, key, data) => {
    const investigator = String(
      data.investigator ?? s.activeTurn ?? leadInvestigator(s)?.id ?? s.investigators[0]!.id,
    )
    if (key === 'museumSetup') {
      const [admins, r1] = shuffle([M.adminResources, M.adminHand], s.rng),
        [securities, r2] = shuffle([M.securitySearch, M.securityLook], r1),
        [others, r3] = shuffle(
          exhibits.filter((c) => c !== M.restrictedHall),
          r2,
        ),
        [bottom, r4] = shuffle([M.restrictedHall, ...others.slice(0, 2)], r3),
        [top, rng] = shuffle(others.slice(2), r4)
      const setAsideLocations = { ...s.setAsideLocations }
      delete setAsideLocations[admins[1]!]
      delete setAsideLocations[securities[1]!]
      return push(
        {
          ...s,
          rng,
          setAsideLocations,
          scenarioMeta: {
            ...s.scenarioMeta,
            museumExhibits: [...top, ...bottom].join(','),
            museumShadowResources: 0,
          },
        },
        { type: 'PutLocationIntoPlay', location: admins[0]! },
        { type: 'PutLocationIntoPlay', location: securities[0]! },
      )
    }
    if (key === 'museumDrawExhibit') {
      const [location, ...remaining] = deck(s)
      if (!location) return s
      const setAsideLocations = {
        ...s.setAsideLocations,
        [location]: {
          ...s.setAsideLocations[location]!,
          position: [
            (6 - remaining.length - 1) % 3,
            2 + Math.floor((6 - remaining.length - 1) / 3),
          ] as [number, number],
        },
      }
      return push(
        {
          ...s,
          setAsideLocations,
          scenarioMeta: { ...s.scenarioMeta, museumExhibits: remaining.join(',') },
        },
        { type: 'PutLocationIntoPlay', location },
      )
    }
    if (key === 'museumBroken')
      return push(
        {
          ...s,
          acts: s.acts.map((a, n) =>
            n === 1 ? { ...a, code: M.breaking, name: 'Breaking and Entering' } : a,
          ),
          scenarioMeta: { ...s.scenarioMeta, museumBroken: 1 },
        },
        { type: 'AdvanceAct', paid: true },
      )
    if (key === 'museumSpawn') {
      const current = horrorInPlay(s),
        location = String(data.location ?? M.halls)
      if (current)
        return data.move === true
          ? push(
              s,
              { type: 'ReadyEnemy', enemy: current.id },
              { type: 'MoveEnemy', enemy: current.id, location },
            )
          : s
      const take = (cards: typeof s.encounterDeck) => cards.filter((c) => c.code !== M.horror)
      const [encounterDeck, rng] = shuffle(take(s.encounterDeck), s.rng)
      return push(
        {
          ...s,
          encounterDeck,
          rng,
          encounterDiscard: take(s.encounterDiscard),
          setAside: take(s.setAside),
          scenarioMeta: { ...s.scenarioMeta, museumVoid: 0 },
        },
        {
          type: 'SpawnEnemy',
          card: { ...huntingHorror },
          location,
          engageWith: data.engage === true ? investigator : null,
        },
      )
    }
    if (key === 'museumShadow') {
      const e = s.enemies[String(data.enemy)]
      if (!e) return s
      const resources =
        s.scenarioMeta?.museumShadowAttached === 1
          ? Number(s.scenarioMeta.museumShadowResources ?? 0) + 1
          : 0
      const next = {
        ...s,
        scenarioMeta: {
          ...s.scenarioMeta,
          museumShadowAttached: 1,
          museumShadowResources: resources,
        },
        enemies: {
          ...s.enemies,
          [e.id]: {
            ...e,
            keywords:
              resources >= 3
                ? [...e.keywords.filter((k) => k !== 'massive'), 'massive' as const]
                : e.keywords,
            ...(resources >= 3 ? { engagedWith: null } : {}),
          },
        },
      }
      return push(
        next,
        {
          type: 'PlaceSetAsideTreachery',
          code: M.shadow,
          placement: { type: 'enemy', enemy: e.id },
        },
        specific('museumShadowTokens'),
      )
    }
    if (key === 'museumShadowTokens') {
      const treacheries = { ...s.treacheries }
      for (const t of Object.values(treacheries))
        if (t.code === M.shadow)
          treacheries[t.id] = { ...t, tokens: Number(s.scenarioMeta?.museumShadowResources ?? 0) }
      return { ...s, treacheries }
    }
    if (key === 'museumVoid') {
      const e = s.enemies[String(data.enemy)]
      if (!e) return s
      const treacheries = Object.fromEntries(
        Object.entries(s.treacheries).filter(([, t]) => t.code !== M.shadow),
      )
      return push(
        {
          ...s,
          treacheries,
          setAside: [
            ...s.setAside.filter((c) => ![M.horror, M.shadow].includes(c.code as typeof M.horror)),
            { ...huntingHorror },
            ...(s.scenarioMeta?.museumShadowAttached === 1 ? [{ ...shadow }] : []),
          ],
          scenarioMeta: { ...s.scenarioMeta, museumVoid: 1 },
        },
        { type: 'RemoveEnemyFromGame', enemy: e.id, leavingResolved: true },
      )
    }
    if (key === 'museumHorrorDoom') {
      const e = horrorInPlay(s)
      return e ? { ...s, enemies: { ...s.enemies, [e.id]: { ...e, doom: (e.doom ?? 0) + 1 } } } : s
    }
    if (key === 'museumShuffle') {
      const [encounterDeck, rng] = shuffle(
        [...s.encounterDeck, ...(data.discard === true ? s.encounterDiscard : [])],
        s.rng,
      )
      return {
        ...s,
        encounterDeck,
        rng,
        ...(data.discard === true ? { encounterDiscard: [] } : {}),
      }
    }
    if (key === 'museumReady') {
      const token = data.token,
        e = s.enemies[String(data.enemy)]
      return e && typeof token === 'string' && token !== 'elderSign'
        ? push(s, { type: 'ReadyEnemy', enemy: e.id })
        : s
    }
    if (key === 'museumAlliesDamage')
      return push(
        s,
        ...Object.values(s.assets)
          .filter((a) => a.owner === investigator && playerCardDef(a.code)?.traits.includes('Ally'))
          .map((a): Message => ({ type: 'DamageAsset', asset: a.id, damage: 1, horror: 0 })),
      )
    if (key === 'museumPeek') {
      const code = String(data.code)
      return push(s, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.story',
          story: entry(`peek${code}`),
          choices: [{ label: 'choice.continue', then: [] }],
        },
      })
    }
    if (key === 'hawTwist') {
      const token = data.token
      return push(
        s,
        ...(token === 'elderSign' || (typeof token === 'number' && token > 0)
          ? []
          : [typeof token === 'number' ? damage(investigator, 1) : damage(investigator, 0, 2)]),
      )
    }
    return s
  },
})
registerLocation({
  code: M.entrance,
  abilities: (s, _l, i) => [
    resignAbility(i, 'museum:resign'),
    ...(!s.locations[M.halls]?.revealed
      ? [
          {
            key: 'museum:break',
            label: 'ability.museum.breakDoor',
            actions: 1,
            provokes: true,
            then: [
              effectTest(i, 'Museum Halls', 'combat', 5, { onSuccess: [specific('museumBroken')] }),
            ],
          },
        ]
      : []),
  ],
})
registerLocation({
  code: M.halls,
  abilities: (s, _l, _i) => {
    const present = activeInvestigators(s).filter((i) => i.location === M.halls),
      amount = s.startingInvestigatorCount
    return deck(s).length && present.reduce((n, i) => n + i.clues, 0) >= amount
      ? [
          {
            key: 'museum:exhibit',
            label: 'ability.museum.exhibit',
            actions: 1,
            provokes: true,
            costs: [{ type: 'PayGroupClues', amount, from: present.map((i) => i.id) }],
            then: [specific('museumDrawExhibit')],
          },
        ]
      : []
  },
})
registerLocation({
  code: M.securitySearch,
  abilities: (s, _l, i) => [
    {
      key: 'museum:search',
      label: 'ability.museum.search',
      actions: adam(s, i) ? 1 : 2,
      provokes: true,
      limit: { per: 'turn' },
      then: [
        {
          type: 'SearchDeck',
          investigator: i,
          top: 6,
          traits: [],
          to: 'hand',
          anyCard: true,
          includeWeaknesses: true,
        },
      ],
    },
  ],
})
registerLocation({
  code: M.securityLook,
  abilities: (s, _l, i) => {
    const choices = Object.values(s.locations)
      .filter((l) => exhibits.includes(l.id as typeof M.medusa) && !l.revealed)
      .map((l) => ({
        label: 'choice.location',
        params: { location: l.unrevealedName ?? l.name },
        target: { type: 'location' as const, id: l.id },
        then: [specific('museumPeek', { investigator: i, code: l.id })],
      }))
    const top = deck(s)[0]
    if (top)
      choices.push({
        label: 'choice.museum.top',
        params: { location: '' },
        target: { type: 'location', id: M.halls },
        then: [specific('museumPeek', { investigator: i, code: top })],
      })
    return choices.length
      ? [
          {
            key: 'museum:look',
            label: 'ability.museum.look',
            actions: adam(s, i) ? 1 : 2,
            provokes: true,
            limit: { per: 'turn' },
            then: [
              {
                type: 'Ask',
                investigator: i,
                question: { kind: 'chooseOne', prompt: 'prompt.museum.look', choices },
              },
            ],
          },
        ]
      : []
  },
})
registerLocation({
  code: M.athabaskan,
  forced: (s, t) =>
    t.type === 'afterMove' &&
    at(s, t.investigator) === M.athabaskan &&
    s.activeTurn === t.investigator
      ? [
          {
            type: 'LoseActions',
            investigator: t.investigator,
            amount: getInvestigator(s, t.investigator).actionsRemaining,
          },
          { type: 'EndTurn', investigator: t.investigator },
        ]
      : [],
})
registerLocation({
  code: M.nature,
  forced: (s, t) =>
    t.type === 'afterMove' && at(s, t.investigator) === M.nature
      ? [{ type: 'DiscardRandomFromHand', investigator: t.investigator, amount: 2 }]
      : [],
})
for (const code of [M.medusa, M.egypt, M.dead])
  registerLocation({
    code,
    forced: (s, t) =>
      t.type === 'afterSkillTest' &&
      t.kind === 'investigate' &&
      !t.succeeded &&
      s.skillTest?.kind.type === 'investigate' &&
      s.skillTest.kind.location === code
        ? code === M.medusa
          ? chooseAssetToDiscard(s, t.investigator)
          : code === M.egypt
            ? [{ type: 'LoseActions', investigator: t.investigator, amount: 1 }]
            : [damage(t.investigator, 0, 1)]
        : [],
  })
registerAct({
  code: M.inside,
  onAdvance: (s) => [
    ...(s.scenarioMeta?.museumBroken === 1 ? [] : [recipients(s, M.adam)]),
    { type: 'RevealLocation', location: M.halls },
  ],
})
for (const code of [M.night, M.breaking])
  registerAct({
    code,
    objectiveMet: (s) => activeInvestigators(s).some((i) => i.location === M.restrictedHall),
    onAdvance: (s) => [
      ...(code === M.breaking ? [recipients(s, M.harold)] : []),
      specific('museumSpawn', { location: M.restrictedHall, move: true }),
    ],
  })
registerAct({
  code: M.tome,
  objectiveMet: (s) =>
    !!s.locations[M.restrictedHall]?.revealed && s.locations[M.restrictedHall]!.clues === 0,
  onAdvance: (s) => [
    {
      type: 'Ask',
      investigator: leadInvestigator(s)?.id ?? s.investigators[0]!.id,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.museum.tome',
        choices: [
          {
            label: 'choice.museum.destroy',
            then: [{ type: 'EndScenario', outcome: resolution(1) }],
          },
          { label: 'choice.museum.keep', then: [{ type: 'EndScenario', outcome: resolution(2) }] },
        ],
      },
    },
  ],
})
for (const code of [M.restricted, M.shadows])
  registerAgenda({
    code,
    onAdvance: (s) =>
      horrorInPlay(s)
        ? [specific('museumHorrorDoom')]
        : [
            specific('museumSpawn', { location: M.halls }),
            specific('museumShuffle', { discard: true }),
          ],
  })
registerAgenda({
  code: M.everyShadow,
  onAdvance: (s) => [
    ...activeInvestigators(s).map((i): Message => ({
      type: 'SufferTrauma',
      investigator: i.id,
      physical: 1,
    })),
    ...activeInvestigators(s).map((i): Message => ({
      type: 'EliminateInvestigator',
      investigator: i.id,
    })),
    { type: 'EndScenario', outcome: { type: 'noResolution' } },
  ],
})
