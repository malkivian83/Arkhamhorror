import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  push,
  registerAct,
  registerAgenda,
  registerLocation,
  registerScenario,
  shuffle,
  distancesFrom,
  nextStepToward,
  type AbilityOption,
  type ChaosToken,
  type Choice,
  type ExpeditionPartner,
  type GameState,
  type InvestigatorId,
  type Message,
  type ScenarioBehavior,
  type ScenarioDefinition,
  type SkillType,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { effectTest, endScenario, resolution } from '../scenario-helpers'
import {
  CITY_TERROR,
  TUNNEL,
  cityLocations,
  cityStart,
  outermost,
  sameLine,
  type CityVersion,
} from './city-cards'
import { cityEncounters } from './city-encounters'
import { interludeBonuses } from './forbidden-peaks'
import { EOTE_CITY } from './ice-and-death-cards'
import { iceAndDeathRules } from './ice-and-death'
import { edgeOfTheEarthStartingBag } from './opening'

const cityMessage = (key: string, data: Record<string, string | number> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const story = (key: string) => ({
  title: `story.edgeOfTheEarth.${key}.title`,
  body: `story.edgeOfTheEarth.${key}.body`,
})

/** Campaign guide, p. 37: the expedition votes for the column with more living members. */
export const cityGroups: Record<CityVersion, ExpeditionPartner[]> = {
  1: ['08720', '08721', '08717'],
  2: ['08715', '08722', '08716'],
  3: ['08714', '08718', '08719'],
}
export const cityVersionKey = 'edgeOfTheEarthCityVersion'

/** The tied columns, or the single version the vote reaches. */
export function cityVersionChoices(log: ScenarioContext['log']): CityVersion[] {
  const living = (version: CityVersion) =>
    cityGroups[version].filter((partner) => {
      const status = log.expedition?.partners[partner]?.status
      return status === 'safe' || status === 'resolute'
    }).length
  const counts = ([1, 2, 3] as const).map((version) => living(version))
  const most = Math.max(...counts)
  return ([1, 2, 3] as const).filter((version) => living(version) === most)
}
/** The lead breaks a tie (recorded before the scenario); otherwise the first tied column. */
export function cityVersion(log: ScenarioContext['log']): CityVersion {
  const choices = cityVersionChoices(log)
  const chosen = Number(log.values[cityVersionKey]) as CityVersion
  return choices.includes(chosen) ? chosen : choices[0]!
}

const acts: Record<CityVersion, [string, string]> = {
  1: ['08624', '08627'],
  2: ['08625', '08628'],
  3: ['08626', '08629'],
}

export function cityOfTheElderThings(context: ScenarioContext): ScenarioDefinition {
  const version = cityVersion(context.log)
  const { locations, keyed, idAt } = cityLocations(version, context.seed)
  const start = cityStart[version]
  const doom = context.difficulty === 'expert' ? 2 : context.difficulty === 'hard' ? 1 : 0
  const deck = cityEncounters(version, context.investigators.length)
  return {
    id: EOTE_CITY,
    startingBonuses: interludeBonuses(context, 'edgeOfTheEarthCity'),
    intro: story('cityIntro'),
    locations,
    startingLocation: start ? idAt(start) : null,
    chaosBag: edgeOfTheEarthStartingBag(context),
    tokenValues: {},
    agendas: [
      { code: '08622', name: 'Lurking Horrors', doomThreshold: 6 },
      { code: '08623', name: 'Doom from Below', doomThreshold: 10 },
    ],
    acts: [
      {
        code: acts[version][0],
        name: 'Sprawling City',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: acts[version][1],
        name: 'Pursuit of the Unknown',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: deck.encounterDeck,
    setAside: deck.setAside,
    setup: [
      ...keyed.map(({ location, key }): Message => ({
        type: 'PlaceKey',
        key,
        on: { type: 'location', id: location },
      })),
      ...(version === 3
        ? []
        : [{ type: 'AddChaosTokens' as const, tokens: ['elderThing' as const] }]),
      ...(doom ? [{ type: 'PlaceDoom' as const, amount: doom }] : []),
      ...(start ? [] : [cityMessage('chooseStart')]),
      { type: 'InitializeTekeliliDeck' },
      { type: 'ChooseExpeditionPartners', extraUses: cityGroups[version] },
    ],
  }
}

function ask(investigator: InvestigatorId, prompt: string, choices: Choice[]): Message[] {
  return choices.length
    ? [
        {
          type: 'Ask',
          investigator,
          question: { kind: 'chooseOne', prompt: `prompt.edgeOfTheEarth.${prompt}`, choices },
        },
      ]
    : []
}
const keysOf = (state: GameState, investigator: InvestigatorId) =>
  getInvestigator(state, investigator).keys ?? []
const count = (keys: ChaosToken[], key: ChaosToken) => keys.filter((k) => k === key).length
const remembered = (state: GameState, key: string) => !!state.scenarioMeta?.[`city:${key}`]
const hereOf = (state: GameState, investigator: InvestigatorId) =>
  getInvestigator(state, investigator).location
const terrorBlocks = (state: GameState, investigator: InvestigatorId) =>
  Object.values(state.enemies).some(
    ({ code, exhausted, location }) =>
      code === CITY_TERROR && !exhausted && location === hereOf(state, investigator),
  )

/** "[action] Spend two X keys: …" (acts and City Landscapes). */
function spendTwo(
  state: GameState,
  investigator: InvestigatorId,
  key: ChaosToken,
  ability: string,
  then: Message[],
  record?: string,
): AbilityOption[] {
  if (count(keysOf(state, investigator), key) < 2 || terrorBlocks(state, investigator)) return []
  return [
    {
      key: `city:${ability}`,
      label: `ability.edgeOfTheEarth.city.${ability}`,
      actions: 1,
      provokes: true,
      costs: [{ type: 'SpendKeys', investigator, keys: [key, key] }],
      then: [...then, ...(record ? [{ type: 'RecordNote', note: record } as Message] : [])],
    },
  ]
}
const remember = (key: string) => cityMessage('remember', { key })

// Act 1: Sprawling City. Two of three remembered facts, depending on the version.
const facts = {
  history: ['elderThing', 'cityHistory'],
  shoggoths: ['tablet', 'cityShoggoths'],
  power: ['cultist', 'cityPower'],
} as const
const sprawling: Record<string, (keyof typeof facts)[]> = {
  '08624': ['history', 'shoggoths'],
  '08625': ['history', 'power'],
  '08626': ['shoggoths', 'power'],
}
for (const [code, needed] of Object.entries(sprawling))
  registerAct({
    code,
    objectiveMet: (state) => needed.every((fact) => remembered(state, fact)),
    abilities: (state, _act, investigator) =>
      needed
        .filter((fact) => !remembered(state, fact))
        .flatMap((fact) =>
          spendTwo(state, investigator, facts[fact][0], facts[fact][1], [remember(fact)]),
        ),
    onAdvance: () => [cityMessage('undercity', { act: code })],
  })

// Act 2: Pursuit of the Unknown. Each undefeated investigator at the cleared Hidden Tunnel.
const pursuitMet = (state: GameState) => {
  const players = activeInvestigators(state)
  return (
    players.length > 0 &&
    !!state.locations[TUNNEL]?.revealed &&
    state.locations[TUNNEL]!.clues === 0 &&
    players.every(({ location }) => location === TUNNEL)
  )
}
registerAct({
  code: '08627',
  objectiveMet: pursuitMet,
  onAdvance: (state) => conclusion(state, 1),
  abilities: (state, _act, investigator) =>
    spendTwo(state, investigator, 'cultist', 'pursuitHeal', [cityMessage('pursuitHeal')]),
})
registerAct({
  code: '08628',
  objectiveMet: pursuitMet,
  onAdvance: (state) => conclusion(state, 1),
  abilities: (state, _act, investigator) =>
    spendTwo(state, investigator, 'tablet', 'pursuitTekelili', [cityMessage('pursuitTekelili')]),
})
registerAct({
  code: '08629',
  objectiveMet: pursuitMet,
  onAdvance: (state) => conclusion(state, 1),
  abilities: (state, _act, investigator) =>
    spendTwo(state, investigator, 'elderThing', 'pursuitElderThings', [
      cityMessage('removeElderThings'),
    ]),
  forced: (state, trigger) => {
    if (trigger.type !== 'enemyEntersLocation') return []
    const enemy = state.enemies[trigger.enemy]
    if (!enemy?.traits?.some((trait) => trait === 'Shoggoth' || trait === 'Elite')) return []
    return Object.values(state.enemies)
      .filter(
        ({ location, traits }) => location === trigger.location && traits?.includes('Elder Thing'),
      )
      .map(({ id }): Message => ({ type: 'DefeatEnemy', enemy: id }))
  },
})

// Agendas: look at a City Landscape, or move along your column or row.
function agendaAbilities(state: GameState, investigator: InvestigatorId): AbilityOption[] {
  if (state.activeTurn !== investigator) return []
  const here = hereOf(state, investigator)
  const line = sameLine(state, here)
  const clues = getInvestigator(state, investigator).clues
  const hidden = line.filter((id) => id !== TUNNEL && !state.locations[id]?.revealed)
  return [
    ...(clues >= 1 && hidden.length
      ? [
          {
            key: 'city:look',
            label: 'ability.edgeOfTheEarth.city.look',
            actions: 0,
            provokes: false,
            limit: { per: 'round' as const },
            costs: [{ type: 'SpendClues' as const, investigator, amount: 1 }],
            then: ask(
              investigator,
              'cityLook',
              hidden.map((id) => ({
                label: 'choice.edgeOfTheEarth.cityLandscape',
                params: positionParams(state, id),
                target: { type: 'location', id },
                then: [cityMessage('look', { investigator, location: id })],
              })),
            ),
          },
        ]
      : []),
    ...(clues >= 3
      ? [
          {
            key: 'city:travel',
            label: 'ability.edgeOfTheEarth.city.travel',
            actions: 0,
            provokes: false,
            limit: { per: 'round' as const },
            costs: [{ type: 'SpendClues' as const, investigator, amount: 3 }],
            then: ask(
              investigator,
              'cityTravel',
              line
                .filter((id) => id !== TUNNEL || state.locations[TUNNEL]?.revealed)
                .map((id) => ({
                  label: 'choice.edgeOfTheEarth.cityLandscape',
                  params: positionParams(state, id),
                  target: { type: 'location', id },
                  then: [{ type: 'MoveTo', investigator, location: id }],
                })),
            ),
          },
        ]
      : []),
  ]
}
const positionParams = (state: GameState, id: string) => {
  const location = state.locations[id]!
  const [column, row] = location.position ?? [0, 0]
  return {
    name: location.revealed ? location.name : (location.unrevealedName ?? location.name),
    column: column + 1,
    row: row + 1,
  }
}
registerAgenda({
  code: '08622',
  abilities: (state, _agenda, investigator) => agendaAbilities(state, investigator),
  onAdvance: () => [cityMessage('gazeIntoMadness')],
})
registerAgenda({
  code: '08623',
  abilities: (state, _agenda, investigator) => agendaAbilities(state, investigator),
  onAdvance: (state) => conclusion(state, 2),
})

// City Landscapes and the Hidden Tunnel.
registerLocation({
  code: TUNNEL,
  abilities: (state, self, investigator) => {
    const skull =
      !terrorBlocks(state, investigator) && keysOf(state, investigator).includes('skull')
    const skills: SkillType[] = ['willpower', 'intellect', 'combat', 'agility']
    const test = (skill: SkillType, spend: boolean): Message => ({
      type: 'BeginSkillTest',
      investigator,
      skill,
      difficulty: 4,
      ...(spend ? { modifier: 5 } : {}),
      kind: {
        type: 'effect',
        source: TUNNEL,
        onSuccess: [cityMessage('tunnelClues', { amount: spend ? 2 : 1 })],
        onFail: [],
        onFailEach: [],
      },
    })
    return self.clues
      ? [
          {
            key: `${self.id}:test`,
            label: 'ability.edgeOfTheEarth.city.tunnel',
            actions: 1,
            provokes: true,
            then: ask(
              investigator,
              'cityTunnel',
              skills.flatMap((skill) => [
                {
                  label: `choice.test.${skill}`,
                  params: { difficulty: 4 },
                  then: [test(skill, false)],
                },
                ...(skull
                  ? [
                      {
                        label: 'choice.edgeOfTheEarth.cityTunnelSkull',
                        params: { skill },
                        then: [
                          { type: 'SpendKeys', investigator, keys: ['skull'] } as Message,
                          test(skill, true),
                        ],
                      },
                    ]
                  : []),
              ]),
            ),
          },
        ]
      : []
  },
})
const landscape = (
  code: string,
  abilities: (state: GameState, id: string, investigator: string) => AbilityOption[],
) =>
  registerLocation({
    code,
    abilities: (state, self, investigator) => abilities(state, self.id, investigator),
  })
landscape('08631', (state, _id, investigator) =>
  spendTwo(
    state,
    investigator,
    0,
    'planetarium',
    [{ type: 'AddChaosTokens', tokens: [0] }],
    'edgeOfTheEarthAstronomicalCharts',
  ),
)
landscape('08632', (state, id, investigator) => [
  {
    key: `${id}:cross`,
    label: 'ability.edgeOfTheEarth.city.bridgeTest',
    actions: 1,
    provokes: true,
    then: ask(
      investigator,
      'cityBridge',
      (['combat', 'agility'] as const).map((skill) => ({
        label: `choice.test.${skill}`,
        params: { difficulty: 4 },
        then: [
          effectTest(investigator, '08632', skill, 4, {
            onSuccess: [{ type: 'DiscoverClues', investigator, amount: 1, location: id }],
          }),
        ],
      })),
    ),
  },
  ...Object.keys(state.locations)
    .filter((other) => other !== id && other.startsWith('08632'))
    .map((other) => ({
      key: `${id}:bridge:${other}`,
      label: 'ability.edgeOfTheEarth.city.bridgeMove',
      params: positionParams(state, other),
      actions: 1,
      provokes: true,
      then: [{ type: 'MoveTo' as const, investigator, location: other }],
    })),
])
landscape('08633', (state, _id, investigator) =>
  spendTwo(
    state,
    investigator,
    -2,
    'tower',
    [
      { type: 'DrawCards', investigator, amount: 2 },
      { type: 'GainResources', investigator, amount: 2 },
      cityMessage('removeFrost'),
      cityMessage('removeFrost'),
    ],
    'edgeOfTheEarthMuralCarvings',
  ),
)
landscape('08635', (state, _id, investigator) =>
  spendTwo(
    state,
    investigator,
    -3,
    'mapRoom',
    [cityMessage('mapRoom', { investigator, chosen: '' })],
    'edgeOfTheEarthReadTheMap',
  ),
)
landscape('08636', (state, _id, investigator) =>
  spendTwo(
    state,
    investigator,
    -1,
    'rampart',
    [cityMessage('rampart', { investigator })],
    'edgeOfTheEarthAncientVault',
  ),
)
landscape('08638', (state, id) => {
  const row = state.locations[id]?.position?.[1]
  return Object.values(state.locations)
    .filter(
      (location) => location.id !== id && location.position?.[1] === row && location.keys?.length,
    )
    .flatMap((location) =>
      [...new Set(location.keys)].map((key) => ({
        key: `${id}:spires:${location.id}:${String(key)}`,
        label: 'ability.edgeOfTheEarth.city.spires',
        params: { ...positionParams(state, location.id), key: String(key) },
        actions: 1,
        provokes: true,
        limit: { per: 'game' as const, group: true },
        then: [
          {
            type: 'PlaceKey' as const,
            key,
            from: { type: 'location' as const, id: location.id },
            on: { type: 'location' as const, id },
          },
        ],
      })),
    )
})
landscape('08639', (state, id) => {
  if (!state.locations[id]?.clues) return []
  return sameLine(state, id)
    .filter((other) => other !== TUNNEL && !state.locations[other]?.revealed)
    .map((other) => ({
      key: `${id}:clue:${other}`,
      label: 'ability.edgeOfTheEarth.city.passage',
      params: positionParams(state, other),
      actions: 1,
      provokes: true,
      then: [
        {
          type: 'MoveClues' as const,
          from: { type: 'location' as const, id },
          to: { type: 'location' as const, id: other },
          amount: 1,
        },
      ],
    }))
})
landscape('08640', (state, id, investigator) =>
  !state.locations[id]?.clues &&
  Object.values(state.locations).filter(({ keys }) => keys?.length).length >= 2
    ? [
        {
          key: `${id}:swap`,
          label: 'ability.edgeOfTheEarth.city.temple',
          actions: 1,
          provokes: true,
          limit: { per: 'game', group: true },
          then: [cityMessage('templeSwap', { investigator, first: '' })],
        },
      ]
    : [],
)

const frostAt = (code: string) => (state: GameState, investigator: InvestigatorId) =>
  !!hereOf(state, investigator)?.startsWith(code)
/** Labyrinthine Chamber: a key matching the token is here or with an investigator here. */
function matchingKey(state: GameState, investigator: InvestigatorId, token: ChaosToken) {
  const here = hereOf(state, investigator)
  if (!here?.startsWith('08634')) return false
  return (
    !!state.locations[here]?.keys?.includes(token) ||
    state.investigators.some(({ location, keys }) => location === here && keys?.includes(token))
  )
}

function conclusion(state: GameState, outcome: 0 | 1 | 2): Message[] {
  const pairs = Math.floor((state.keysSpent?.length ?? 0) / 2)
  return [
    ...(outcome === 0 ? [{ type: 'Story', entry: story('cityNoResolution') } as Message] : []),
    { type: 'Story', entry: story(outcome === 1 ? 'cityResolution1' : 'cityResolution2') },
    {
      type: 'RecordNote',
      note: outcome === 1 ? 'edgeOfTheEarthFoundHiddenTunnel' : 'edgeOfTheEarthGuidedToTunnel',
    },
    { type: 'EarnExperience', amount: pairs, victory: true },
    endScenario(resolution(outcome === 1 ? 1 : 2)),
  ]
}

function baseToken(state: GameState, token: ChaosToken, investigator: InvestigatorId) {
  const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
  switch (token) {
    case 'skull':
      return { modifier: -((hard ? 2 : 0) + keysOf(state, investigator).length) }
    case 'cultist': {
      const place = cityMessage('dropKey', { investigator })
      return hard ? { modifier: -2, after: [place] } : { modifier: -2, onFail: [place] }
    }
    case 'tablet':
      return { modifier: hard ? -4 : -3 }
    case 'elderThing':
      return {
        modifier: hard ? -5 : -4,
        onFail: [cityMessage('nearestEnemy', { investigator })],
      }
    default:
      return null
  }
}

export const cityRules: ScenarioBehavior = {
  id: EOTE_CITY,
  onAllInvestigatorsEliminated: (state) => conclusion(state, 0),
  canEnter: (state, _investigator, _from, to) =>
    to !== TUNNEL || !!state.locations[TUNNEL]?.revealed,
  cannotDiscoverClues: (_state, _investigator, location) => location === TUNNEL,
  keysBlocked: terrorBlocks,
  blanksTreachery: iceAndDeathRules.blanksTreachery!,
  cannotDrawCards: iceAndDeathRules.cannotDrawCards!,
  cannotPlay: iceAndDeathRules.cannotPlay!,
  tokenOverride: (state, token, investigator) => {
    if (!matchingKey(state, investigator, token)) return null
    // Labyrinthine Chamber: double the modifier of a token that matches a key.
    const effect =
      typeof token === 'number' ? { modifier: token } : baseToken(state, token, investigator)
    return effect ? { ...effect, modifier: effect.modifier * 2 } : null
  },
  tokenEffect: (state, token, investigator) =>
    baseToken(state, token, investigator) ?? { modifier: 0 },
  forced: (state, trigger) => {
    if (trigger.type !== 'afterRevealChaosToken' || !state.skillTest) return []
    const test = state.skillTest
    const investigator = trigger.investigator
    const messages: Message[] = []
    // Tablet: a [frost] revealed during this test makes it fail (hard: also 1 damage).
    const tokens = test.tokens
    const earlier = tokens.slice(0, -1)
    if (
      (trigger.token === 'tablet' && earlier.includes('frost') && !earlier.includes('tablet')) ||
      (trigger.token === 'frost' && earlier.includes('tablet') && !earlier.includes('frost'))
    ) {
      const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
      messages.push(
        ...(hard ? [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 } as Message] : []),
        { type: 'ForceSkillTestFailure' } as Message,
      )
    }
    if (trigger.token === 'frost' && !tokens.slice(0, -1).includes('frost')) {
      if (frostAt('08637')(state, investigator))
        messages.push({ type: 'TakeDamage', investigator, damage: 1, horror: 0 })
      if (frostAt('08640')(state, investigator))
        messages.push({ type: 'TakeDamage', investigator, damage: 0, horror: 1 })
    }
    return messages
  },
  reactions: (state, trigger) => {
    // Ruinous Streets: after you discover the last clue, discover 1 on a connecting location.
    if (trigger.type !== 'afterDiscoverClues') return []
    const location = state.locations[trigger.location ?? '']
    if (!location?.id.startsWith('08637') || location.clues) return []
    return location.connections
      .filter((id) => (state.locations[id]?.clues ?? 0) > 0 && id !== TUNNEL)
      .slice(0, 1)
      .map(() => ({
        key: `${location.id}:last`,
        investigator: trigger.investigator,
        label: 'ability.edgeOfTheEarth.city.streets',
        then: ask(
          trigger.investigator,
          'cityStreets',
          location.connections
            .filter((id) => (state.locations[id]?.clues ?? 0) > 0 && id !== TUNNEL)
            .map((id) => ({
              label: 'choice.edgeOfTheEarth.cityLandscape',
              params: positionParams(state, id),
              target: { type: 'location', id },
              then: [
                {
                  type: 'DiscoverClues',
                  investigator: trigger.investigator,
                  amount: 1,
                  location: id,
                },
              ],
            })),
        ),
      }))
  },
  specific: (state, key, data) =>
    cityStep(state, key, data) ?? iceAndDeathRules.specific?.(state, key, data) ?? state,
}

function cityStep(state: GameState, key: string, data: Record<string, unknown>): GameState | null {
  const investigator = String(data.investigator ?? '')
  const lead = leadInvestigator(state)?.id ?? state.investigators[0]!.id
  switch (key) {
    case 'chooseStart':
      return push(
        state,
        ...ask(
          lead,
          'cityStart',
          outermost.map((position) => {
            const id = Object.values(state.locations).find(
              ({ position: at }) => at?.[0] === position[0] && at[1] === position[1],
            )!.id
            return {
              label: 'choice.edgeOfTheEarth.cityLandscape',
              params: positionParams(state, id),
              target: { type: 'location', id },
              then: [{ type: 'PlaceAtStart', lead: id, others: id }],
            }
          }),
        ),
      )
    case 'remember':
      return { ...state, scenarioMeta: { ...state.scenarioMeta, [`city:${String(data.key)}`]: 1 } }
    case 'look': {
      const location = state.locations[String(data.location)]
      return location
        ? push(
            state,
            ...ask(investigator, 'cityLooked', [
              {
                label: 'choice.edgeOfTheEarth.cityLooked',
                params: { name: location.name },
                then: [],
              },
            ]),
          )
        : state
    }
    case 'tunnelClues': {
      const tunnel = state.locations[TUNNEL]
      if (!tunnel) return state
      return {
        ...state,
        locations: {
          ...state.locations,
          [TUNNEL]: { ...tunnel, clues: Math.max(0, tunnel.clues - Number(data.amount)) },
        },
      }
    }
    case 'undercity': {
      const act = String(data.act)
      const deferred = act === '08625' ? ['08689', '08690', '08691'] : ['08710', '08711']
      return push(
        shuffleIntoEncounter(state, deferred),
        { type: 'RevealLocation', location: TUNNEL },
        ...(act === '08624'
          ? [
              {
                type: 'SpawnSetAsideEnemy' as const,
                code: CITY_TERROR,
                location: TUNNEL,
                entersExhausted: true,
              },
            ]
          : act === '08625'
            ? [{ type: 'AddChaosTokens' as const, tokens: ['frost' as const] }]
            : activeInvestigators(state).map(({ id }): Message => ({
                type: 'DrawEncounterCard',
                investigator: id,
              }))),
      )
    }
    case 'pursuitHeal':
      // Each investigator may heal 1 damage, 1 horror, and 1 trauma.
      return push(
        state,
        ...activeInvestigators(state).flatMap(({ id }): Message[] => {
          const record = state.campaignLog?.investigators[id]
          const heal: Message = { type: 'Heal', investigator: id, healer: id, damage: 1, horror: 1 }
          const trauma = (kind: 'physical' | 'mental'): Choice => ({
            label: `choice.edgeOfTheEarth.cityHeal${kind === 'physical' ? 'Physical' : 'Mental'}`,
            then: [heal, { type: 'SufferTrauma', investigator: id, [kind]: -1 }],
          })
          const choices: Choice[] = [
            ...((record?.physicalTrauma ?? 0) > 0 ? [trauma('physical')] : []),
            ...((record?.mentalTrauma ?? 0) > 0 ? [trauma('mental')] : []),
            { label: 'choice.edgeOfTheEarth.cityHealWounds', then: [heal] },
          ]
          return ask(id, 'cityHeal', choices)
        }),
      )
    case 'pursuitTekelili':
      return activeInvestigators(state).reduce((current, { id }) => {
        const player = getInvestigator(current, id)
        const tekelili = player.deck.filter((code) => /^087(2[3-9])$/.test(code))
        if (!tekelili.length) return current
        const [deck, rng] = shuffle(
          player.deck.filter((code) => !tekelili.includes(code)),
          current.rng,
        )
        const [pool, rng2] = shuffle([...(current.tekeliliDeck ?? []), ...tekelili], rng)
        return {
          ...current,
          rng: rng2,
          tekeliliDeck: pool,
          investigators: current.investigators.map((i) => (i.id === id ? { ...i, deck } : i)),
          ...(current.campaignLog
            ? {
                campaignLog: {
                  ...current.campaignLog,
                  investigators: {
                    ...current.campaignLog.investigators,
                    [id]: {
                      ...current.campaignLog.investigators[id]!,
                      storyAssets: current.campaignLog.investigators[id]!.storyAssets.filter(
                        (code) => !tekelili.includes(code),
                      ),
                    },
                  },
                },
              }
            : {}),
        }
      }, state)
    case 'removeElderThings':
      return { ...state, chaosBag: state.chaosBag.filter((token) => token !== 'elderThing') }
    case 'removeFrost':
      return iceAndDeathRules.specific?.(state, 'removeFrost', {}) ?? state
    case 'dropKey': {
      const keys = [...new Set(keysOf(state, investigator))]
      const here = hereOf(state, investigator)
      if (!keys.length || !here) return state
      const drop = (key: ChaosToken): Message => ({
        type: 'PlaceKey',
        key,
        from: { type: 'investigator', id: investigator },
        on: { type: 'location', id: here },
      })
      return keys.length === 1
        ? push(state, drop(keys[0]!))
        : push(
            state,
            ...ask(
              investigator,
              'cityDropKey',
              keys.map((k) => ({
                label: 'choice.edgeOfTheEarth.cityKey',
                params: { key: String(k) },
                then: [drop(k)],
              })),
            ),
          )
    }
    case 'nearestEnemy': {
      // Elder Thing token: the nearest enemy moves once toward you and attacks if engaged.
      const here = hereOf(state, investigator)
      if (!here) return state
      const distance = distancesFrom(state, here)
      const enemies = Object.values(state.enemies).filter(({ location }) => distance.has(location))
      if (!enemies.length) return state
      const nearest = Math.min(...enemies.map(({ location }) => distance.get(location)!))
      const enemy = enemies.find(({ location }) => distance.get(location) === nearest)!
      const step = nextStepToward(state, enemy.location, (location) => location === here)
      return push(
        state,
        ...(step ? [{ type: 'MoveEnemy' as const, enemy: enemy.id, location: step }] : []),
        cityMessage('nearestAttack', { investigator, enemy: enemy.id }),
      )
    }
    case 'nearestAttack': {
      const enemy = state.enemies[String(data.enemy)]
      return enemy?.engagedWith === investigator
        ? push(state, { type: 'EnemyAttack', enemy: enemy.id, investigator, exhaustAfter: false })
        : state
    }
    case 'mapRoom': {
      const chosen = String(data.chosen ?? '')
        .split(',')
        .filter(Boolean)
      if (chosen.length >= 3)
        return push(
          state,
          ...chosen.flatMap((id): Message[] => [
            { type: 'RevealLocation', location: id },
            { type: 'DiscoverClues', investigator, amount: 1, location: id },
          ]),
        )
      return push(
        state,
        ...ask(
          investigator,
          'cityMapRoom',
          Object.keys(state.locations)
            .filter((id) => id !== TUNNEL && !chosen.includes(id))
            .map((id) => ({
              label: 'choice.edgeOfTheEarth.cityLandscape',
              params: positionParams(state, id),
              target: { type: 'location', id },
              then: [cityMessage('mapRoom', { investigator, chosen: [...chosen, id].join(',') })],
            })),
        ),
      )
    }
    case 'rampart':
      return push(
        state,
        ...ask(investigator, 'cityRampart', [
          ...(state.doom > 0
            ? [
                {
                  label: 'choice.edgeOfTheEarth.cityRemoveDoom',
                  then: [{ type: 'RemoveDoom', target: { type: 'agenda' }, amount: 1 } as Message],
                },
              ]
            : []),
          ...Object.values(state.enemies)
            .filter(({ traits }) => !traits?.includes('Elite'))
            .map((enemy) => ({
              label: 'choice.enemy',
              params: { enemy: enemy.name },
              target: { type: 'enemy' as const, id: enemy.id },
              then: [{ type: 'DiscardEnemy', enemy: enemy.id } as Message],
            })),
          ...Object.values(state.treacheries)
            .filter(
              ({ placement, traits }) => placement.type !== 'limbo' && !traits?.includes('Elite'),
            )
            .map((card) => ({
              label: 'choice.card',
              params: { card: card.name },
              then: [{ type: 'DiscardTreachery', treachery: card.id } as Message],
            })),
        ]),
      )
    case 'templeSwap': {
      const first = String(data.first ?? '')
      const keyed = Object.values(state.locations).filter(
        ({ id, keys }) => keys?.length && id !== first,
      )
      if (first) {
        const second = String(data.second ?? '')
        if (second)
          return {
            ...state,
            locations: {
              ...state.locations,
              [first]: { ...state.locations[first]!, keys: state.locations[second]!.keys ?? [] },
              [second]: { ...state.locations[second]!, keys: state.locations[first]!.keys ?? [] },
            },
          }
      }
      return push(
        state,
        ...ask(
          investigator,
          'cityTemple',
          keyed.map((location) => ({
            label: 'choice.edgeOfTheEarth.cityLandscape',
            params: positionParams(state, location.id),
            target: { type: 'location', id: location.id },
            then: [
              cityMessage(
                'templeSwap',
                first
                  ? { investigator, first, second: location.id }
                  : { investigator, first: location.id },
              ),
            ],
          })),
        ),
      )
    }
    default:
      return null
  }
}

function shuffleIntoEncounter(state: GameState, codes: string[]): GameState {
  const moving = state.setAside.filter(({ code }) => codes.includes(code))
  const [encounterDeck, rng] = shuffle(
    [...state.encounterDeck, ...moving, ...state.encounterDiscard],
    state.rng,
  )
  return {
    ...state,
    rng,
    encounterDeck,
    encounterDiscard: [],
    setAside: state.setAside.filter(({ code }) => !codes.includes(code)),
  }
}

registerScenario(cityRules)
