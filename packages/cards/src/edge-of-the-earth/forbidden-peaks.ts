import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  nextInt,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  registerLocation,
  registerScenario,
  seedRng,
  shuffle,
  updateInvestigator,
  type Choice,
  type ExpeditionPartner,
  type ExpeditionSupply,
  type GameState,
  type InvestigatorId,
  type Message,
  type ScenarioBehavior,
  type ScenarioDefinition,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { copies, effectTest, endScenario, resolution } from '../scenario-helpers'
import { iceTreacheryBlank } from './companion-ellsworth'
import {
  CONSTRICTING,
  PEAKS_TERROR,
  SUMMIT,
  isExpedition,
  levelOf,
  locationAtLevel,
  mountain,
  mountainsides,
  peaksEncounters,
  terrorOfTheStars,
} from './forbidden-peaks-cards'
import { peaksEncounterStep } from './forbidden-peaks-encounters'
import { sledgeAbilities, supplyStep } from './forbidden-peaks-supplies'
import { attached } from './ice-and-death'
import { EOTE_FORBIDDEN_PEAKS, encounters } from './ice-and-death-cards'
import { iceCanAddFrost } from './ice-and-death-locations'
import {
  blasphemousVisions,
  glimpseTheUnspeakable,
  nightmarishVapors,
} from './mirage-shared-encounters'
import { edgeOfTheEarthStartingBag } from './opening'

export const climbedSummit = 'edgeOfTheEarthClimbedSummit'
export const foundAnotherWay = 'edgeOfTheEarthFoundAnotherWay'
const scouted = 'edgeOfTheEarthScoutedMountainPass'

export const peaksMessage = (key: string, data: Record<string, string | number> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const story = (key: string) => ({
  title: `story.edgeOfTheEarth.${key}.title`,
  body: `story.edgeOfTheEarth.${key}.body`,
})
const read = (key: string): Message => ({ type: 'Story', entry: story(key) })
const frost: Message = { type: 'AddChaosTokens', tokens: ['frost'] }

const alive = (state: GameState, partner: ExpeditionPartner) => {
  const status = state.campaignLog?.expedition?.partners[partner]?.status
  return status === 'safe' || status === 'resolute'
}
const supplies = (state: GameState): ExpeditionSupply[] =>
  state.campaignLog?.expedition?.supplies ?? []

export function forbiddenPeaks(context: ScenarioContext): ScenarioDefinition {
  const players = context.investigators.length
  const [shuffled] = shuffle(
    mountainsides.map(([code]) => code),
    seedRng(context.seed),
  )
  const locations = mountain(shuffled.slice(0, 5))
  const start = locations[0]!
  // Introduction 1: the scouted pass halves the starting location's clue value (rounded up).
  if (context.log.notes.includes(scouted))
    Object.assign(start, {
      clueValue: Math.ceil((start.clueValue * players) / 2),
      cluesPerInvestigator: false,
    })
  const doom = context.difficulty === 'expert' ? 2 : context.difficulty === 'hard' ? 1 : 0
  const recovered = context.log.expedition?.supplies ?? []
  return {
    startingBonuses: interludeBonuses(context, 'edgeOfTheEarthPeaks'),
    id: EOTE_FORBIDDEN_PEAKS,
    intro: story('peaksIntro1'),
    setupInstructions: story('peaksSetup'),
    locations,
    startingLocation: start.id,
    chaosBag: edgeOfTheEarthStartingBag(context),
    tokenValues: {},
    agendas: [
      { code: '08597', name: 'Forbidden Peaks', doomThreshold: 6 },
      { code: '08598', name: 'Terror Descends', doomThreshold: 8 },
    ],
    acts: [
      {
        code: '08599',
        name: 'Ascend the Mountain',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...peaksEncounters,
      ...encounters.filter(({ code }) =>
        ['08692', '08693', '08694', '08698', '08699'].includes(code),
      ),
      ...[blasphemousVisions, glimpseTheUnspeakable, nightmarishVapors].flatMap((card) =>
        copies(card, 2),
      ),
    ],
    setAside: [terrorOfTheStars(players)],
    setup: [
      peaksMessage('intro'),
      ...recovered.map((code): Message => ({
        type: 'PlaceAsset',
        code,
        name: playerCardDef(code)?.name ?? code,
        placement: { type: 'location', location: start.id },
      })),
      { type: 'AddChaosTokens', tokens: ['elderThing'] },
      ...(doom ? [{ type: 'PlaceDoom' as const, amount: doom }] : []),
      { type: 'InitializeTekeliliDeck' },
      { type: 'ChooseExpeditionPartners' },
    ],
  }
}

/**
 * Restful Night (Danforth, Takada) and Endless Night: the chosen investigator begins the
 * next scenario with 2 additional cards in their opening hand, or 3 additional resources.
 */
export function interludeBonuses(
  context: ScenarioContext,
  prefix: string,
): NonNullable<ScenarioDefinition['startingBonuses']> {
  const bonuses: NonNullable<ScenarioDefinition['startingBonuses']> = {}
  const hand = context.log.values[`${prefix}:startingHand`]
  const resources = context.log.values[`${prefix}:startingResources`]
  if (hand && context.investigators.includes(hand)) bonuses[hand] = { openingHand: 2 }
  if (resources && context.investigators.includes(resources))
    bonuses[resources] = { ...bonuses[resources], resources: 3 }
  return bonuses
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

/** Introduction 1: each passage of the Campaign Log check, with its choice when it applies. */
function introduction(state: GameState): Message[] {
  const lead = leadInvestigator(state)?.id
  const sledge = alive(state, '08716') && supplies(state).includes('08615')
  const frostOr = (trauma: 'physical' | 'mental'): Message[] =>
    lead
      ? ask(lead, 'peaksHardship', [
          ...(iceCanAddFrost(state)
            ? [{ label: 'choice.edgeOfTheEarth.addFrost', then: [frost] }]
            : []),
          {
            label: `choice.edgeOfTheEarth.${trauma}Trauma`,
            then: [{ type: 'SufferTrauma', [trauma]: 1 }],
          },
        ])
      : []
  return [
    ...(sledge ? [read('peaksEliyah')] : [read('peaksNoSledge'), frost]),
    ...(alive(state, '08718')
      ? [read('peaksClaypool')]
      : [read('peaksNoClaypool'), ...frostOr('physical')]),
    ...(alive(state, '08722')
      ? [read('peaksTakada')]
      : [read('peaksNoTakada'), ...frostOr('mental')]),
    read(state.campaignLog?.notes.includes(scouted) ? 'peaksScouted' : 'peaksNotScouted'),
    read('peaksIntro2'),
  ]
}

const inPlay = (state: GameState) =>
  activeInvestigators(state).filter(({ location, resigned }) => location && !resigned)
const below = (state: GameState, investigator: InvestigatorId) => {
  const level = levelOf(state, getInvestigator(state, investigator).location)
  return level > 0 ? locationAtLevel(state, level - 1) : undefined
}
const moveDown = (investigator: InvestigatorId) => peaksMessage('moveDown', { investigator })
const loseExpedition = (investigator: InvestigatorId) =>
  peaksMessage('loseExpedition', { investigator })
const expeditionAssets = (state: GameState, investigator: InvestigatorId) =>
  Object.values(state.assets).filter(
    ({ owner, code }) => owner === investigator && isExpedition(code),
  )

/** Lose control of Expedition assets: each one, or one of the investigator's choice. */
function release(state: GameState, investigator: InvestigatorId, all: boolean): GameState {
  const location = getInvestigator(state, investigator).location
  const assets = expeditionAssets(state, investigator)
  if (!location || !assets.length) return state
  const drop = (id: string): Message => ({
    type: 'ReleaseAsset',
    asset: id,
    placement: { type: 'location', location },
  })
  if (all || assets.length === 1) return push(state, ...assets.map(({ id }) => drop(id)))
  return push(
    state,
    ...ask(
      investigator,
      'peaksLoseExpedition',
      assets.map(({ id, code }) => ({
        label: 'choice.edgeOfTheEarth.asset',
        params: { name: playerCardDef(code)?.name ?? code },
        target: { type: 'asset', id },
        then: [drop(id)],
      })),
    ),
  )
}

/** Discard the top cards of the deck and draw each weakness discarded this way. */
export function millWeaknesses(state: GameState, investigator: InvestigatorId, n: number) {
  const cards = getInvestigator(state, investigator).deck.slice(0, n)
  const weaknesses = cards.filter((code) => playerCardDef(code)?.weakness)
  return push(
    updateInvestigator(state, investigator, (player) => ({
      ...player,
      deck: player.deck.slice(cards.length),
      hand: [...player.hand, ...weaknesses],
      discard: [...player.discard, ...cards.filter((code) => !weaknesses.includes(code))],
    })),
    { type: 'ResolveDrawnRevelations', investigator, cards: weaknesses },
  )
}

/** Scenario Interlude: Tragedy Strikes (Campaign Guide, p. 29). */
function tragedy(state: GameState, terror: string): GameState {
  const partners = (
    Object.entries(state.campaignLog?.expedition?.partners ?? {}) as [
      ExpeditionPartner,
      { status: string },
    ][]
  )
    .filter(([, record]) => record.status === 'safe')
    .map(([code]) => code)
  if (!partners.length) return state
  const [index, rng] = nextInt(state.rng, partners.length)
  const victim = partners[index]!
  const asset = Object.values(state.assets).find(
    ({ expeditionPartner }) => expeditionPartner === victim,
  )
  return push(
    { ...state, rng },
    read('peaksTragedy'),
    ...(victim === '08719'
      ? [read('peaksTragedyCookie'), { type: 'DamageEnemy' as const, enemy: terror, amount: 2 }]
      : []),
    read('peaksTragedyEnd'),
    ...(asset ? [{ type: 'DiscardAsset' as const, asset: asset.id, defeated: true }] : []),
    { type: 'SetExpeditionPartnerStatus', partner: victim, status: 'eliminated' },
  )
}

function conclusion(state: GameState, summit: boolean): Message[] {
  const lead = leadInvestigator(state)?.id ?? state.investigators[0]!.id
  const kept = summit ? state.victoryDisplay.filter(isExpedition) : []
  return [
    ...(state.investigators.some(({ resigned }) => resigned) ? [] : [read('peaksNoResolution')]),
    read(summit ? 'peaksResolution1' : 'peaksResolution2'),
    { type: 'RecordNote', note: summit ? climbedSummit : foundAnotherWay },
    { type: 'EarnExperience', amount: 0, victory: true },
    ...kept.flatMap((code) =>
      ask(lead, 'peaksExpeditionDeck', [
        ...state.investigators.map(({ id, name }): Choice => ({
          label: 'choice.edgeOfTheEarth.peaksAddSupply',
          params: { name, card: playerCardDef(code)?.name ?? code },
          then: [
            { type: 'AddStoryAsset', investigator: id, code },
            { type: 'EarnExperience', amount: 1, investigator: id },
          ],
        })),
        { label: 'choice.edgeOfTheEarth.peaksSkipSupply', then: [] },
      ]),
    ),
    peaksMessage('keepSupplies', { codes: kept.join(',') }),
    endScenario(resolution(summit ? 1 : 2)),
  ]
}

/** Forced on both agendas: after you move to a location, return all of your clues. */
const dropClues = (_state: GameState, trigger: { type: string; investigator?: string }) =>
  trigger.type === 'afterMove' && trigger.investigator
    ? [peaksMessage('dropClues', { investigator: trigger.investigator })]
    : []

registerAgenda({
  code: '08597',
  forced: (state, trigger) => dropClues(state, trigger),
  onAdvance: () => [peaksMessage('terrorDescends')],
})
registerAgenda({
  code: '08598',
  forced: (state, trigger) => dropClues(state, trigger),
  onAdvance: (state) =>
    conclusion(
      state,
      state.investigators.some(({ resigned }) => resigned),
    ),
})
registerAct({
  code: '08599',
  objectiveMet: () => false,
  abilities: (state, _act, investigator) => {
    const here = getInvestigator(state, investigator).location
    return Object.values(state.placedAssets ?? {})
      .filter(
        ({ placement, code }) =>
          placement.type === 'location' && placement.location === here && isExpedition(code),
      )
      .map((placed) => ({
        key: `08599:${placed.id}`,
        label: 'ability.edgeOfTheEarth.peaksTakeSupply',
        params: { card: placed.name },
        actions: 1,
        provokes: true,
        then: [{ type: 'TakeControlOfPlaced', placed: placed.id, investigator }],
      }))
  },
})

// Mountainside forced effects: "After you move to … from a location below it".
const fromBelow = (state: GameState, trigger: { type: string }, self: { id: string }) =>
  trigger.type === 'afterMove' &&
  'investigator' in trigger &&
  'from' in trigger &&
  getInvestigator(state, String(trigger.investigator)).location === self.id &&
  !!trigger.from &&
  levelOf(state, String(trigger.from)) < levelOf(state, self.id)
    ? String(trigger.investigator)
    : null
const climb: Record<string, (state: GameState, investigator: string, level: number) => Message[]> =
  {
    '08600': (_state, investigator) => [peaksMessage('mill', { investigator, amount: 3 })],
    '08601': (_state, investigator, level) => [
      effectTest(investigator, '08601', 'agility', 1 + level, {
        onFail: [loseExpedition(investigator)],
      }),
    ],
    '08602': (_state, investigator) => [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 }],
    '08603': (_state, investigator) => [{ type: 'TakeDamage', investigator, damage: 0, horror: 1 }],
    '08604': (_state, investigator) => [
      { type: 'ShuffleTekeliliIntoDeck', investigator, amount: 1 },
    ],
    '08605': (state, investigator) =>
      Object.values(state.assets)
        .filter(({ owner, exhausted }) => owner === investigator && !exhausted)
        .map(({ id }): Message => ({ type: 'ExhaustAsset', asset: id })),
    '08606': (state, _investigator, level) => {
      const location = locationAtLevel(state, level)
      return location ? [{ type: 'PlaceCluesOnLocationFromPool', location, amount: 1 }] : []
    },
  }
for (const [code, effect] of Object.entries(climb))
  registerLocation({
    code,
    forced: (state, trigger, self) => {
      const investigator = fromBelow(state, trigger, self)
      return investigator ? effect(state, investigator, levelOf(state, self.id)) : []
    },
    ...(code === '08606'
      ? {
          onReveal: (state, self) =>
            levelOf(state, self.id) === 0
              ? [
                  {
                    type: 'PlaceCluesOnLocationFromPool',
                    location: self.id,
                    amount: activeInvestigators(state).length,
                  },
                ]
              : [],
        }
      : {}),
  })
registerLocation({
  code: SUMMIT,
  onReveal: () => [frost],
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:resign`,
      label: 'ability.resign',
      actions: 1,
      provokes: false,
      then: [peaksMessage('summitResign', { investigator })],
    },
  ],
})

/** RR Investigators' location is "directly below" when it is one level lower. */
function nearestElderThing(state: GameState, investigator: InvestigatorId) {
  const level = levelOf(state, getInvestigator(state, investigator).location)
  const candidates = Object.values(state.enemies).filter(({ traits }) =>
    traits?.includes('Elder Thing'),
  )
  const distance = (location: string) => Math.abs(levelOf(state, location) - level)
  const nearest = Math.min(...candidates.map(({ location }) => distance(location)))
  return candidates.filter(({ location }) => distance(location) === nearest)
}

export const forbiddenPeaksRules: ScenarioBehavior = {
  id: EOTE_FORBIDDEN_PEAKS,
  onAllInvestigatorsEliminated: (state) =>
    conclusion(
      state,
      state.investigators.some(({ resigned }) => resigned),
    ),
  canEnter: (state, investigator, from, to) => {
    const target = state.locations[to]
    if (!target) return true
    const lower = locationAtLevel(state, levelOf(state, to) - 1)
    if (!target.revealed && lower && (state.locations[lower]?.clues ?? 0) > 0) return false
    // Constricting Elder Thing: you cannot move to locations above your location.
    return !(
      from &&
      levelOf(state, to) > levelOf(state, from) &&
      Object.values(state.enemies).some(
        ({ code, engagedWith }) => code === CONSTRICTING && engagedWith === investigator,
      )
    )
  },
  abilities: (state, _self, investigator) => sledgeAbilities(state, investigator),
  cannotDiscoverClues: (_state, _investigator, location, investigating) =>
    location === SUMMIT && !investigating,
  blanksTreachery: (state, card) => iceTreacheryBlank(state, card.id),
  cannotDrawCards: (state, investigator) => underWind(state, investigator),
  cannotPlay: (state, investigator) => underWind(state, investigator),
  enemyStat: (state, enemy, _stat, _source, investigator) =>
    enemy.code === PEAKS_TERROR
      ? Math.max(
          1,
          levelOf(
            state,
            investigator ? getInvestigator(state, investigator).location : enemy.location,
          ),
        )
      : 0,
  tokenEffect: (state, token, investigator) => {
    const hard = state.difficulty === 'hard' || state.difficulty === 'expert'
    const level = levelOf(state, getInvestigator(state, investigator).location)
    switch (token) {
      case 'skull':
        return { modifier: -(hard ? level + 2 : level) }
      case 'cultist':
        return hard
          ? { modifier: -1, after: [moveDown(investigator)] }
          : {
              modifier: -1,
              onFail: [{ type: 'AfterCurrentSkillTest', then: [moveDown(investigator)] }],
            }
      case 'tablet':
        return { modifier: hard ? -4 : -3, onFail: [loseExpedition(investigator)] }
      case 'elderThing':
        return {
          modifier: hard ? -5 : -4,
          onFail: [peaksMessage('elderThingToken', { investigator })],
        }
      default:
        return { modifier: 0 }
    }
  },
  forced: (state, trigger) => {
    if (trigger.type !== 'afterRevealChaosToken') return []
    const test = state.skillTest
    const source = test?.kind.type === 'effect' ? test.kind.source : undefined
    return [
      // Hypothermia: at level 4 or 5, reveal 1 additional chaos token for this test.
      ...(source === '08613' &&
      test?.tokens.length === 1 &&
      levelOf(state, getInvestigator(state, trigger.investigator).location) >= 4
        ? [{ type: 'RevealChaosToken' as const }]
        : []),
      // Ice Shaft: each [frost] revealed during its test deals 1 additional damage.
      ...(source === '08698' && trigger.token === 'frost'
        ? [
            {
              type: 'TakeDamage' as const,
              investigator: trigger.investigator,
              damage: 1,
              horror: 0,
            },
          ]
        : []),
    ]
  },
  specific: (state, key, data) => {
    const investigator = String(data.investigator ?? '')
    switch (key) {
      case 'intro':
        return push(state, ...introduction(state))
      case 'moveDown': {
        const location = below(state, investigator)
        return location
          ? push(state, { type: 'MoveTo', investigator, location, encounterEffect: true })
          : state
      }
      case 'loseExpedition':
        return release(state, investigator, false)
      case 'loseAllExpedition':
        return release(state, investigator, true)
      case 'mill':
        return millWeaknesses(state, investigator, Number(data.amount))
      case 'dropClues':
        return getInvestigator(state, investigator).clues
          ? updateInvestigator(state, investigator, (player) => ({ ...player, clues: 0 }))
          : state
      case 'elderThingToken': {
        const [enemy] = nearestElderThing(state, investigator)
        if (!enemy) return state
        const here = getInvestigator(state, investigator).location
        const from = levelOf(state, enemy.location)
        const to = levelOf(state, here)
        const step = to === from ? undefined : locationAtLevel(state, from + Math.sign(to - from))
        return push(
          state,
          ...(step ? [{ type: 'MoveEnemy' as const, enemy: enemy.id, location: step }] : []),
          peaksMessage('elderThingAttack', { enemy: enemy.id, investigator }),
        )
      }
      case 'elderThingAttack': {
        const enemy = state.enemies[String(data.enemy)]
        return enemy?.engagedWith === investigator
          ? push(state, { type: 'EnemyAttack', enemy: enemy.id, investigator, exhaustAfter: false })
          : state
      }
      case 'summitResign': {
        const assets = expeditionAssets(state, investigator)
        const remaining = Object.fromEntries(
          Object.entries(state.assets).filter(([id]) => !assets.some((asset) => asset.id === id)),
        )
        return push(
          updateInvestigator(
            {
              ...state,
              assets: remaining,
              victoryDisplay: [...state.victoryDisplay, ...assets.map(({ code }) => code)],
            },
            investigator,
            (player) => ({ ...player, clues: 0 }),
          ),
          { type: 'Resign', investigator },
        )
      }
      case 'terrorDescends': {
        const players = inPlay(state)
        const top = Math.max(...players.map(({ location }) => levelOf(state, location)))
        const location = locationAtLevel(state, top)
        if (!location || !players.length) return state
        return push(
          state,
          ...players
            .filter((player) => player.location === location)
            .map(({ id }) => peaksMessage('loseAllExpedition', { investigator: id })),
          {
            type: 'SpawnEnemy',
            card: terrorOfTheStars(activeInvestigators(state).length),
            location,
            engageWith: null,
            after: [peaksMessage('tragedy')],
          },
        )
      }
      case 'tragedy': {
        const terror = Object.values(state.enemies).find(({ code }) => code === PEAKS_TERROR)
        return terror ? tragedy(state, terror.id) : state
      }
      case 'keepSupplies': {
        const kept = String(data.codes).split(',').filter(Boolean)
        const log = state.campaignLog
        const expedition = log?.expedition
        return log && expedition
          ? {
              ...state,
              campaignLog: {
                ...log,
                expedition: {
                  ...expedition,
                  supplies: expedition.supplies.filter((code) => kept.includes(code)),
                },
              },
            }
          : state
      }
      default:
        return peaksEncounterStep(state, key, data) ?? supplyStep(state, key, data) ?? state
    }
  },
}

function underWind(state: GameState, investigator: InvestigatorId): boolean {
  return attached(state, getInvestigator(state, investigator).location, '08692').some(
    ({ id }) => !iceTreacheryBlank(state, id),
  )
}

registerScenario(forbiddenPeaksRules)
