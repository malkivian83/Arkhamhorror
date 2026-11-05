import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  push,
  testMargin,
  updateInvestigator,
  registerAct,
  registerAgenda,
  registerScenario,
  turnStartedAt,
  type Choice,
  type GameState,
  type Message,
  type ScenarioDefinition,
  type StoryEntry,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { endScenario, resolution } from '../scenario-helpers'
import {
  CRASH,
  ICE_AND_DEATH,
  SKITTERING,
  TERROR,
  creatures,
  encounters,
  setAside,
  shelter,
  sites,
} from './ice-and-death-cards'
import { edgeOfTheEarthOpening, startingFrostRemoved } from './opening'
import { iceCanAddFrost } from './ice-and-death-locations'
import { iceTreacheryBlank } from './companion-ellsworth'

const story = (part: string): StoryEntry => ({
  title: `story.edgeOfTheEarth.${part}.title`,
  body: `story.edgeOfTheEarth.${part}.body`,
})
const read = (part: string): Message => ({ type: 'Story', entry: story(part) })
export const iceMessage = (
  key: string,
  data: Record<string, string | number | boolean>,
): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})

export function iceAndDeathPartOne(context: ScenarioContext): ScenarioDefinition {
  const doom = context.difficulty === 'expert' ? 2 : context.difficulty === 'hard' ? 1 : 0
  return edgeOfTheEarthOpening(context, {
    id: ICE_AND_DEATH,
    setupInstructions: story('setup'),
    locations: sites.slice(0, 4),
    setAsideLocations: sites.slice(4),
    startingLocation: CRASH,
    agendas: [
      { code: '08518', name: 'Cold Welcome', doomThreshold: 4 },
      { code: '08519', name: 'Into the White', doomThreshold: 7 },
      { code: '08520', name: 'Running Out of Time', doomThreshold: 7 },
    ],
    acts: [
      {
        code: '08521',
        name: 'Search for a Camp Site',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: encounters,
    setAside: setAside(context.investigators.length),
    chaosBag: [],
    tokenValues: {},
    setup: doom ? [{ type: 'PlaceDoom', amount: doom }] : [],
  })
}

export function tekeliliOrHorror(
  state: GameState,
  investigator: string,
  amount: number,
): Message[] {
  const available = Math.min(state.tekeliliDeck?.length ?? 0, amount)
  return [
    ...(available
      ? [{ type: 'ShuffleTekeliliIntoDeck', investigator, amount: available } as const]
      : []),
    ...(available < amount
      ? [{ type: 'TakeDamage', investigator, damage: 0, horror: amount - available } as const]
      : []),
  ]
}

function terrorHere(state: GameState, location: string): boolean {
  return Object.values(state.enemies).some(
    (enemy) => enemy.code === TERROR && !enemy.exhausted && enemy.location === location,
  )
}

function camp(state: GameState, location: string, relocate: boolean): Message[] {
  return [
    { type: 'RecordExpeditionCamp', location, shelter: shelter(location) },
    ...activeInvestigators(state).flatMap(({ id, location: from }): Message[] => [
      ...(relocate && from !== location
        ? [{ type: 'MoveTo', investigator: id, location, unpreventable: true } as const]
        : []),
      { type: 'Resign', investigator: id },
    ]),
  ]
}

function chooseCamp(state: GameState, relocate: boolean): Message[] {
  const eligible = Object.values(state.locations).filter(
    ({ id, clues }) => clues === 0 && (!relocate || !terrorHere(state, id)),
  )
  const options = eligible.length ? eligible.map(({ id }) => id) : [CRASH]
  const choices = options.map((location): Choice => ({
    label: 'choice.edgeOfTheEarth.camp',
    target: { type: 'location', id: location },
    params: { name: state.locations[location]!.name, shelter: shelter(location) },
    then: relocate
      ? camp(state, location, true)
      : [
          { type: 'RecordExpeditionCamp', location, shelter: shelter(location) },
          iceMessage('finish', { success: false }),
        ],
  }))
  const investigator = leadInvestigator(state) ?? state.investigators[0]!
  return [
    {
      type: 'Ask',
      investigator: investigator.id,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.edgeOfTheEarth.camp',
        choices,
      },
    },
  ]
}

export const attached = (state: GameState, location: string | null, code?: string) =>
  Object.values(state.treacheries).filter(
    (card) =>
      card.placement.type === 'location' &&
      card.placement.location === location &&
      (!code || card.code === code),
  )

function underTreachery(state: GameState, investigator: string, code: string): boolean {
  return attached(state, getInvestigator(state, investigator).location, code).some(
    ({ id }) => !iceTreacheryBlank(state, id),
  )
}

registerAct({
  code: '08521',
  abilities: (state, _act, investigator) => {
    const { location } = getInvestigator(state, investigator)
    if (
      !location ||
      state.locations[location]?.clues !== 0 ||
      terrorHere(state, location) ||
      activeInvestigators(state).some((player) => player.location !== location)
    )
      return []
    return [
      {
        key: 'ice-and-death-camp',
        label: 'ability.edgeOfTheEarth.camp',
        actions: 1,
        provokes: false,
        then: camp(state, location, false),
      },
    ]
  },
})
registerAgenda({
  code: '08518',
  onAdvance: (state) => {
    const location = leadInvestigator(state)?.location
    return [
      read('coldWelcome'),
      ...(location ? [{ type: 'SpawnSetAsideEnemy', code: SKITTERING, location } as const] : []),
      {
        type: 'ShuffleSetAsideIntoEncounter',
        codes: [SKITTERING, ...new Set(creatures.map(({ code }) => code))],
      },
    ]
  },
})
registerAgenda({
  code: '08519',
  onAdvance: (state) => {
    const revealed = Object.values(state.locations).filter((location) => location.revealed)
    const highest = Math.max(...revealed.map(({ id }) => shelter(id)))
    const choices: Choice[] = revealed
      .filter(({ id }) => shelter(id) === highest)
      .map(({ id, name }) => ({
        label: 'choice.edgeOfTheEarth.spawnTerror',
        params: { name },
        target: { type: 'location', id },
        then: [{ type: 'SpawnSetAsideEnemy', code: TERROR, location: id }],
      }))
    const lead = leadInvestigator(state)
    return [
      read('intoTheWhite'),
      ...(lead
        ? [
            {
              type: 'Ask' as const,
              investigator: lead.id,
              question: {
                kind: 'chooseOne' as const,
                prompt: 'prompt.edgeOfTheEarth.terror',
                choices,
              },
            },
          ]
        : []),
    ]
  },
})
registerAgenda({
  code: '08520',
  onAdvance: (state) => [
    read('runningOutOfTime'),
    ...state.investigators.map(({ id }): Message => ({
      type: 'ShuffleTekeliliIntoDeck',
      investigator: id,
      amount: 1,
      includeEliminated: true,
    })),
    iceMessage('chooseCamp', {}),
  ],
})

registerScenario({
  id: ICE_AND_DEATH,
  onAllInvestigatorsEliminated: (state) =>
    state.investigators.some((player) => player.resigned)
      ? [iceMessage('finish', { success: true })]
      : [read('noResolution'), ...chooseCamp(state, false)],
  cannotDiscoverClues: (state, _investigator, location) => terrorHere(state, location),
  blanksTreachery: (state, card) => iceTreacheryBlank(state, card.id),
  drawTekeliliInstead: (state, investigator) => underTreachery(state, investigator, '08691'),
  cannotDrawCards: (state, investigator) => underTreachery(state, investigator, '08692'),
  cannotPlay: (state, investigator) => underTreachery(state, investigator, '08692'),
  shroudModifier: (state, location) =>
    location.id === '08503' && attached(state, location.id).length ? 2 : 0,
  tokenOverride: (state, token, investigator) =>
    token === 'frost' &&
    getInvestigator(state, investigator).location === '08507' &&
    !state.skillTest?.tokens.includes('frost') &&
    (state.skillTest?.frostFromBag ?? 0) < 2
      ? { modifier: -3, revealAnother: true }
      : null,
  tokenEffect: (state, token, investigator) => {
    const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
    const value = shelter(getInvestigator(state, investigator).location)
    const byMargin = (key: string) => [iceMessage(key, { investigator })]
    switch (token) {
      case 'skull':
        return { modifier: -(hard ? value : Math.ceil(value / 2)) }
      case 'cultist':
        return hard
          ? { modifier: -2, onFail: byMargin('cultistHard') }
          : { modifier: -2, onFail: [iceMessage('tekelili', { investigator, amount: 1 })] }
      case 'tablet':
        return { modifier: hard ? -4 : -3, onFail: byMargin('millTablet') }
      default:
        return { modifier: 0 }
    }
  },
  forced: (state, trigger) => {
    if (
      trigger.type === 'treacheryAttached' &&
      trigger.location === '08508' &&
      state.scenarioMeta?.rockyCragsSurge !== `${state.round}:${state.phase}`
    )
      return [iceMessage('rockyCragsSurge', {})]
    if (trigger.type === 'afterRevealChaosToken' && trigger.token === 'frost') {
      const investigator = trigger.investigator
      const location = getInvestigator(state, investigator).location
      const kind = state.skillTest?.kind
      const source = kind?.type === 'effect' ? kind.source : undefined
      return [
        ...(location === '08504' && state.skillTest
          ? [iceMessage('pathFrost', { investigator })]
          : []),
        ...(source === '08698' || source === '08713'
          ? [
              {
                type: 'TakeDamage' as const,
                investigator,
                damage: source === '08698' ? 1 : 0,
                horror: source === '08713' ? 1 : 0,
              },
            ]
          : []),
      ]
    }
    if (trigger.type !== 'whenEnterLocation') return []
    return sites
      .filter(
        ({ id, connections }) =>
          state.setAsideLocations?.[id] && connections.includes(trigger.location),
      )
      .map(({ id }): Message => ({
        type: 'PutLocationIntoPlay',
        location: id,
        investigator: trigger.investigator,
      }))
  },
  reactions: (state, trigger) => {
    if (
      trigger.type === 'whenTreacheryDrawn' &&
      getInvestigator(state, trigger.investigator).location === '08505' &&
      state.treacheries[trigger.treachery]?.traits?.includes('Hazard') &&
      iceCanAddFrost(state)
    )
      return [
        {
          key: '08505:cancel',
          investigator: trigger.investigator,
          label: 'ability.edgeOfTheEarth.iceSheet',
          limit: { per: 'round', group: true },
          then: [
            { type: 'AddChaosTokens', tokens: ['frost'] },
            { type: 'CancelRevelation', treachery: trigger.treachery },
          ],
        },
      ]
    if (
      trigger.type === 'afterSkillTest' &&
      trigger.kind === 'investigate' &&
      trigger.succeeded &&
      trigger.location === '08506' &&
      iceCanAddFrost(state)
    )
      return [
        {
          key: '08506:clues',
          investigator: trigger.investigator,
          label: 'ability.edgeOfTheEarth.snowdrifts',
          limit: { per: 'game', group: true },
          then: [
            { type: 'AddChaosTokens', tokens: ['frost'] },
            {
              type: 'DiscoverClues',
              investigator: trigger.investigator,
              location: trigger.location,
              amount: 3,
            },
          ],
        },
      ]
    if (
      trigger.type === 'afterDiscoverClues' &&
      trigger.last &&
      trigger.location === '08509' &&
      (state.tekeliliDeck?.length ?? 0) >= 3 &&
      !state.campaignLog?.expedition?.supplies.includes('08614')
    )
      return [
        {
          key: '08509:supply',
          investigator: trigger.investigator,
          label: 'ability.edgeOfTheEarth.supply08614',
          then: [
            { type: 'ShuffleTekeliliIntoDeck', investigator: trigger.investigator, amount: 3 },
            { type: 'RecoverExpeditionSupply', supply: '08614' },
          ],
        },
      ]
    return []
  },
  specific: (state, key, data) => {
    const investigator = String(data.investigator)
    const margin = state.skillTest ? Math.max(0, -testMargin(state.skillTest)) : 0
    const ask = (prompt: string, choices: Choice[]) =>
      push(state, {
        type: 'Ask',
        investigator,
        question: { kind: 'chooseOne', prompt: `prompt.edgeOfTheEarth.${prompt}`, choices },
      })
    const take = (damage: number, horror: number): Message => ({
      type: 'TakeDamage',
      investigator,
      damage,
      horror,
    })
    switch (key) {
      case 'blank':
        return {
          ...state,
          scenarioMeta: {
            ...state.scenarioMeta,
            [`blank:${data.treachery}`]: turnStartedAt(state),
          },
        }
      case 'rockyCragsSurge':
        return push(
          {
            ...state,
            scenarioMeta: {
              ...state.scenarioMeta,
              rockyCragsSurge: `${state.round}:${state.phase}`,
            },
          },
          { type: 'GainSurge' },
        )
      case 'pathFrost':
        return ask('pathFrost', [
          { label: 'choice.edgeOfTheEarth.damage', then: [take(1, 0)] },
          { label: 'choice.edgeOfTheEarth.horror', then: [take(0, 1)] },
        ])
      case 'apeirophobia':
        return ask('apeirophobia', [
          {
            label: 'choice.edgeOfTheEarth.takeHorror',
            params: { amount: margin },
            then: [take(0, margin)],
          },
          ...(getInvestigator(state, investigator).clues >= 2
            ? [
                {
                  label: 'choice.edgeOfTheEarth.placeClues',
                  then: [{ type: 'PlaceCluesOnLocation' as const, investigator, amount: 2 }],
                },
              ]
            : []),
          ...(iceCanAddFrost(state)
            ? [
                {
                  label: 'choice.edgeOfTheEarth.addFrost',
                  then: [{ type: 'AddChaosTokens' as const, tokens: ['frost' as const] }],
                },
              ]
            : []),
        ])
      case 'ship':
        return ask('ship', [
          {
            label: 'ability.edgeOfTheEarth.supply08619',
            then: [{ type: 'RecoverExpeditionSupply', supply: '08619' }],
          },
          ...(state.chaosBag.includes('frost')
            ? [
                {
                  label: 'choice.edgeOfTheEarth.removeFrost',
                  then: [
                    iceMessage('removeFrost', {}),
                    { type: 'RecordNote' as const, note: 'edgeOfTheEarthShipSearched' },
                  ],
                },
              ]
            : []),
        ])
      case 'removeFrost': {
        const index = state.chaosBag.indexOf('frost')
        if (index < 0) return state
        const removed = (tokens: GameState['chaosBag']) =>
          tokens.filter((_, i) => i !== tokens.indexOf('frost'))
        const log = state.campaignLog
        const campaignLog =
          log &&
          (log.chaosTokens.includes('frost')
            ? { ...log, chaosTokens: removed(log.chaosTokens) }
            : { ...log, values: { ...log.values, [startingFrostRemoved]: '1' } })
        return {
          ...state,
          chaosBag: removed(state.chaosBag),
          ...(campaignLog ? { campaignLog } : {}),
        }
      }
      case 'cultistHard':
        return push(state, ...tekeliliOrHorror(state, investigator, margin))
      case 'shuffleTekelili':
        return push(state, {
          type: 'ShuffleTekeliliIntoDeck',
          investigator,
          amount: Number(data.amount),
        })
      case 'phantasm': {
        const enemy = state.enemies[String(data.enemy)]
        if (!enemy) return state
        const nearby = [enemy.location, ...(state.locations[enemy.location]?.connections ?? [])]
        return push(
          state,
          ...activeInvestigators(state)
            .filter(({ location }) => location && nearby.includes(location))
            .map(({ id }) => iceMessage('tekelili', { investigator: id, amount: 1 })),
        )
      }
      case 'chooseCamp':
        return push(state, ...chooseCamp(state, true))
      case 'tekelili':
        return push(state, ...tekeliliOrHorror(state, investigator, Number(data.amount)))
      case 'millTablet': {
        const cards = getInvestigator(state, investigator).deck.slice(0, margin)
        const weaknesses = cards.filter((code) => playerCardDef(code)?.weakness)
        const ordinary = cards.filter((code) => !playerCardDef(code)?.weakness)
        return push(
          updateInvestigator(state, investigator, (player) => ({
            ...player,
            deck: player.deck.slice(cards.length),
            hand: [...player.hand, ...weaknesses],
            discard: [...player.discard, ...ordinary],
          })),
          { type: 'ResolveDrawnRevelations', investigator, cards: weaknesses },
        )
      }
      case 'finish': {
        const bonus = Math.max(3, state.campaignLog?.expedition?.camp?.shelter ?? 0)
        return push(
          state,
          ...(data.success ? [read('resolution1')] : []),
          {
            type: 'RecordNote',
            note: 'edgeOfTheEarthRevealedLocations',
            value: Object.values(state.locations)
              .filter(({ revealed }) => revealed)
              .map(({ id }) => id)
              .join(','),
          },
          { type: 'EarnExperience', amount: bonus, victory: true },
          endScenario(data.success ? resolution(1) : { type: 'noResolution' }),
        )
      }
      default:
        return state
    }
  },
})
