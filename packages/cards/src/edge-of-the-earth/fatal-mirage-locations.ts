import {
  getInvestigator,
  investigatorsAt,
  playerCardDef,
  registerLocation,
  skillTestValue,
  shuffle,
  tekeliliCopies,
  turnStartedAt,
  type Enemy,
  type Choice,
  type ExpeditionPartner,
  type ScenarioBehavior,
  type Message,
  type GameState,
} from '@lcg/engine'
import { iceCanAddFrost } from './ice-and-death-locations'

const partnersAtLocations: Record<string, ExpeditionPartner> = {
  '08566': '08722',
  '08567': '08716',
  '08568': '08715',
  '08569': '08714',
  '08570': '08717',
  '08571': '08720',
  '08572': '08718',
  '08573': '08721',
  '08574': '08719',
}

export const mirageShroud: NonNullable<ScenarioBehavior['shroudModifier']> = (state, location) => {
  if (location.id === '08560' && state.activeTurn) {
    const turn = turnStartedAt(state)
    return Number(state.scenarioMeta?.[`mirageHedge:${turn}`] ?? 0)
  }
  if (
    location.id === '08561' &&
    Object.values(state.treacheries).some(
      ({ placement }) => placement.type === 'location' && placement.location === location.id,
    )
  )
    return 3
  const partner = partnersAtLocations[location.id]
  return partner &&
    Object.values(state.assets).some(
      (asset) =>
        asset.expeditionPartner === partner &&
        getInvestigator(state, asset.owner).location === location.id,
    )
    ? -2
    : 0
}

export const affectedByOttomanFront = (enemy: Enemy): boolean =>
  enemy.location === '08573' && !enemy.traits?.includes('Elite')

export const UNIVERSITY_HALLS = '08559'
export const UNIVERSITY_PAYMENT = 'mirageUniversityPayment'

export function flipUniversityHalls(state: GameState): [GameState, Message[]] {
  const scenarioMeta = { ...state.scenarioMeta }
  const revelations: Message[] = []
  let rng = state.rng
  const investigators = state.investigators.map((investigator) => {
    const key = `${UNIVERSITY_PAYMENT}:${investigator.id}`
    const spent = Number(scenarioMeta[key] ?? 0)
    delete scenarioMeta[key]
    if (!spent) return investigator
    const milled = investigator.deck.slice(0, spent * 3)
    const deck = investigator.deck.slice(milled.length)
    const weaknesses: string[] = []
    const discard = [...investigator.discard]
    for (const code of milled) {
      if (Object.hasOwn(tekeliliCopies, code))
        revelations.push({ type: 'ResolveWeakness', investigator: investigator.id, code })
      else if (playerCardDef(code)?.weakness) weaknesses.push(code)
      else discard.push(code)
    }
    let remaining = deck
    if (weaknesses.length) [remaining, rng] = shuffle([...deck, ...weaknesses], rng)
    return { ...investigator, deck: remaining, discard }
  })
  return [{ ...state, investigators, rng, scenarioMeta }, revelations]
}

export const mirageActionAllowed: NonNullable<ScenarioBehavior['actionAllowed']> = (
  state,
  id,
  kind,
) => {
  const investigator = getInvestigator(state, id)
  return kind !== 'investigate' || investigator.location !== '08566' || investigator.resources > 0
}

export const mirageBeforeInvestigation: NonNullable<ScenarioBehavior['beforeInvestigation']> = (
  state,
  test,
) => {
  if (test.kind.type !== 'investigate') return null
  const investigator = getInvestigator(state, test.investigator)
  const resume = { ...test, investigationCostsPaid: true }
  if (test.kind.location === '08566')
    return investigator.resources > 0
      ? [{ type: 'SpendResources', investigator: investigator.id, amount: 1 }, resume]
      : []
  if (test.kind.location !== '08558') return null
  const choices: Choice[] = [
    {
      label: 'choice.edgeOfTheEarth.mirageExtraShroud',
      then: [{ ...resume, difficulty: resume.difficulty + 2 }],
    },
  ]
  if (state.activeTurn === investigator.id && investigator.actionsRemaining > 0)
    choices.push({
      label: 'choice.edgeOfTheEarth.mirageExtraAction',
      then: [{ type: 'SpendAdditionalAction', investigator: investigator.id, then: [resume] }],
    })
  return [
    {
      type: 'Ask',
      investigator: investigator.id,
      question: { kind: 'chooseOne', prompt: 'prompt.chooseEffect', choices },
    },
  ]
}

export const mirageCannotLeave: NonNullable<ScenarioBehavior['cannotLeave']> = (state, id) =>
  state.activeTurn === id &&
  getInvestigator(state, id).location === '08560' &&
  !!state.scenarioMeta?.[`mirageHedge:${turnStartedAt(state)}`]

export const mirageBeforeMove: NonNullable<ScenarioBehavior['beforeMove']> = (state, move) => {
  if (
    move.location !== '08567' ||
    getInvestigator(state, move.investigator).location === move.location
  )
    return null
  const { investigator } = move
  const resume = { ...move, checked: true }
  const choices: Choice[] = []
  if (state.tekeliliDeck?.length)
    choices.push({
      label: 'choice.edgeOfTheEarth.mirageShuffleTekelili',
      then: [{ type: 'ShuffleTekeliliIntoDeck', investigator, amount: 1 }, resume],
    })
  if (
    state.activeTurn === investigator &&
    getInvestigator(state, investigator).actionsRemaining > 0
  )
    choices.push({
      label: 'choice.edgeOfTheEarth.mirageExtraAction',
      then: [{ type: 'SpendAdditionalAction', investigator, then: [resume] }],
    })
  return [
    {
      type: 'Ask',
      investigator,
      question: { kind: 'chooseOne', prompt: 'prompt.chooseEffect', choices },
    },
  ]
}

export const mirageLocationReactions: NonNullable<ScenarioBehavior['reactions']> = (
  state,
  trigger,
) => {
  const test = state.skillTest
  if (
    trigger.type !== 'whenWouldFail' ||
    !test ||
    test.autoFail ||
    test.kind.type !== 'investigate' ||
    test.kind.location !== '08557' ||
    Math.max(0, skillTestValue(state).total + test.tokenModifier) !== test.difficulty - 1
  )
    return []
  const investigator = trigger.investigator
  return [
    {
      key: '08557:recover',
      label: 'choice.edgeOfTheEarth.mirageCampRetry',
      investigator,
      then: [
        { type: 'TakeDamage', investigator, damage: 0, horror: 1, source: '08557' },
        { type: 'BoostSkillTest', amount: 1 },
      ],
    },
  ]
}

registerLocation({
  code: '08560',
  forced: (state, trigger, location) => {
    if (
      trigger.type !== 'skillTestEnded' ||
      trigger.kind !== 'investigate' ||
      trigger.location !== location.id ||
      state.activeTurn !== trigger.investigator
    )
      return []
    const key = `mirageHedge:${turnStartedAt(state)}`
    return [{ type: 'SetScenarioMeta', key, value: Number(state.scenarioMeta?.[key] ?? 0) + 1 }]
  },
})

for (const [code, damage, horror] of [
  ['08562', 0, 1],
  ['08565', 1, 0],
] as const) {
  registerLocation({
    code,
    forced: (state, trigger, location) => {
      const test = state.skillTest
      if (
        trigger.type !== 'afterRevealChaosToken' ||
        trigger.token !== 'frost' ||
        test?.kind.type !== 'investigate' ||
        test.kind.location !== location.id ||
        test.tokens.filter((token) => token === 'frost').length !== 1
      )
        return []
      return [
        { type: 'TakeDamage', investigator: trigger.investigator, damage, horror, source: code },
        { type: 'AddInvestigationResults', extraClues: 1 },
      ]
    },
  })
}

registerLocation({
  code: '08571',
  forced: (state, trigger, location) => {
    if (
      trigger.type !== 'skillTestEnded' ||
      !trigger.succeeded ||
      trigger.kind !== 'investigate' ||
      trigger.location !== location.id
    )
      return []
    const investigator = trigger.investigator
    return [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEffect',
          choices: [
            {
              label: 'choice.edgeOfTheEarth.horror',
              then: [
                { type: 'TakeDamage', investigator, damage: 0, horror: 1, source: location.id },
              ],
            },
            ...Object.values(state.assets).flatMap((asset): Choice[] => {
              const card = playerCardDef(asset.code)
              return asset.owner === investigator && asset.uses > 0 && card?.uses?.type === 'secret'
                ? [
                    {
                      label: 'choice.edgeOfTheEarth.mirageSpendSecret',
                      params: { name: card.name },
                      target: { type: 'asset', id: asset.id },
                      then: [{ type: 'SpendUses', asset: asset.id, amount: 1 }],
                    },
                  ]
                : []
            }),
          ],
        },
      },
    ]
  },
})

registerLocation({
  code: '08572',
  forced: (state, trigger, location): Message[] => {
    const phase = `${state.round}:${state.phase}`
    return trigger.type === 'treacheryAttached' &&
      trigger.location === location.id &&
      trigger.fromRevelation &&
      state.scenarioMeta?.mirageMoaiSurge !== phase
      ? [{ type: 'SetScenarioMeta', key: 'mirageMoaiSurge', value: phase }, { type: 'GainSurge' }]
      : []
  },
})

registerLocation({
  code: '08563',
  forced: (_state, trigger, location) =>
    trigger.type === 'afterDiscoverClues' &&
    trigger.location === location.id &&
    (trigger.amount ?? 0) >= 2
      ? [{ type: 'ShuffleTekeliliIntoDeck', investigator: trigger.investigator, amount: 1 }]
      : [],
})

registerLocation({
  code: '08569',
  abilities: (state, location, investigator) => {
    if (!state.tekeliliDeck?.length) return []
    const present = investigatorsAt(state, location.id)
    const choices: Choice[] = [
      ...present
        .filter(({ horror }) => horror > 0)
        .map(({ id, name }): Choice => ({
          label: 'choice.edgeOfTheEarth.healHorror',
          params: { name },
          target: { type: 'investigator', id },
          then: [{ type: 'Heal', investigator: id, healer: investigator, damage: 0, horror: 1 }],
        })),
      ...Object.values(state.assets).flatMap((asset): Choice[] => {
        const card = playerCardDef(asset.code)
        return asset.horror > 0 &&
          card?.traits.includes('Ally') &&
          present.some(({ id }) => id === asset.owner)
          ? [
              {
                label: 'choice.edgeOfTheEarth.healHorror',
                params: { name: card.name },
                target: { type: 'asset', id: asset.id },
                then: [
                  {
                    type: 'HealAsset',
                    asset: asset.id,
                    healer: investigator,
                    damage: 0,
                    horror: 1,
                  },
                ],
              },
            ]
          : []
      }),
    ]
    return choices.length
      ? [
          {
            key: '08569:heal',
            label: 'ability.edgeOfTheEarth.mirageDyerHeal',
            actions: 1,
            provokes: true,
            costs: [{ type: 'ShuffleTekeliliIntoDeck', investigator, amount: 1 }],
            then: [
              {
                type: 'Ask',
                investigator,
                question: { kind: 'chooseOne', prompt: 'prompt.chooseEffect', choices },
              },
            ],
          },
        ]
      : []
  },
})

registerLocation({
  code: '08570',
  forced: (state, trigger, location) => {
    if (trigger.type !== 'afterMove') return []
    const investigator = getInvestigator(state, trigger.investigator)
    const key = `mirageInfirmary:${investigator.id}`
    if (
      investigator.location !== location.id ||
      trigger.from === location.id ||
      state.scenarioMeta?.[key]
    )
      return []
    return [
      { type: 'SetScenarioMeta', key, value: 1 },
      {
        type: 'TakeDamage',
        investigator: investigator.id,
        damage: Math.max(1, investigator.health - investigator.damage - 6),
        horror: 0,
        source: location.id,
      },
    ]
  },
})

registerLocation({
  code: '08574',
  abilities: (state, location, investigator) =>
    iceCanAddFrost(state)
      ? [
          {
            key: '08574:frostClues',
            label: 'ability.edgeOfTheEarth.mirageBlackStone',
            actions: 0,
            provokes: false,
            limit: { per: 'game', group: true },
            costs: [{ type: 'AddChaosTokens', tokens: ['frost'] }],
            then: [{ type: 'DiscoverClues', investigator, location: location.id, amount: 2 }],
          },
        ]
      : [],
})
