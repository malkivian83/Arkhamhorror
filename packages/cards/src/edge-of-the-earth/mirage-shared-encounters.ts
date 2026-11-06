import {
  activeInvestigators,
  getInvestigator,
  playerCardDef,
  push,
  registerEnemy,
  registerTreachery,
  shuffle,
  testMargin,
  type Asset,
  type GameState,
  type Message,
} from '@lcg/engine'
import { iceTreacheryBlank } from './companion-ellsworth'
import { effectTest, enemy, treachery } from '../scenario-helpers'
import { tekeliliOrHorror } from './ice-and-death'

export const primordialEvil = enemy({
  code: '08687',
  name: 'Primordial Evil',
  fight: 3,
  health: 5,
  evade: 1,
  damage: 2,
  horror: 1,
  traits: ['Monster', 'Eidolon'],
  keywords: ['hunter', 'retaliate'],
})

registerEnemy({
  code: primordialEvil.code,
  forced: (state, trigger, self) =>
    trigger.type === 'afterEnemyDamaged' &&
    trigger.enemy === self.id &&
    trigger.by &&
    trigger.amount > 0
      ? state.tekeliliDeck?.length
        ? [{ type: 'ShuffleTekeliliIntoDeck', investigator: trigger.by, amount: 1 }]
        : [
            {
              type: 'EnemyAttack',
              enemy: self.id,
              investigator: trigger.by,
              exhaustAfter: false,
              evenIfExhausted: true,
            },
          ]
      : [],
})

export const madnessWithin = treachery({
  code: '08688',
  name: 'The Madness Within',
  traits: ['Terror'],
  keywords: [],
})
registerTreachery({
  code: madnessWithin.code,
  revelation: (_state, investigator, self) => [
    effectTest(investigator, self.code, 'willpower', 4, {
      onFail: [{ type: 'ScenarioSpecific', key: 'mirageMadnessWithin', data: { investigator } }],
    }),
  ],
})

export const nightmarishVapors = treachery({
  code: '08705',
  name: 'Nightmarish Vapors',
  traits: ['Terror'],
  keywords: ['peril'],
})
registerTreachery({
  code: nightmarishVapors.code,
  revelation: (state, investigator) => [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEffect',
        choices: [
          {
            label: 'choice.edgeOfTheEarth.mirageLoseActions',
            then: [{ type: 'LoseActions', investigator, amount: 2 }],
          },
          ...((state.tekeliliDeck?.length ?? 0) >= 2
            ? [
                {
                  label: 'choice.edgeOfTheEarth.mirageTwoTekelili',
                  then: [{ type: 'ShuffleTekeliliIntoDeck' as const, investigator, amount: 2 }],
                },
              ]
            : []),
        ],
      },
    },
  ],
})

export const nebulousMiasma = treachery({
  code: '08707',
  name: 'Nebulous Miasma',
  traits: ['Hazard'],
  keywords: [],
})
registerTreachery({
  code: nebulousMiasma.code,
  revelation: (state, investigator, self) => {
    const location = getInvestigator(state, investigator).location
    return location
      ? [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'location', location },
          },
        ]
      : []
  },
  forced: (state, trigger, self) => {
    if (trigger.type === 'roundEnds') return [{ type: 'DiscardTreachery', treachery: self.id }]
    if (
      trigger.type !== 'turnEnds' ||
      self.placement.type !== 'location' ||
      getInvestigator(state, trigger.investigator).location !== self.placement.location
    )
      return []
    return [
      {
        type: 'TakeDamage',
        investigator: trigger.investigator,
        damage: 0,
        horror: 1,
        direct: true,
        source: self.code,
      },
      ...Object.values(state.assets)
        .filter(
          (asset) =>
            asset.owner === trigger.investigator && (playerCardDef(asset.code)?.sanity ?? 0) > 0,
        )
        .map(({ id }): Message => ({ type: 'DamageAsset', asset: id, damage: 0, horror: 1 })),
    ]
  },
})

export const blasphemousVisions = treachery({
  code: '08703',
  name: 'Blasphemous Visions',
  traits: ['Terror'],
  keywords: [],
})
registerTreachery({
  code: blasphemousVisions.code,
  revelation: (_state, investigator, self) => [
    { type: 'ShuffleTekeliliIntoDeck', investigator, amount: 1 },
    { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'threatArea', investigator } },
  ],
  abilities: (_state, self, investigator) =>
    self.placement.type === 'threatArea' && self.placement.investigator === investigator
      ? [
          {
            key: self.id + ':discard',
            label: 'ability.edgeOfTheEarth.mirageDiscardVisions',
            actions: 1,
            provokes: true,
            then: [
              effectTest(investigator, self.code, 'willpower', 3, {
                onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
              }),
            ],
          },
        ]
      : [],
})

export const glimpseTheUnspeakable = treachery({
  code: '08704',
  name: 'Glimpse the Unspeakable',
  traits: ['Terror'],
  keywords: ['peril'],
})
registerTreachery({
  code: glimpseTheUnspeakable.code,
  revelation: (state, investigator) => {
    const code = state.tekeliliDeck?.[0]
    return code
      ? [
          {
            type: 'ShuffleTekeliliIntoDeck',
            investigator,
            amount: 1,
            drawInstead: true,
            returnToDeck: true,
          },
          { type: 'ScenarioSpecific', key: 'mirageGlimpse', data: { investigator, code } },
        ]
      : [{ type: 'GainSurge' }]
  },
})

export const miasmaticTorment = treachery({
  code: '08706',
  name: 'Miasmatic Torment',
  traits: ['Hazard'],
  keywords: [],
})

const controlledPartner = (state: GameState, investigator: string) =>
  Object.values(state.assets).find(
    (asset) => asset.owner === investigator && asset.expeditionPartner,
  )

export function tormentPreventsReady(state: GameState, asset: Asset): boolean {
  return (
    !!asset.expeditionPartner &&
    Object.values(state.treacheries).some(
      (card) =>
        card.code === miasmaticTorment.code &&
        card.placement.type === 'threatArea' &&
        card.placement.investigator === asset.owner &&
        !iceTreacheryBlank(state, card.id),
    )
  )
}

registerTreachery({
  code: miasmaticTorment.code,
  revelation: (state, investigator, self) => {
    const partner = controlledPartner(state, investigator)
    return partner
      ? [
          { type: 'ExhaustAsset', asset: partner.id },
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'threatArea', investigator },
          },
        ]
      : [{ type: 'GainSurge' }]
  },
  forced: (state, trigger, self) => {
    if (self.placement.type !== 'threatArea') return []
    const investigator = self.placement.investigator
    if (
      trigger.type === 'assetDefeated' &&
      trigger.asset.owner === investigator &&
      trigger.asset.expeditionPartner
    )
      return [{ type: 'DiscardTreachery', treachery: self.id }]
    if (trigger.type !== 'turnEnds' || trigger.investigator !== investigator) return []
    const partner = controlledPartner(state, investigator)
    if (!partner) return [{ type: 'DiscardTreachery', treachery: self.id }]
    return [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.chooseEffect',
          choices: [
            {
              label: 'choice.edgeOfTheEarth.miragePartnerDamage',
              then: [{ type: 'DamageAsset', asset: partner.id, damage: 1, horror: 0 }],
            },
            {
              label: 'choice.edgeOfTheEarth.miragePartnerHorror',
              then: [{ type: 'DamageAsset', asset: partner.id, damage: 0, horror: 1 }],
            },
          ],
        },
      },
    ]
  },
  abilities: (_state, self, investigator) =>
    self.placement.type === 'threatArea' && self.placement.investigator === investigator
      ? [
          {
            key: self.id + ':discard',
            label: 'ability.edgeOfTheEarth.mirageDiscardTorment',
            actions: 1,
            provokes: true,
            then: [
              {
                type: 'Ask',
                investigator,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.chooseEffect',
                  choices: (['willpower', 'intellect'] as const).map((skill) => ({
                    label: 'skill.' + skill,
                    then: [
                      effectTest(investigator, self.code, skill, 3, {
                        onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
                      }),
                    ],
                  })),
                },
              },
            ],
          },
        ]
      : [],
})

export function resolveMirageEncounter(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState {
  const investigator = String(data.investigator)
  if (key === 'mirageMadnessWithin') {
    const failedBy = state.skillTest ? Math.max(0, -testMargin(state.skillTest)) : 0
    return push(state, ...tekeliliOrHorror(state, investigator, failedBy))
  }
  const code = String(data.code)
  const owner = getInvestigator(state, investigator)
  const position = owner.deck.lastIndexOf(code)
  if (position < 0) return state
  if (key === 'mirageGlimpse')
    return push(state, {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEffect',
        choices: activeInvestigators(state).map(({ id, name }) => ({
          label: 'choice.edgeOfTheEarth.mirageGlimpseRecipient',
          params: { name },
          target: { type: 'investigator', id },
          then: [
            {
              type: 'ScenarioSpecific',
              key: 'mirageGlimpseRecipient',
              data: { investigator, code, recipient: id },
            },
          ],
        })),
      },
    })
  const recipient = getInvestigator(state, String(data.recipient))
  const rest = owner.deck.filter((_, index) => index !== position)
  const [deck, rng] = shuffle(
    [...(recipient.id === investigator ? rest : recipient.deck), code],
    state.rng,
  )
  const log = state.campaignLog
  const from = log?.investigators[owner.id]
  const to = log?.investigators[recipient.id]
  const storyIndex = from?.storyAssets.lastIndexOf(code) ?? -1
  return {
    ...state,
    rng,
    investigators: state.investigators.map((i) =>
      i.id === recipient.id ? { ...i, deck } : i.id === investigator ? { ...i, deck: rest } : i,
    ),
    ...(log && from && to && recipient.id !== investigator && storyIndex >= 0
      ? {
          campaignLog: {
            ...log,
            investigators: {
              ...log.investigators,
              [owner.id]: {
                ...from,
                storyAssets: from.storyAssets.filter((_, index) => index !== storyIndex),
              },
              [recipient.id]: { ...to, storyAssets: [...to.storyAssets, code] },
            },
          },
        }
      : {}),
  }
}
