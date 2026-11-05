import {
  activeInvestigators,
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  push,
  registerAct,
  registerAgenda,
  registerScenario,
  shuffle,
  seedRng,
  spendableClues,
  type Choice,
  type GameState,
  type Message,
  type ScenarioDefinition,
  type StoryEntry,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { copies, endScenario, resolution } from '../scenario-helpers'
import { CRASH, ICE_PART_TWO, encounters, sites, shelter, skittering } from './ice-and-death-cards'
import { edgeOfTheEarthStartingBag } from './opening'
import { iceAndDeathRules, iceMessage } from './ice-and-death'
import { leftBehind, partnerForEnemy, possessed, searchStories } from './part-two-cards'
import { madnessDifficulty, partTwoEncounterEffect } from './part-two-encounters'

export const partTwoStory = (part: string): StoryEntry => ({
  title: `story.edgeOfTheEarth.${part}.title`,
  body: `story.edgeOfTheEarth.${part}.body`,
})
const read = (part: string): Message => ({ type: 'Story', entry: partTwoStory(part) })

const pairs = [
  ['08720', '08717'],
  ['08714', '08715'],
  ['08718', '08721'],
  ['08719', '08722'],
] as const

export function iceAndDeathPartTwo(context: ScenarioContext): ScenarioDefinition {
  const expedition = context.log.expedition
  const camp = expedition?.camp?.location ?? CRASH
  const revealed = String(context.log.values.edgeOfTheEarthRevealedLocations ?? '').split(',')
  const missing = possessed.filter(
    ({ code }) => expedition?.partners[partnerForEnemy[code]!]?.status === 'missing',
  )
  const [shuffledStories, rng] = shuffle(searchStories, seedRng(context.seed))
  const [search] = shuffle([...missing, ...shuffledStories].slice(0, 9), rng)
  const required = pairs
    .filter(([partner, lost]) => {
      const status = expedition?.partners[partner]?.status
      return (
        (status === 'safe' || status === 'resolute') &&
        expedition?.partners[lost]?.status === 'missing'
      )
    })
    .map(([partner]) => partner)
  return {
    id: ICE_PART_TWO,
    intro: partTwoStory('partTwoIntro'),
    setupInstructions: partTwoStory('partTwoSetup'),
    locations: sites.map((site, index) => ({
      ...site,
      ...(index >= 4 && search[index - 4] ? { beneath: [search[index - 4]!] } : {}),
    })),
    startingLocation: camp,
    startingResources: shelter(camp),
    agendas: [
      { code: '08523', name: 'A Harsh Wind Blows', doomThreshold: 5 },
      { code: '08524', name: 'The Chill of Night', doomThreshold: 5 },
      { code: '08525', name: 'Madness and Death', doomThreshold: 6 },
    ],
    acts: [
      {
        code: '08526',
        name: 'The Lost Expedition',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: [...encounters, ...copies(skittering, 3), ...leftBehind],
    chaosBag: edgeOfTheEarthStartingBag(context),
    tokenValues: {},
    setup: [
      { type: 'AddChaosTokens', tokens: ['frost'] },
      ...revealed
        .filter((location) => location !== camp && sites.some((site) => site.id === location))
        .map((location): Message => ({ type: 'RevealLocation', location })),
      { type: 'InitializeTekeliliDeck' },
      { type: 'ChooseExpeditionPartners', required, extraUses: pairs.map(([partner]) => partner) },
    ],
  }
}

registerAct({
  code: '08526',
  abilities: (state, _act, investigator) => {
    const location = getInvestigator(state, investigator).location
    if (!location) return []
    const present = activeInvestigators(state).filter((player) => player.location === location)
    const cost = state.startingInvestigatorCount
    return [
      ...(state.locations[location]?.beneath?.length &&
      present.reduce((sum, player) => sum + spendableClues(state, player.id), 0) >= cost
        ? [
            {
              key: '08526:search',
              label: 'ability.edgeOfTheEarth.searchSite',
              actions: 0,
              provokes: false,
              target: { type: 'location' as const, id: location },
              costs: [
                { type: 'PayGroupClues' as const, amount: cost, from: present.map(({ id }) => id) },
              ],
              then: [{ type: 'DrawBeneath' as const, investigator, location }],
            },
          ]
        : []),
      ...(location === (state.campaignLog?.expedition?.camp?.location ?? CRASH)
        ? [
            {
              key: '08526:resign',
              label: 'ability.edgeOfTheEarth.turnIn',
              actions: 1,
              provokes: false,
              then: [{ type: 'Resign' as const, investigator }],
            },
          ]
        : []),
    ]
  },
})

for (const [code, part] of [
  ['08523', 'partTwoWind'],
  ['08524', 'partTwoChill'],
] as const) {
  registerAgenda({
    code,
    onAdvance: (state) => {
      const lead = leadInvestigator(state)
      if (!lead) return [read(part)]
      const choices: Choice[] = Object.values(state.locations)
        .filter((location) => location.beneath?.length)
        .map(({ id, name }) => ({
          label: 'choice.edgeOfTheEarth.lookBeneath',
          params: { name },
          target: { type: 'location', id },
          then: [iceMessage('peek', { investigator: lead.id, location: id })],
        }))
      return [
        read(part),
        ...(choices.length
          ? [
              {
                type: 'Ask' as const,
                investigator: lead.id,
                question: {
                  kind: 'chooseOne' as const,
                  prompt: 'prompt.edgeOfTheEarth.lookBeneath',
                  choices,
                },
              },
            ]
          : []),
      ]
    },
  })
}

registerAgenda({
  code: '08525',
  onAdvance: (state) => [
    read('partTwoMadness'),
    ...activeInvestigators(state).flatMap(({ id }): Message[] => [
      { type: 'SufferTrauma', investigator: id, mental: 1 },
      { type: 'DefeatInvestigator', investigator: id },
    ]),
  ],
})

function finish(state: GameState): Message[] {
  const missing = Object.entries(partnerForEnemy).filter(
    ([, partner]) => state.campaignLog?.expedition?.partners[partner]?.status === 'missing',
  )
  return [
    ...(state.investigators.some((player) => player.resigned) ? [] : [read('partTwoNoResolution')]),
    read('partTwoResolution'),
    ...missing.map(([code, partner]): Message => ({
      type: 'SetExpeditionPartnerStatus',
      partner,
      status: state.victoryDisplay.includes(code) ? 'safe' : 'eliminated',
    })),
    {
      type: 'RecordNote',
      note: 'edgeOfTheEarthRevealedLocations',
      value: Object.values(state.locations)
        .filter(({ revealed }) => revealed)
        .map(({ id }) => id)
        .join(','),
    },
    { type: 'EarnExperience', amount: 0, victory: true },
    endScenario(resolution(1)),
  ]
}

registerScenario({
  ...iceAndDeathRules,
  id: ICE_PART_TWO,
  onAllInvestigatorsEliminated: finish,
  enemyStat: (state, enemy) => madnessDifficulty(state, enemy.id),
  specific: (state, key, data) => {
    if (key === 'peek') {
      const card = state.locations[String(data.location)]?.beneath?.[0]
      if (!card || !state.interactive) return state
      return push(state, {
        type: 'Ask',
        investigator: String(data.investigator),
        question: {
          kind: 'chooseOne',
          alwaysAsk: true,
          prompt: 'prompt.edgeOfTheEarth.lookResult',
          choices: [
            {
              label: 'choice.card',
              params: { card: playerCardDef(card.code)?.name ?? card.name },
              previewCard: card.code,
              then: [],
            },
          ],
        },
      })
    }
    const effect = partTwoEncounterEffect(state, key, data)
    if (effect) return effect
    return iceAndDeathRules.specific?.(state, key, data) ?? state
  },
})
