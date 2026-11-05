import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  leadInvestigator,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerScenario,
  registerTreachery,
  seedRng,
  shuffle,
  spendableClues,
  type Choice,
  type Enemy,
  type EnemyCard,
  type GameState,
  type Message,
  type ScenarioDefinition,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { copies, endScenario, enemy, resolution, treachery } from '../scenario-helpers'
import { fledToMountains } from './checkpoint'
import {
  CRASH,
  ICE_PART_THREE,
  creatures,
  encounters,
  shelter,
  sites,
  skittering,
} from './ice-and-death-cards'
import { edgeOfTheEarthStartingBag } from './opening'
import { iceAndDeathRules, iceMessage } from './ice-and-death'
import { iceCanAddFrost } from './ice-and-death-locations'

const NIGHTMARE = '08547'
const nightmare = enemy({
  code: NIGHTMARE,
  name: 'Seeping Nightmare',
  fight: 3,
  health: 6,
  evade: 3,
  damage: 2,
  horror: 2,
  traits: ['Monster', 'Eidolon', 'Elite'],
  keywords: [],
  victory: 0,
})
const eidolons = [
  ...copies(skittering, 3),
  ...creatures.filter(
    (card): card is EnemyCard => card.kind === 'enemy' && !!card.traits?.includes('Eidolon'),
  ),
].map((card) => ({ ...card, victory: 0 }))
const eidolonCards = new Map(eidolons.map((card) => [card.code, card]))
const isEidolon = (enemy: Enemy) => enemy.traits?.includes('Eidolon')
const nightmares = (state: GameState) =>
  Object.values(state.enemies).filter(({ code }) => code === NIGHTMARE)
const pile = (state: GameState, enemy: string) => state.scenarioDecks?.[enemy] ?? []
const campOf = (state: GameState) => state.campaignLog?.expedition?.camp?.location ?? CRASH
const story = (part: string) => ({
  title: `story.edgeOfTheEarth.${part}.title`,
  body: `story.edgeOfTheEarth.${part}.body`,
})
const read = (part: string): Message => ({ type: 'Story', entry: story(part) })

// Campaign guide, p. 17: spawn order depends on the camp and the number of investigators.
function nightmareSites(camp: string): string[] {
  const order: Record<string, string[]> = {
    '08506': ['08510', '08511', '08513', '08514'],
    '08507': ['08509', '08511', '08513', '08512'],
    '08508': ['08510', '08509', '08512', '08514'],
    '08509': ['08510', '08511', '08513', '08514'],
    '08510': ['08509', '08511', '08513', '08512'],
    '08511': ['08510', '08509', '08512', '08514'],
    '08512': ['08513', '08514', '08509', CRASH],
    '08513': ['08512', '08514', '08511', CRASH],
    '08514': ['08513', '08512', '08510', CRASH],
  }
  return order[camp] ?? ['08507', '08506', '08508', '08510']
}

export function iceAndDeathPartThree(context: ScenarioContext): ScenarioDefinition {
  const camp = context.log.expedition?.camp?.location ?? CRASH
  const revealed = new Set(
    String(context.log.values.edgeOfTheEarthRevealedLocations ?? '').split(','),
  )
  const players = context.investigators.length
  const [shuffled] = shuffle(eidolons, seedRng(context.seed))
  return {
    id: ICE_PART_THREE,
    intro: story('partThreeIntro'),
    setupInstructions: story('partThreeSetup'),
    locations: sites.map((site) => (site.id === camp ? { ...site, clueValue: 0 } : site)),
    startingLocation: camp,
    startingResources: shelter(camp),
    chaosBag: edgeOfTheEarthStartingBag(context),
    tokenValues: {},
    agendas: [
      { code: '08544', name: 'Manifestations of Evil', doomThreshold: 2 },
      { code: '08545', name: 'Icy Depths', doomThreshold: 6 },
    ],
    acts: [
      {
        code: '08546',
        name: 'Under Attack!',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [
      ...encounters,
      ...creatures.filter((card) => card.kind !== 'enemy'),
      ...copies(
        treachery({ code: '08548', name: 'Phantasmagoria', traits: ['Curse'], keywords: [] }),
        2,
      ),
    ],
    setup: [
      { type: 'AddChaosTokens', tokens: ['frost'] },
      ...sites
        .filter(({ id }) => id !== camp && revealed.has(id))
        .map(({ id }): Message => ({ type: 'RevealLocation', location: id })),
      ...nightmareSites(camp)
        .slice(0, players)
        .map((location, index): Message => ({
          type: 'SpawnEnemy',
          card: nightmare,
          location,
          engageWith: null,
          after: [
            iceMessage('sealNightmare', {
              location,
              cards: shuffled
                .filter((_, n) => n % players === index)
                .map(({ code }) => code)
                .join(','),
            }),
          ],
        })),
      { type: 'InitializeTekeliliDeck' },
      { type: 'ChooseExpeditionPartners' },
    ],
  }
}

function ask(investigator: string, prompt: string, choices: Choice[]): Message[] {
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

function conclusion(state: GameState, result: 0 | 1 | 2): Message[] {
  const bonus = result === 1 ? 5 : state.victoryDisplay.includes(NIGHTMARE) ? 2 : 0
  return [
    read(
      result === 0
        ? 'partThreeNoResolution'
        : result === 1
          ? 'partThreeVictory'
          : 'partThreeEscape',
    ),
    {
      type: 'RecordNote',
      note:
        result === 0
          ? 'edgeOfTheEarthBarelyEscaped'
          : result === 1
            ? 'edgeOfTheEarthDefeatedCreatures'
            : fledToMountains,
    },
    { type: 'EarnExperience', amount: bonus, victory: true },
    endScenario(result ? resolution(result) : { type: 'noResolution' }),
  ]
}

registerAct({
  code: '08546',
  objectiveMet: (state) => !Object.values(state.enemies).some(isEidolon),
  onAdvance: (state) => conclusion(state, 1),
  abilities: (state, _act, investigator) => {
    const camp = campOf(state)
    if (getInvestigator(state, investigator).location !== camp) return []
    const here = activeInvestigators(state).filter(({ location }) => location === camp)
    if (here.reduce((sum, { id }) => sum + spendableClues(state, id), 0) < 4) return []
    return [
      {
        key: '08546:resign',
        label: 'ability.edgeOfTheEarth.fleeCamp',
        actions: 1,
        provokes: false,
        costs: [{ type: 'PayGroupClues', amount: 4, from: here.map(({ id }) => id) }],
        then: [{ type: 'Resign', investigator }],
      },
    ]
  },
})

registerEnemy({
  code: NIGHTMARE,
  forced: (_state, trigger, self) =>
    trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id
      ? [iceMessage('discardNightmarePile', { enemy: self.id })]
      : [],
})

registerAgenda({
  code: '08544',
  insteadOfAdvance: (state) =>
    nightmares(state).some(({ id }) => pile(state, id).length)
      ? [iceMessage('removeNightmareDoom', { amount: 2 })]
      : null,
  onAdvance: (state) => {
    const lead = leadInvestigator(state)
    if (!lead) return []
    const options: Choice[] = [
      {
        label: 'choice.edgeOfTheEarth.nightmareWeaknesses',
        then: activeInvestigators(state).map(({ id }) =>
          iceMessage('nightmareWeaknesses', { investigator: id }),
        ),
      },
    ]
    if (iceCanAddFrost(state))
      options.unshift({
        label: 'choice.edgeOfTheEarth.addFrost',
        then: [{ type: 'AddChaosTokens', tokens: ['frost'] }],
      })
    return [read('partThreeManifestations'), ...ask(lead.id, 'nightmareAgenda', options)]
  },
})
registerAgenda({
  code: '08545',
  onAdvance: (state) => [
    read('partThreeDepths'),
    ...activeInvestigators(state).flatMap(({ id }): Message[] => [
      { type: 'SufferTrauma', investigator: id, physical: 1 },
      { type: 'DefeatInvestigator', investigator: id },
    ]),
  ],
})

registerTreachery({
  code: '08548',
  revelation: (state, investigator) => {
    const enemies = nightmares(state)
    if (!enemies.length) return [{ type: 'GainSurge' }]
    const here = getInvestigator(state, investigator).location
    if (!here) return []
    const distance = distancesFrom(state, here)
    const nearest = Math.min(...enemies.map(({ location }) => distance.get(location) ?? Infinity))
    return ask(
      investigator,
      'nightmareNearest',
      enemies
        .filter(({ location }) => (distance.get(location) ?? Infinity) === nearest)
        .map((enemy) => ({
          label: 'choice.enemy',
          params: { enemy: enemy.name },
          target: { type: 'enemy', id: enemy.id },
          then: [iceMessage('phantasmagoria', { enemy: enemy.id })],
        })),
    )
  },
})

function withPile(state: GameState, enemy: string, cards: string[]): GameState {
  return { ...state, scenarioDecks: { ...state.scenarioDecks, [enemy]: cards } }
}

function removeDoom(state: GameState, amount: number): GameState {
  const lead = leadInvestigator(state)
  if (amount <= 0 || !lead) {
    const candidates = nightmares(state).filter(({ id }) => pile(state, id).length)
    const most = Math.max(...candidates.map(({ id }) => pile(state, id).length))
    return lead
      ? push(
          state,
          ...ask(
            lead.id,
            'nightmareMost',
            candidates
              .filter(({ id }) => pile(state, id).length === most)
              .map((enemy) => ({
                label: 'choice.enemy',
                params: { enemy: enemy.name },
                target: { type: 'enemy', id: enemy.id },
                then: [iceMessage('releaseNightmare', { enemy: enemy.id })],
              })),
          ),
        )
      : state
  }
  const then = iceMessage('removeNightmareDoom', { amount: amount - 1 })
  const choices: Choice[] = []
  const offer = (name: string, remove: Message) =>
    choices.push({
      label: 'choice.edgeOfTheEarth.nightmareRemoveDoom',
      params: { name },
      then: [remove, then],
    })
  if (state.doom)
    offer(state.agendas[state.agendaIndex]!.name, {
      type: 'RemoveDoom',
      target: { type: 'agenda' },
      amount: 1,
    })
  const sources = [
    ...Object.values(state.locations).map((card) => ({ type: 'location' as const, card })),
    ...Object.values(state.enemies).map((card) => ({ type: 'enemy' as const, card })),
    ...Object.values(state.assets).map((card) => ({ type: 'asset' as const, card })),
    ...state.investigators.map((card) => ({ type: 'investigator' as const, card })),
  ]
  for (const { type, card } of sources) {
    if (!(card.doom ?? 0)) continue
    offer(
      'name' in card ? String(card.name) : card.code,
      type === 'location'
        ? { type: 'PlaceLocationTokens', location: card.id, doom: -1 }
        : { type: 'RemoveDoom', target: { type, id: card.id }, amount: 1 },
    )
  }
  return choices.length
    ? push(state, ...ask(lead.id, 'nightmareRemoveDoom', choices))
    : removeDoom(state, 0)
}

registerScenario({
  ...iceAndDeathRules,
  id: ICE_PART_THREE,
  sequentialEnemyMovement: true,
  onAllInvestigatorsEliminated: (state) =>
    conclusion(state, state.investigators.some(({ resigned }) => resigned) ? 2 : 0),
  enemyKeyword: (state, enemy, keyword) =>
    enemy.code === NIGHTMARE && keyword === 'hunter' ? pile(state, enemy.id).length === 0 : null,
  enemyConnections: (state, location, enemy) =>
    enemy &&
    isEidolon(enemy) &&
    nightmares(state).some((nightmare) => nightmare.location === location)
      ? [campOf(state)]
      : [],
  specific: (state, key, data) => {
    const enemy = state.enemies[String(data.enemy)]
    switch (key) {
      case 'sealNightmare': {
        const portal = nightmares(state).find(({ location }) => location === data.location)
        return portal
          ? withPile(state, portal.id, String(data.cards).split(',').filter(Boolean))
          : state
      }
      case 'discardNightmarePile': {
        const { [String(data.enemy)]: _discarded, ...scenarioDecks } = state.scenarioDecks ?? {}
        return { ...state, scenarioDecks }
      }
      case 'removeNightmareDoom':
        return removeDoom(state, Number(data.amount))
      case 'nightmareWeaknesses': {
        const investigator = String(data.investigator)
        return push(
          state,
          (state.tekeliliDeck?.length ?? 0) >= 2
            ? { type: 'ShuffleTekeliliIntoDeck', investigator, amount: 2 }
            : { type: 'TakeDamage', investigator, damage: 1, horror: 1 },
        )
      }
      case 'releaseNightmare': {
        if (!enemy) return state
        const [code, ...remaining] = pile(state, enemy.id)
        const card = code ? eidolonCards.get(code) : undefined
        return card
          ? push(withPile(state, enemy.id, remaining), {
              type: 'SpawnEnemy',
              card,
              location: enemy.location,
              engageWith: null,
            })
          : state
      }
      case 'phantasmagoria':
        if (!enemy) return state
        return pile(state, enemy.id).length
          ? push(state, iceMessage('releaseNightmare', { enemy: enemy.id }))
          : push(
              state,
              { type: 'MoveHuntingEnemy', enemy: enemy.id },
              iceMessage('nightmareAttack', { enemy: enemy.id }),
            )
      case 'nightmareAttack':
        return enemy && !enemy.exhausted && enemy.engagedWith
          ? push(state, {
              type: 'EnemyAttack',
              enemy: enemy.id,
              investigator: enemy.engagedWith,
              exhaustAfter: false,
            })
          : state
      default:
        return iceAndDeathRules.specific?.(state, key, data) ?? state
    }
  },
})
