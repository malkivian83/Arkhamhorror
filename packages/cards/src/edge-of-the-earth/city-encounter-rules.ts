import {
  distancesFrom,
  getInvestigator,
  push,
  registerEnemy,
  registerPlayerCards,
  registerTreachery,
  shuffle,
  type ChaosToken,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { BENIGN, REAWAKENED } from './city-cards'

// Behaviors of the City of the Elder Things encounter cards (card texts, guide pp. 36–43).

const city = (key: string, data: Record<string, string | number>): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const at = (state: GameState, investigator: InvestigatorId) =>
  getInvestigator(state, investigator).location

/** Keys on your location or controlled by an investigator at it (Crumbling Ruins). */
export function keysAround(state: GameState, investigator: InvestigatorId): ChaosToken[] {
  const here = at(state, investigator)
  if (!here) return []
  return [
    ...(state.locations[here]?.keys ?? []),
    ...state.investigators
      .filter(({ location, eliminated }) => !eliminated && location === here)
      .flatMap(({ keys }) => keys ?? []),
  ]
}
/** Each key placed on an enemy goes to its location when it leaves play. */
export const dropEnemyKeys = (enemy: Enemy): Message[] =>
  (enemy.keys ?? []).map((key): Message => ({
    type: 'PlaceKey',
    key,
    on: { type: 'location', id: enemy.location },
  }))

registerEnemy({
  code: BENIGN,
  // Spawn – Any empty location.
  spawn: (state) =>
    Object.keys(state.locations).filter(
      (id) =>
        !state.investigators.some(({ location, eliminated }) => !eliminated && location === id) &&
        !Object.values(state.enemies).some(({ location }) => location === id),
    ),
  forced: (_state, trigger, self) =>
    trigger.type === 'enemySpawned' && trigger.enemy === self.id
      ? [{ type: 'PlaceDoomOnEnemy', enemy: self.id, amount: 1 }]
      : trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id
        ? [{ type: 'PlaceDoom', amount: 1 }]
        : [],
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:parley`,
      label: 'ability.edgeOfTheEarth.city.parleyBenign',
      actions: 1,
      provokes: false,
      parley: true,
      then: [
        effectTest(investigator, BENIGN, 'willpower', 3, {
          onSuccess: [{ type: 'RemoveEnemyFromGame', enemy: self.id }],
        }),
      ],
    },
  ],
})

registerEnemy({
  code: REAWAKENED,
  forced: (state, trigger, self) => {
    // When this enemy engages you: place a key you control on it.
    if (trigger.type === 'afterEngage' && trigger.enemy === self.id)
      return [city('reawakenedKey', { investigator: trigger.investigator, enemy: self.id })]
    // When it leaves play, place that key on its location.
    if (trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id)
      return dropEnemyKeys(trigger.enemy)
    // An investigator at its location takes control of a key: it readies, engages and attacks.
    if (trigger.type === 'afterTakeKey' && at(state, trigger.investigator) === self.location)
      return [
        { type: 'ReadyEnemy', enemy: self.id },
        { type: 'EngageEnemy', enemy: self.id, investigator: trigger.investigator },
        {
          type: 'EnemyAttack',
          enemy: self.id,
          investigator: trigger.investigator,
          exhaustAfter: false,
        },
      ]
    return []
  },
})

// Giant Albino Penguin: entering or leaving its location costs 1 additional action.
registerEnemy({ code: '08708', moveCost: 1 })

const drawTekelili = (investigator: InvestigatorId): Message => ({
  type: 'ShuffleTekeliliIntoDeck',
  investigator,
  amount: 1,
  drawInstead: true,
})
registerEnemy({
  code: '08710',
  // After it engages you: draw the top Tekeli-li card (if you cannot, it attacks you).
  forced: (state, trigger, self) =>
    trigger.type === 'afterEngage' && trigger.enemy === self.id
      ? (state.tekeliliDeck?.length ?? 0) > 0
        ? [drawTekelili(trigger.investigator)]
        : [
            {
              type: 'EnemyAttack',
              enemy: self.id,
              investigator: trigger.investigator,
              exhaustAfter: false,
            },
          ]
      : [],
})
registerEnemy({
  code: '08711',
  // At the end of the enemy phase: 2 damage to each investigator and non-Shoggoth enemy here.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'enemyPhaseEnds') return []
    const players = state.investigators.filter(
      ({ location, eliminated }) => !eliminated && location === self.location,
    )
    return [
      ...players.map(({ id }): Message => ({
        type: 'TakeDamage',
        investigator: id,
        damage: 2,
        horror: 0,
      })),
      ...Object.values(state.enemies)
        .filter(
          ({ location, traits }) => location === self.location && !traits?.includes('Shoggoth'),
        )
        .map((enemy): Message => ({ type: 'DamageEnemy', enemy: enemy.id, amount: 2 })),
      ...players.map(({ id }) => drawTekelili(id)),
    ]
  },
})

registerTreachery({
  code: '08644',
  // Difficulty 2, +1 for each key on your location or under your control.
  revelation: (state, investigator) => {
    const here = at(state, investigator)
    const keys =
      (here ? (state.locations[here]?.keys?.length ?? 0) : 0) +
      (getInvestigator(state, investigator).keys?.length ?? 0)
    return [
      effectTest(investigator, '08644', 'willpower', 2 + keys, {
        onFail: [
          { type: 'TakeDamage', investigator, damage: 0, horror: 2 },
          city('dawning', { investigator, points: 0 }),
        ],
        onFailEach: [city('dawning', { investigator, points: 1 })],
      }),
    ]
  },
})
registerTreachery({
  code: '08645',
  // A revealed token matching a key here fails the test automatically (scenario rules).
  revelation: (_state, investigator) => [
    effectTest(investigator, '08645', 'agility', 3, {
      onFailEach: [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 }],
    }),
  ],
})
registerTreachery({
  code: '08709',
  revelation: (_state, investigator) => [city('wuk', { investigator })],
})

// Frostbitten and Possessed: weaknesses in your threat area, healed as 1 damage or 1 horror.
const injuries = [
  ['08646', 'Frostbitten', 'Injury', 'damage'],
  ['08647', 'Possessed', 'Madness', 'horror'],
] as const
registerPlayerCards(
  injuries.map(([code, name, trait]) => ({
    code,
    name,
    type: 'treachery' as const,
    class: 'neutral',
    traits: [trait],
    weakness: 'weakness' as const,
    story: true,
  })),
)
for (const [code, , , kind] of injuries)
  registerTreachery({
    code,
    healsAs: kind,
    revelation: (_state, investigator, self) => [
      {
        type: 'PlaceTreachery',
        treachery: self.id,
        placement: { type: 'threatArea', investigator },
      },
    ],
    // When you reveal a [frost] token during a skill test: take 1 or fail (once per test).
    forced: (state, trigger, self) => {
      const test = state.skillTest
      if (
        trigger.type !== 'afterRevealChaosToken' ||
        trigger.token !== 'frost' ||
        !test ||
        self.placement.type !== 'threatArea' ||
        self.placement.investigator !== trigger.investigator ||
        test.tokens.filter((token) => token === 'frost').length !== 1
      )
        return []
      return [
        {
          type: 'Ask',
          investigator: trigger.investigator,
          question: {
            kind: 'chooseOne',
            prompt: `prompt.edgeOfTheEarth.city${kind === 'damage' ? 'Frostbitten' : 'Possessed'}`,
            choices: [
              {
                label: `choice.edgeOfTheEarth.city${kind === 'damage' ? 'TakeDamage' : 'TakeHorror'}`,
                then: [
                  {
                    type: 'TakeDamage',
                    investigator: trigger.investigator,
                    damage: kind === 'damage' ? 1 : 0,
                    horror: kind === 'horror' ? 1 : 0,
                  },
                ],
              },
              {
                label: 'choice.edgeOfTheEarth.cityAutoFail',
                then: [{ type: 'ForceSkillTestFailure' }],
              },
            ],
          },
        },
      ]
    },
  })

/** Scenario steps of the City encounter cards; null for other keys. */
export function cityEncounterStep(
  state: GameState,
  key: string,
  data: Record<string, unknown>,
): GameState | null {
  const investigator = String(data.investigator ?? '')
  switch (key) {
    case 'reawakenedKey': {
      const keys = [...new Set(getInvestigator(state, investigator).keys ?? [])]
      const place = (key: ChaosToken): Message => ({
        type: 'PlaceKey',
        key,
        from: { type: 'investigator', id: investigator },
        on: { type: 'enemy', id: String(data.enemy) },
      })
      if (!keys.length) return state
      if (keys.length === 1) return push(state, place(keys[0]!))
      return push(state, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.edgeOfTheEarth.cityDropKey',
          choices: keys.map((key) => ({
            label: 'choice.edgeOfTheEarth.cityKey',
            params: { key: String(key) },
            then: [place(key)],
          })),
        },
      })
    }
    case 'dawning': {
      // Fail by 3 or more: 3 horror instead of 2 (onFail resets, each failed point counts).
      const meta = `dawning:${investigator}`
      const points = Number(data.points) ? Number(state.scenarioMeta?.[meta] ?? 0) + 1 : 0
      const next = { ...state, scenarioMeta: { ...state.scenarioMeta, [meta]: points } }
      return points === 3
        ? push(next, { type: 'TakeDamage', investigator, damage: 0, horror: 1 })
        : next
    }
    case 'wuk': {
      const here = at(state, investigator)
      const penguins = Object.values(state.enemies).filter(({ code }) => code === '08708')
      if (!penguins.length) {
        // Search the encounter deck and discard pile for a Giant Albino Penguin and draw it.
        const inDeck = state.encounterDeck.findIndex(({ code }) => code === '08708')
        const inDiscard = state.encounterDiscard.findIndex(({ code }) => code === '08708')
        const card = inDeck >= 0 ? state.encounterDeck[inDeck] : state.encounterDiscard[inDiscard]
        const [encounterDeck, rng] = shuffle(
          state.encounterDeck.filter((_, n) => n !== inDeck),
          state.rng,
        )
        const next: GameState = {
          ...state,
          rng,
          encounterDeck,
          encounterDiscard:
            inDeck >= 0
              ? state.encounterDiscard
              : state.encounterDiscard.filter((_, n) => n !== inDiscard),
        }
        return card ? push(next, { type: 'ResolveEncounterCard', investigator, card }) : next
      }
      if (!here) return state
      const distance = distancesFrom(state, here)
      const farthest = Math.max(...penguins.map(({ location }) => distance.get(location) ?? 0))
      const options = penguins.filter(({ location }) => (distance.get(location) ?? 0) === farthest)
      return push(state, {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.edgeOfTheEarth.cityWuk',
          choices: options.flatMap((penguin) => [
            {
              label: 'choice.edgeOfTheEarth.cityWukMove',
              params: { enemy: penguin.name },
              target: { type: 'enemy' as const, id: penguin.id },
              then: [{ type: 'MoveEnemy', enemy: penguin.id, location: here } as Message],
            },
            {
              label: 'choice.edgeOfTheEarth.cityWukDoom',
              params: { enemy: penguin.name },
              target: { type: 'enemy' as const, id: penguin.id },
              then: [{ type: 'PlaceDoomOnEnemy', enemy: penguin.id, amount: 1 } as Message],
            },
          ]),
        },
      })
    }
    default:
      return null
  }
}
