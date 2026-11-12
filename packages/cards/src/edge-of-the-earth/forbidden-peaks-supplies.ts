import {
  expeditionPartners,
  getInvestigator,
  playerCardBehavior,
  playerCardDef,
  push,
  registerPlayerCard,
  shroudOf,
  type AbilityOption,
  type Asset,
  type ExpeditionPartner,
  type GameState,
  type InvestigatorId,
  type Message,
  type ReactionOption,
} from '@lcg/engine'

const SLEDGE = '08615'
const RADIO = '08619'
const sledgeDeck = 'peaksSledge'
const scenario = (key: string, data: Record<string, string | number>): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const exhaust = (self: Asset): Message => ({ type: 'ExhaustAsset', asset: self.id })
const spend = (self: Asset): Message => ({ type: 'SpendUses', asset: self.id, amount: 1 })
const name = (code: string) => playerCardDef(code)?.name ?? code
const ask = (
  investigator: InvestigatorId,
  prompt: string,
  choices: Message[][],
  labels: {
    label: string
    params?: Record<string, string | number>
  }[],
): Message => ({
  type: 'Ask',
  investigator,
  question: {
    kind: 'chooseOne',
    prompt: `prompt.edgeOfTheEarth.${prompt}`,
    choices: choices.map((then, n) => ({ ...labels[n]!, then })),
  },
})
const here = (state: GameState, investigator: InvestigatorId) =>
  getInvestigator(state, investigator).location
const playersAt = (state: GameState, location: string | null) =>
  state.investigators.filter((player) => !player.eliminated && player.location === location)

// Green Soapstone: [reaction] When you perform a successful attack, +1 damage.
registerPlayerCard({
  code: '08614',
  reactions: (_state, trigger, self) =>
    trigger.type === 'beforeEnemyDamage' &&
    trigger.investigator === self.owner &&
    trigger.source?.attack &&
    trigger.amount > 0 &&
    !self.exhausted &&
    self.uses > 0
      ? [
          {
            key: `${self.id}:damage`,
            investigator: self.owner,
            label: 'ability.edgeOfTheEarth.peaksSoapstone',
            target: { type: 'asset', id: self.id },
            then: [
              spend(self),
              exhaust(self),
              { type: 'AdjustPendingEnemyDamage', enemy: trigger.enemy, amount: 1 },
            ],
          },
        ]
      : [],
})

// Dynamite: 3 damage to each enemy and investigator at your location or a connecting one.
registerPlayerCard({
  code: '08616',
  abilities: (state, self, investigator) => {
    const location = here(state, investigator)
    if (!location || self.exhausted || self.uses < 1) return []
    const targets = [location, ...(state.locations[location]?.connections ?? [])].filter(
      (id) => state.locations[id]?.revealed,
    )
    const blast = (target: string): Message[] => [
      ...Object.values(state.enemies)
        .filter((enemy) => enemy.location === target)
        .map((enemy): Message => ({
          type: 'DamageEnemy',
          enemy: enemy.id,
          amount: 3,
          by: investigator,
          source: { code: '08616' },
        })),
      ...playersAt(state, target).map(({ id }): Message => ({
        type: 'TakeDamage',
        investigator: id,
        damage: 3,
        horror: 0,
      })),
    ]
    return [
      {
        key: `${self.id}:blast`,
        label: 'ability.edgeOfTheEarth.peaksDynamite',
        actions: 1,
        provokes: true,
        costs: [spend(self), exhaust(self)],
        then: [
          ask(
            investigator,
            'peaksDynamite',
            targets.map(blast),
            targets.map((id) => ({
              label: 'choice.location',
              params: { location: state.locations[id]!.name },
            })),
          ),
        ],
      },
    ]
  },
})

// Mineral Specimen: investigate with base [intellect] 5, cancelling each [frost] token.
registerPlayerCard({
  code: '08618',
  abilities: (state, self, investigator) => {
    const location = here(state, investigator)
    if (!location || self.uses < 1) return []
    return [
      {
        key: `${self.id}:investigate`,
        label: 'ability.edgeOfTheEarth.peaksSpecimen',
        actions: 1,
        actionKind: 'investigate',
        provokes: true,
        costs: [spend(self)],
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'intellect',
            difficulty: shroudOf(state, location),
            baseSkill: 5,
            source: self.id,
            kind: { type: 'investigate', location, extraClues: 1 },
          },
        ],
      },
    ]
  },
  forced: (state, trigger, self) =>
    trigger.type === 'afterSkillTestInitiated' && state.skillTest?.source === self.id
      ? [{ type: 'IgnoreSkillTestTokens', tokens: ['frost'] }]
      : [],
})

// Spare Parts: [fast] add 1 supply to another asset here, or an investigator here gains 1 resource.
registerPlayerCard({
  code: '08620',
  abilities: (state, self, investigator) => {
    const location = here(state, investigator)
    if (!location || self.exhausted || self.uses < 1) return []
    const nearby = playersAt(state, location)
    const assets = Object.values(state.assets).filter(
      (asset) =>
        asset.id !== self.id &&
        nearby.some(({ id }) => id === asset.owner) &&
        playerCardDef(asset.code)?.uses?.type === 'supply',
    )
    const options: [Message[], { label: string; params: Record<string, string> }][] = [
      ...assets.map((asset): [Message[], { label: string; params: Record<string, string> }] => [
        [{ type: 'AddUses', asset: asset.id, amount: 1 }],
        { label: 'choice.edgeOfTheEarth.peaksAddSupplyTo', params: { card: name(asset.code) } },
      ]),
      ...nearby.map(
        ({ id, name: who }): [Message[], { label: string; params: Record<string, string> }] => [
          [{ type: 'GainResources', investigator: id, amount: 1 }],
          { label: 'choice.edgeOfTheEarth.peaksGainResource', params: { name: who } },
        ],
      ),
    ]
    return [
      {
        key: `${self.id}:parts`,
        label: 'ability.edgeOfTheEarth.peaksSpareParts',
        actions: 0,
        provokes: false,
        costs: [spend(self), exhaust(self)],
        then: [
          ask(
            investigator,
            'peaksSpareParts',
            options.map(([then]) => then),
            options.map(([, label]) => label),
          ),
        ],
      },
    ]
  },
})

// Wooden Sledge: an investigator here attaches up to 3 Item or Supply cards from their deck.
registerPlayerCard({
  code: SLEDGE,
  abilities: (state, self, investigator) => {
    const location = here(state, investigator)
    if (!location || self.exhausted) return []
    const searchers = playersAt(state, location).filter(({ deck }) => deck.length)
    if (!searchers.length) return []
    return [
      {
        key: `${self.id}:load`,
        label: 'ability.edgeOfTheEarth.peaksSledgeLoad',
        actions: 1,
        provokes: true,
        costs: [exhaust(self)],
        then: [
          ask(
            investigator,
            'peaksSledgeSearcher',
            searchers.map(({ id }) => [
              scenario('sledgeSearch', { investigator: id, window: 6, picked: 0 }),
            ]),
            searchers.map(({ name: who }) => ({
              label: 'choice.investigator',
              params: { name: who },
            })),
          ),
        ],
      },
    ]
  },
})

const sledgeCards = (state: GameState) =>
  (state.scenarioDecks?.[sledgeDeck] ?? []).map((entry) => {
    const [owner, code] = entry.split('|') as [string, string]
    return { owner, code }
  })
const loadable = (code: string) => {
  const def = playerCardDef(code)
  return (
    !!def && !def.weakness && def.traits.some((trait) => trait === 'Item' || trait === 'Supply')
  )
}

/** Plays from the Wooden Sledge, offered to any investigator at its location. */
export function sledgeAbilities(state: GameState, investigator: InvestigatorId): AbilityOption[] {
  const sledge = Object.values(state.assets).find(({ code }) => code === SLEDGE)
  const location = sledge && here(state, sledge.owner)
  if (!sledge || !location || here(state, investigator) !== location) return []
  const resources = getInvestigator(state, investigator).resources
  return sledgeCards(state).flatMap(({ owner, code }, index) => {
    const def = playerCardDef(code)
    if (!def || (def.type !== 'asset' && def.type !== 'event') || (def.cost ?? 0) > resources)
      return []
    return [
      {
        key: `sledge:${index}:${code}`,
        label: 'ability.edgeOfTheEarth.peaksSledgePlay',
        params: { card: def.name },
        actions: def.fast ? 0 : 1,
        provokes: !def.fast,
        then: [
          scenario('sledgeToHand', { investigator, index }),
          { type: 'PlayCard', investigator, code, originalOwner: owner },
          scenario('sledgeReturn', { investigator, owner, code }),
        ],
      },
    ]
  })
}

/** Small Radio: abilities of Expedition Team assets that are not in play. */
function radioPartners(state: GameState, self: Asset): Asset[] {
  if (self.exhausted || self.uses < 1) return []
  const partners = state.campaignLog?.expedition?.partners ?? {}
  return (Object.entries(partners) as [ExpeditionPartner, { status: string }][]).flatMap(
    ([partner, { status }]) => {
      if (status !== 'safe' && status !== 'resolute') return []
      if (
        Object.values(state.assets).some(({ expeditionPartner }) => expeditionPartner === partner)
      )
        return []
      const code = status === 'resolute' ? expeditionPartners[partner] : partner
      return [
        {
          id: `${self.id}~${code}`,
          code,
          owner: self.owner,
          exhausted: false,
          damage: 0,
          horror: 0,
          uses: 1,
        },
      ]
    },
  )
}
/** Drop the partner's own exhaust and use costs; reject effects that still need the asset. */
function viaRadio(messages: Message[], partner: Asset): Message[] | null {
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value))
      return value
        .filter(
          (item) =>
            !(
              item &&
              typeof item === 'object' &&
              ((item as Message).type === 'ExhaustAsset' ||
                (item as Message).type === 'SpendUses') &&
              (item as { asset?: string }).asset === partner.id
            ),
        )
        .map(strip)
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key, item]) => !(key === 'source' && item === partner.id))
          .map(([key, item]) => [key, strip(item)]),
      )
    return value
  }
  const result = strip(messages) as Message[]
  return JSON.stringify(result).includes(partner.id) ? null : result
}
registerPlayerCard({
  code: RADIO,
  abilities: (state, self, investigator) =>
    radioPartners(state, self).flatMap((partner) =>
      (playerCardBehavior(partner.code)?.abilities?.(state, partner, investigator) ?? []).flatMap(
        (ability) => {
          const then = viaRadio(ability.then, partner)
          const costs = viaRadio(ability.costs ?? [], partner)
          if (!then || !costs) return []
          return [
            {
              ...ability,
              key: `${self.id}:radio:${ability.key}`,
              label: 'ability.edgeOfTheEarth.peaksRadio',
              params: { partner: name(partner.code) },
              costs: [exhaust(self), spend(self), ...costs],
              then,
            },
          ]
        },
      ),
    ),
  reactions: (state, trigger, self) =>
    radioPartners(state, self).flatMap((partner) =>
      (playerCardBehavior(partner.code)?.reactions?.(state, trigger, partner) ?? []).flatMap(
        (reaction): ReactionOption[] => {
          const then = viaRadio(reaction.then, partner)
          if (!then) return []
          return [
            {
              ...reaction,
              key: `${self.id}:radio:${reaction.key}`,
              investigator: self.owner,
              label: 'ability.edgeOfTheEarth.peaksRadio',
              params: { partner: name(partner.code) },
              target:
                reaction.target && !('id' in reaction.target && reaction.target.id === partner.id)
                  ? reaction.target
                  : { type: 'asset', id: self.id },
              then: [exhaust(self), spend(self), ...then],
            },
          ]
        },
      ),
    ),
})

/** Scenario steps of the Wooden Sledge; null for other keys. */
export function supplyStep(
  state: GameState,
  key: string,
  data: Record<string, unknown>,
): GameState | null {
  const investigator = String(data.investigator ?? '')
  switch (key) {
    case 'sledgeSearch': {
      const window = Number(data.window)
      const picked = Number(data.picked)
      const deck = getInvestigator(state, investigator).deck
      const top = deck.slice(0, window)
      const options = [...new Set(top.filter(loadable))]
      if (picked >= 3 || !options.length) return push(state, { type: 'ShuffleDeck', investigator })
      return push(
        state,
        ask(
          investigator,
          'peaksSledgeCard',
          [
            ...options.map((code) => [
              scenario('sledgeAttach', { investigator, code, window, picked }),
            ]),
            [{ type: 'ShuffleDeck', investigator } as Message],
          ],
          [
            ...options.map((code) => ({ label: 'choice.card', params: { card: name(code) } })),
            { label: 'choice.edgeOfTheEarth.peaksSledgeDone' },
          ],
        ),
      )
    }
    case 'sledgeAttach': {
      const code = String(data.code)
      const player = getInvestigator(state, investigator)
      const index = player.deck.slice(0, Number(data.window)).indexOf(code)
      if (index < 0) return state
      return push(
        {
          ...state,
          investigators: state.investigators.map((current) =>
            current.id === investigator
              ? { ...current, deck: current.deck.filter((_, n) => n !== index) }
              : current,
          ),
          scenarioDecks: {
            ...state.scenarioDecks,
            [sledgeDeck]: [...(state.scenarioDecks?.[sledgeDeck] ?? []), `${investigator}|${code}`],
          },
        },
        scenario('sledgeSearch', {
          investigator,
          window: Number(data.window) - 1,
          picked: Number(data.picked) + 1,
        }),
      )
    }
    case 'sledgeToHand': {
      const index = Number(data.index)
      const entries = state.scenarioDecks?.[sledgeDeck] ?? []
      const entry = entries[index]
      if (!entry) return state
      const code = entry.split('|')[1]!
      return {
        ...state,
        scenarioDecks: {
          ...state.scenarioDecks,
          [sledgeDeck]: entries.filter((_, n) => n !== index),
        },
        scenarioMeta: {
          ...state.scenarioMeta,
          sledgePlay: getInvestigator(state, investigator).hand.filter((card) => card === code)
            .length,
        },
        investigators: state.investigators.map((current) =>
          current.id === investigator ? { ...current, hand: [...current.hand, code] } : current,
        ),
      }
    }
    case 'sledgeReturn': {
      // The card was not played: it goes back onto the sledge.
      const code = String(data.code)
      const hand = getInvestigator(state, investigator).hand
      if (
        hand.filter((card) => card === code).length <= Number(state.scenarioMeta?.sledgePlay ?? 0)
      )
        return state
      const at = hand.lastIndexOf(code)
      return {
        ...state,
        investigators: state.investigators.map((current) =>
          current.id === investigator
            ? { ...current, hand: current.hand.filter((_, n) => n !== at) }
            : current,
        ),
        scenarioDecks: {
          ...state.scenarioDecks,
          [sledgeDeck]: [
            ...(state.scenarioDecks?.[sledgeDeck] ?? []),
            `${String(data.owner)}|${code}`,
          ],
        },
      }
    }
    default:
      return null
  }
}
