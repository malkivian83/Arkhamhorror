import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  playerCardDef,
  onScenarioCard,
  push,
  registerEnemy,
  registerTreachery,
  shuffle,
  tekeliliCopies,
  testMargin,
  updateInvestigator,
  type Choice,
  type Enemy,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { chooseSkillTest, effectTest } from '../scenario-helpers'
import { iceMessage } from './ice-and-death'
import { iceTreacheryBlank } from './companion-ellsworth'
import { leftBehind, partnerForEnemy, searchStories } from './part-two-cards'

const story = (part: string): Message => ({
  type: 'Story',
  entry: { title: `story.edgeOfTheEarth.${part}.title`, body: `story.edgeOfTheEarth.${part}.body` },
})
const isTekelili = (code: string) => Object.hasOwn(tekeliliCopies, code)
const isPossessed = (enemy: { traits?: string[] }) => enemy.traits?.includes('Possessed')
export const madnessDifficulty = (state: GameState, enemy: string) =>
  Object.values(state.treacheries).filter(
    (card) =>
      card.code === '08702' &&
      card.placement.type === 'enemy' &&
      card.placement.enemy === enemy &&
      !iceTreacheryBlank(state, card.id),
  ).length

const tests: Record<string, { skills: SkillType[]; difficulty: number; required: number }> = {
  '08537': { skills: ['agility'], difficulty: 2, required: 2 },
  '08538': { skills: ['willpower'], difficulty: 2, required: 2 },
  '08539': { skills: ['willpower', 'intellect'], difficulty: 5, required: 1 },
  '08540': { skills: ['combat'], difficulty: 2, required: 2 },
  '08541': { skills: ['intellect'], difficulty: 2, required: 2 },
  '08542': { skills: ['combat', 'agility'], difficulty: 5, required: 1 },
}
const requiredResources: Record<string, number> = { '08535': 3, '08536': 3, '08543': 5 }

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

function progress(enemy: Enemy, amount: number): Message {
  return iceMessage('rescueProgress', { enemy: enemy.id, amount })
}

for (const [code, partner] of Object.entries(partnerForEnemy)) {
  registerEnemy({
    code,
    abilities: (state, self, investigator) => {
      if (getInvestigator(state, investigator).location !== self.location) return []
      const test = tests[code]
      const difficulty = test ? test.difficulty + madnessDifficulty(state, self.id) : 0
      const outcomes = {
        onSuccess: [iceMessage('rescueTest', { enemy: self.id })],
        onFail: [
          {
            type: 'EnemyAttack' as const,
            enemy: self.id,
            investigator,
            exhaustAfter: false,
            evenIfExhausted: true,
          },
        ],
      }
      const then = test
        ? [
            test.skills.length > 1
              ? chooseSkillTest(investigator, code, test.skills, difficulty, outcomes)
              : effectTest(investigator, code, test.skills[0]!, difficulty, outcomes),
          ]
        : [iceMessage('rescuePayment', { investigator, enemy: self.id })]
      return [
        {
          key: `${self.id}:rescue`,
          label: 'ability.edgeOfTheEarth.rescue',
          params: {
            name: self.name,
            progress: self.leads ?? 0,
            required:
              (test?.required ?? requiredResources[code]!) * state.startingInvestigatorCount,
          },
          actions: 1,
          provokes: false,
          parley: true,
          then: onScenarioCard(then, 'parley'),
        },
      ]
    },
    forced: (_state, trigger, self) =>
      trigger.type === 'enemyDefeated' && trigger.enemy.id === self.id
        ? [{ type: 'SetExpeditionPartnerStatus', partner, status: 'eliminated' }]
        : [],
  })
}

for (const code of ['08700', '08701']) {
  registerEnemy({
    code,
    ...(code === '08700'
      ? {
          spawn: (state: GameState) => {
            const places = Object.keys(state.locations)
            const empty = places.filter(
              (location) =>
                !activeInvestigators(state).some((player) => player.location === location) &&
                !Object.values(state.enemies).some((enemy) => enemy.location === location),
            )
            return empty.length ? empty : places
          },
          abilities: (state: GameState, self: Enemy, investigator: string) =>
            getInvestigator(state, investigator).location === self.location
              ? [
                  {
                    key: `${self.id}:comfort`,
                    label: 'ability.edgeOfTheEarth.comfort',
                    params: { name: self.name },
                    actions: 1,
                    provokes: false,
                    parley: true,
                    then: onScenarioCard(
                      [
                        chooseSkillTest(
                          investigator,
                          code,
                          ['willpower', 'intellect'],
                          3 + madnessDifficulty(state, self.id),
                          {
                            onSuccess: [
                              iceMessage('takeEnemyDoom', {
                                enemy: self.id,
                                investigator,
                                amount: 1,
                              }),
                            ],
                          },
                        ),
                      ],
                      'parley',
                    ),
                  },
                ]
              : [],
        }
      : {
          reactions: (state: GameState, trigger, self: Enemy) =>
            trigger.type === 'afterSkillTest' &&
            trigger.kind === 'evade' &&
            trigger.enemy === self.id &&
            trigger.succeeded &&
            trigger.margin >= 2 &&
            (self.doom ?? 0) > 0
              ? [
                  {
                    key: `${self.id}:take-doom`,
                    investigator: trigger.investigator,
                    label: 'ability.edgeOfTheEarth.takeEnemyDoom',
                    then: [
                      iceMessage('takeEnemyDoom', {
                        enemy: self.id,
                        investigator: trigger.investigator,
                        amount: 1,
                      }),
                    ],
                  },
                ]
              : [],
        }),
    forced: (_state, trigger, self) =>
      trigger.type === 'enemyDefeated' &&
      trigger.enemy.id === self.id &&
      (trigger.enemy.doom ?? 0) > 0
        ? [
            {
              type: 'PlaceLocationTokens',
              location: trigger.enemy.location,
              doom: trigger.enemy.doom!,
            },
          ]
        : [],
  })
}

function chooseEnemy(
  state: GameState,
  investigator: string,
  predicate: (enemy: Enemy) => boolean,
  effect: (enemy: Enemy) => Message,
) {
  return ask(
    investigator,
    'chooseSearchEnemy',
    Object.values(state.enemies)
      .filter(predicate)
      .map((enemy) => ({
        label: 'choice.enemy',
        params: { enemy: enemy.name },
        target: { type: 'enemy', id: enemy.id },
        then: [effect(enemy)],
      })),
  )
}

for (const { code } of searchStories) {
  registerTreachery({
    code,
    revelation: (state, investigator, self) => {
      const nonElite = (enemy: Enemy) => !enemy.traits?.includes('Elite')
      let effects: Message[]
      switch (code) {
        case '08527':
        case '08530':
          effects = [iceMessage('removeFrost', {})]
          break
        case '08528':
        case '08531':
          effects = [iceMessage('cleanseDeck', { investigator, all: false })]
          break
        case '08529':
        case '08533':
          effects = [iceMessage('cleanseDeck', { investigator, all: true })]
          break
        case '08532':
          effects = chooseEnemy(
            state,
            investigator,
            (enemy) => nonElite(enemy) && !!enemy.traits?.includes('Eidolon'),
            (enemy) => ({ type: 'DiscardEnemy', enemy: enemy.id }),
          )
          break
        default:
          effects = chooseEnemy(
            state,
            investigator,
            (enemy) => nonElite(enemy) && !!isPossessed(enemy),
            (enemy) =>
              iceMessage('takeEnemyDoom', {
                investigator,
                enemy: enemy.id,
                amount: enemy.doom ?? 0,
                discard: true,
              }),
          )
      }
      return [
        story(`search${code}`),
        ...effects,
        iceMessage('searchVictory', { treachery: self.id, code }),
      ]
    },
  })
}

registerTreachery({
  code: '08702',
  revelation: (state, investigator, self) => {
    const here = getInvestigator(state, investigator).location
    if (!here) return []
    const enemies = Object.values(state.enemies).filter(isPossessed)
    if (!enemies.length)
      return [iceMessage('searchPossessed', { investigator, treachery: self.id })]
    const distances = distancesFrom(state, here)
    const nearest = Math.min(...enemies.map((enemy) => distances.get(enemy.location) ?? Infinity))
    return chooseEnemy(
      state,
      investigator,
      (enemy) => !!isPossessed(enemy) && (distances.get(enemy.location) ?? Infinity) === nearest,
      (enemy) => iceMessage('attachMadness', { treachery: self.id, enemy: enemy.id, doom: true }),
    )
  },
})

export function partTwoEncounterEffect(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState | undefined {
  const investigator = String(data.investigator)
  const enemy = state.enemies[String(data.enemy)]
  switch (key) {
    case 'rescueTest':
      if (!enemy || !state.skillTest) return state
      return push(
        state,
        progress(
          enemy,
          tests[enemy.code]!.required === 1 ? 1 : Math.max(0, testMargin(state.skillTest)),
        ),
      )
    case 'rescueProgress': {
      if (!enemy) return state
      const leads = (enemy.leads ?? 0) + Number(data.amount)
      const total =
        (tests[enemy.code]?.required ?? requiredResources[enemy.code]!) *
        state.startingInvestigatorCount
      return leads >= total
        ? push(state, { type: 'EnemyToVictory', enemy: enemy.id })
        : { ...state, enemies: { ...state.enemies, [enemy.id]: { ...enemy, leads } } }
    }
    case 'rescuePayment': {
      if (!enemy) return state
      const player = getInvestigator(state, investigator)
      const max =
        enemy.code === '08535'
          ? Math.min(2, player.hand.filter((card) => !playerCardDef(card)?.weakness).length)
          : enemy.code === '08536'
            ? Math.min(2, state.tekeliliDeck?.length ?? 0)
            : Math.min(3, player.resources)
      return push(
        state,
        ...ask(
          investigator,
          'rescueAmount',
          Array.from({ length: max + 1 }, (_, amount): Choice => ({
            label: 'choice.edgeOfTheEarth.rescueAmount',
            params: { amount },
            then:
              amount === 0
                ? []
                : [
                    ...(enemy.code === '08535'
                      ? [{ type: 'ChooseDiscardFromHand' as const, investigator, amount }]
                      : enemy.code === '08536'
                        ? [
                            {
                              type: 'ShuffleTekeliliIntoDeck' as const,
                              investigator,
                              amount,
                              drawInstead: true,
                            },
                          ]
                        : [{ type: 'SpendResources' as const, investigator, amount }]),
                    progress(enemy, amount),
                  ],
          })),
        ),
      )
    }
    case 'takeEnemyDoom': {
      if (!enemy) return state
      const amount = Math.min(enemy.doom ?? 0, Number(data.amount))
      return push(
        state,
        ...(amount
          ? [
              {
                type: 'RemoveDoom' as const,
                target: { type: 'enemy' as const, id: enemy.id },
                amount,
              },
              { type: 'GainClues' as const, investigator, amount },
            ]
          : []),
        ...(data.discard || (enemy.doom ?? 0) === amount
          ? [{ type: 'DiscardEnemy' as const, enemy: enemy.id }]
          : []),
      )
    }
    case 'searchVictory': {
      const { [String(data.treachery)]: _card, ...treacheries } = state.treacheries
      return { ...state, treacheries, victoryDisplay: [...state.victoryDisplay, String(data.code)] }
    }
    case 'cleanseDeck': {
      const player = getInvestigator(state, investigator)
      if (!data.all && data.code === undefined) {
        const choices = [...new Set(player.deck.filter(isTekelili))]
        if (choices.length)
          return push(
            state,
            ...ask(
              investigator,
              'cleanseTekelili',
              choices.map((code) => ({
                label: 'choice.card',
                params: { card: code },
                previewCard: code,
                then: [iceMessage('cleanseDeck', { investigator, all: false, code })],
              })),
            ),
          )
      }
      const at = player.deck.findIndex((code) => code === data.code)
      const removed = player.deck.filter((code, index) =>
        data.all ? index < 9 && isTekelili(code) : index === at,
      )
      const [deck, rng] = shuffle(
        player.deck.filter((code, index) =>
          data.all ? !(index < 9 && isTekelili(code)) : index !== at,
        ),
        state.rng,
      )
      const log = state.campaignLog
      const record = log?.investigators[investigator]
      const storyAssets = [...(record?.storyAssets ?? [])]
      for (const code of removed) {
        const index = storyAssets.indexOf(code)
        if (index >= 0) storyAssets.splice(index, 1)
      }
      return updateInvestigator(
        {
          ...state,
          rng,
          tekeliliDeck: [...(state.tekeliliDeck ?? []), ...removed],
          ...(log && record
            ? {
                campaignLog: {
                  ...log,
                  investigators: {
                    ...log.investigators,
                    [investigator]: { ...record, storyAssets },
                  },
                },
              }
            : {}),
        },
        investigator,
        (player) => ({ ...player, deck }),
      )
    }
    case 'searchPossessed': {
      const codes = new Set(
        [...state.encounterDeck, ...state.encounterDiscard]
          .filter((card) => card.kind === 'enemy' && isPossessed(card))
          .map(({ code }) => code),
      )
      return push(
        state,
        ...ask(
          investigator,
          'chooseSearchEnemy',
          leftBehind
            .filter(
              (card, index, cards) =>
                codes.has(card.code) &&
                cards.findIndex((other) => other.code === card.code) === index,
            )
            .map(({ code, name }) => ({
              label: 'choice.card',
              params: { card: playerCardDef(code)?.name ?? name },
              previewCard: code,
              then: [
                iceMessage('drawPossessed', {
                  investigator,
                  code,
                  treachery: String(data.treachery),
                }),
              ],
            })),
        ),
      )
    }
    case 'drawPossessed': {
      const code = String(data.code)
      return push(
        state,
        { type: 'SearchAndDrawEncounter', investigator, code, amount: 1 },
        iceMessage('attachMadness', { treachery: String(data.treachery), code }),
      )
    }
    case 'attachMadness': {
      const attached =
        enemy ?? Object.values(state.enemies).find((enemy) => enemy.code === data.code)
      if (!attached) return state
      return push(
        state,
        {
          type: 'PlaceTreachery',
          treachery: String(data.treachery),
          placement: { type: 'enemy', enemy: attached.id },
        },
        ...(data.doom
          ? [{ type: 'PlaceDoomOnEnemy' as const, enemy: attached.id, amount: 1 }]
          : []),
      )
    }
    default:
      return undefined
  }
}
