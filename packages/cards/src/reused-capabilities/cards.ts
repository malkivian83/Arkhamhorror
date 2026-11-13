// RR: Chaos Bag (Bless/Curse tokens), Healing, Resources, Uses (charges), Fast, Triggered
// Abilities, Exceptional, Skill Tests, Fight, Enemy Movement, Limits.
import {
  distancesFrom,
  getInvestigator,
  playerCardDef,
  poolTokensAvailable,
  registerPlayerCard,
  skillValueFor,
  testMargin,
  type Asset,
  type ChaosToken,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
  type ReactionOption,
} from '@lcg/engine'
import { elite } from '../basic-events/register'
import { ask, cardName, continuation, fightOptions } from '../dunwich-pilot/effects'

type PoolToken = 'bless' | 'curse'
const inBag = (s: GameState, token: ChaosToken) => s.chaosBag.filter((t) => t === token).length
const here = (s: GameState, by: InvestigatorId) => getInvestigator(s, by).location
const atLocation = (s: GameState, by: InvestigatorId) =>
  s.investigators.filter((i) => !i.eliminated && i.location !== null && i.location === here(s, by))
const tokens = (token: PoolToken, n: number) => Array<ChaosToken>(n).fill(token)
const isAlly = (code: string) => playerCardDef(code)?.traits.includes('Ally') ?? false

/** Investigators at your location and assets they control (allies only when `alliesOnly`). */
function woundedHere(s: GameState, by: InvestigatorId, alliesOnly: boolean) {
  const people = atLocation(s, by)
  return {
    people,
    assets: Object.values(s.assets).filter(
      (a) => people.some((i) => i.id === a.owner) && (!alliesOnly || isAlly(a.code)),
    ),
  }
}

/** The Key of Solomon: heal up to 2 damage and/or horror from one investigator or Ally. */
function healUpToTwo(s: GameState, by: InvestigatorId): Choice[] {
  const { people, assets } = woundedHere(s, by, true)
  const splits = (damage: number, horror: number) =>
    [
      [2, 0],
      [1, 1],
      [0, 2],
    ]
      .map(([d, h]) => [Math.min(d!, damage), Math.min(h!, horror)] as const)
      .filter(([d, h], i, all) => d + h > 0 && all.findIndex(([x, y]) => x === d && y === h) === i)
  return [
    ...people.flatMap((i) =>
      splits(i.damage, i.horror).map(([damage, horror]): Choice => ({
        label: 'choice.protectionHeal',
        params: { damage, horror, card: i.name },
        target: { type: 'investigator', id: i.id },
        then: [{ type: 'Heal', investigator: i.id, damage, horror, healer: by }],
      })),
    ),
    ...assets.flatMap((a) =>
      splits(a.damage, a.horror).map(([damage, horror]): Choice => ({
        label: 'choice.protectionHeal',
        params: { damage, horror, card: cardName(a.code) },
        target: { type: 'asset', id: a.id },
        then: [{ type: 'HealAsset', asset: a.id, damage, horror, healer: by }],
      })),
    ),
  ]
}

/** Rite of Equilibrium: heal 1 horror from a card at your location, `left` times. */
function healHorrorStep(code: string, s: GameState, by: InvestigatorId, left: number): Message[] {
  if (left <= 0) return []
  const { people, assets } = woundedHere(s, by, false)
  const next = left > 1 ? [continuation(code, by, 'heal', { left: left - 1 })] : []
  return ask(
    by,
    [
      ...people
        .filter((i) => i.horror > 0)
        .map((i): Choice => ({
          label: 'choice.healHorrorOf',
          params: { name: i.name },
          target: { type: 'investigator', id: i.id },
          then: [{ type: 'Heal', investigator: i.id, damage: 0, horror: 1, healer: by }, ...next],
        })),
      ...assets
        .filter((a) => a.horror > 0)
        .map((a): Choice => ({
          label: 'choice.healHorrorOf',
          params: { name: cardName(a.code) },
          target: { type: 'asset', id: a.id },
          then: [{ type: 'HealAsset', asset: a.id, damage: 0, horror: 1, healer: by }, ...next],
        })),
    ],
    true,
  )
}

/** Locations exactly 1..range connections away from `from` (enemy movement graph). */
function awayFrom(s: GameState, from: string, range: number): string[] {
  return [...distancesFrom(s, from, true).entries()]
    .filter(([, d]) => d >= 1 && d <= range)
    .map(([id]) => id)
}

/** Registers a reviewed card of lot 134; false if the code is not part of it. */
export function registerReusedCapability(code: string): boolean {
  // The Key of Solomon (4): [fast] abilities paid by removing a Bless/Curse token.
  if (code === '10104') {
    registerPlayerCard({
      code,
      fastOptions: (s, a): ReactionOption[] => {
        if (a.exhausted) return []
        const bless = inBag(s, 'bless'),
          curse = inBag(s, 'curse')
        const pay = (token: PoolToken): Message[] => [
          { type: 'RemoveChaosTokens', tokens: [token] },
          { type: 'ExhaustAsset', asset: a.id },
        ]
        const options: ReactionOption[] = []
        // RR: an ability cannot be initiated unless its effect can change the game state.
        if (bless > curse && healUpToTwo(s, a.owner).length)
          options.push({
            key: a.id + ':heal',
            investigator: a.owner,
            label: 'choice.keyOfSolomonHeal',
            params: { card: cardName(code) },
            then: [...pay('bless'), continuation(code, a.owner, 'heal')],
          })
        if (curse > bless)
          options.push({
            key: a.id + ':gain',
            investigator: a.owner,
            label: 'choice.keyOfSolomonGain',
            params: { card: cardName(code) },
            then: [...pay('curse'), { type: 'GainResources', investigator: a.owner, amount: 2 }],
          })
        return options
      },
      effect: (s, by, step) => (step === 'heal' ? ask(by, healUpToTwo(s, by), true) : []),
    })
    return true
  }
  // Rite of Equilibrium (5): add X curse to add X bless, or remove X of each to heal X horror.
  if (code === '07308') {
    const adds = (s: GameState) =>
      poolTokensAvailable(s, 'bless') > 0 ? poolTokensAvailable(s, 'curse') : 0
    const removes = (s: GameState, by: InvestigatorId) => {
      const { people, assets } = woundedHere(s, by, false)
      return [...people, ...assets].some((card) => card.horror > 0)
        ? Math.min(inBag(s, 'curse'), inBag(s, 'bless'))
        : 0
    }
    registerPlayerCard({
      code,
      canPlay: (s, by) => adds(s) > 0 || removes(s, by) > 0,
      play: (s, by) =>
        ask(
          by,
          [
            ...Array.from({ length: adds(s) }, (_, i): Choice => {
              const n = i + 1
              return {
                label: 'choice.equilibriumAdd',
                params: { n },
                then: [
                  { type: 'AddChaosTokens', tokens: tokens('curse', n), scenarioOnly: true },
                  { type: 'AddChaosTokens', tokens: tokens('bless', n), scenarioOnly: true },
                ],
              }
            }),
            ...Array.from({ length: removes(s, by) }, (_, i): Choice => {
              const n = i + 1
              return {
                label: 'choice.equilibriumHeal',
                params: { n },
                then: [
                  {
                    type: 'RemoveChaosTokens',
                    tokens: [...tokens('curse', n), ...tokens('bless', n)],
                  },
                  continuation(code, by, 'heal', { left: n }),
                ],
              }
            }),
          ],
          true,
        ),
      effect: (s, by, step, data) =>
        step === 'heal' ? healHorrorStep(code, s, by, Number(data.left)) : [],
    })
    return true
  }
  // "I'll Pay You Back!": take another investigator's resources; return yours at round end.
  if (code === '10072') {
    const others = (s: GameState, by: InvestigatorId) =>
      atLocation(s, by).filter((i) => i.id !== by)
    registerPlayerCard({
      code,
      canPlay: (s, by) => s.activeTurn === by && others(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          others(s, by).map((i): Choice => ({
            label: 'choice.payBackTake',
            params: { name: i.name, n: i.resources },
            target: { type: 'investigator', id: i.id },
            then: [
              // Moving resources is not gaining them.
              { type: 'LoseResources', investigator: i.id, amount: i.resources },
              { type: 'MoveResourcesToPool', investigator: by, amount: i.resources },
              { type: 'AtEndOfRound', then: [continuation(code, by, 'repay', { to: i.id })] },
            ],
          })),
          true,
        ),
      effect: (s, by, step, data) => {
        const to = s.investigators.find((i) => i.id === String(data.to))
        const amount = getInvestigator(s, by).resources
        if (step !== 'repay' || !to || to.eliminated || amount <= 0) return []
        return [
          { type: 'LoseResources', investigator: by, amount },
          { type: 'MoveResourcesToPool', investigator: to.id, amount },
        ]
      },
    })
    return true
  }
  // Lost Arcana (3): lends its charges to Spell/Ritual assets; recharges after the last clue.
  if (code === '11078') {
    registerPlayerCard({
      code,
      lendsUses: { traits: ['Spell', 'Ritual'] },
      reactions: (s, t, a) =>
        t.type === 'afterDiscoverClues' &&
        t.last &&
        !a.exhausted &&
        here(s, a.owner) !== null &&
        t.location === here(s, a.owner)
          ? [
              {
                key: a.id + ':recharge',
                investigator: a.owner,
                label: 'choice.lostArcanaCharge',
                params: { card: cardName(code) },
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'AddUses', asset: a.id, amount: 1 },
                ],
              },
            ]
          : [],
    })
    return true
  }
  // The Red Clock (2): either place 1 charge or take all as resources; then exactly 1/2/3.
  if (code === '08053') {
    const after = (a: Asset): Message => continuation(code, a.owner, 'charges', { asset: a.id })
    registerPlayerCard({
      code,
      forced: (_s, t, a) => {
        if (t.type !== 'turnBegins' || t.investigator !== a.owner) return []
        const place: Message[] = [{ type: 'AddUses', asset: a.id, amount: 1 }, after(a)]
        if (a.uses <= 0) return place
        return ask(
          a.owner,
          [
            { label: 'choice.redClockPlace', params: { card: cardName(code) }, then: place },
            {
              label: 'choice.redClockTake',
              params: { n: a.uses },
              then: [
                { type: 'SpendUses', asset: a.id, amount: a.uses },
                { type: 'GainResources', investigator: a.owner, amount: a.uses },
                after(a),
              ],
            },
          ],
          true,
        )
      },
      effect: (s, by, step, data) => {
        if (step === 'move') {
          const left = Number(data.left)
          return [
            {
              type: 'ChooseMove',
              investigator: by,
              ...(left > 1 ? { then: [continuation(code, by, 'move', { left: left - 1 })] } : {}),
            },
          ]
        }
        const clock = s.assets[String(data.asset)]
        if (step !== 'charges' || !clock) return []
        if (clock.uses === 1) return [{ type: 'NextTestBonus', investigator: by, amount: 3 }]
        if (clock.uses === 2) return [continuation(code, by, 'move', { left: 2 })]
        if (clock.uses === 3) return [{ type: 'GainActions', investigator: by, amount: 1 }]
        return []
      },
    })
    return true
  }
  // Yaotl (1): bonus from the top card of your discard pile; mill 1 (once per phase).
  if (code === '04035') {
    const matching = (s: GameState, a: Asset) => {
      const test = s.skillTest,
        top = getInvestigator(s, a.owner).discard.at(-1)
      if (!test || test.investigator !== a.owner || !top) return 0
      return playerCardDef(top)?.icons?.[test.skill] ?? 0
    }
    registerPlayerCard({
      code,
      fastOptions: (s, a): ReactionOption[] => [
        ...(!a.exhausted && matching(s, a) > 0
          ? [
              {
                key: a.id + ':bonus',
                investigator: a.owner,
                label: 'ability.exhaustForBonus',
                params: { card: cardName(code), amount: matching(s, a) },
                then: [
                  { type: 'ExhaustAsset', asset: a.id } as Message,
                  { type: 'BoostSkillTest', amount: matching(s, a) } as Message,
                ],
              },
            ]
          : []),
        ...(getInvestigator(s, a.owner).deck.length > 0
          ? [
              {
                key: a.id + ':mill',
                investigator: a.owner,
                label: 'choice.yaotlDiscard',
                params: { card: cardName(code) },
                limit: { per: 'phase' as const },
                then: [{ type: 'MillDeck', investigator: a.owner, amount: 1 } as Message],
              },
            ]
          : []),
      ],
    })
    return true
  }
  // Cyclopean Hammer (5): fight adding [willpower]; push a non-Elite enemy away on success.
  if (code === '08093') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        a.owner !== by
          ? []
          : fightOptions(s, a, by, 0).map((o) => {
              const enemy = o.target.id
              const kind = {
                type: 'fight' as const,
                enemy,
                extraDamage: 1,
                damageIfSuccessBy: { atLeast: 3, amount: 1 },
                onSuccess: [continuation(code, by, 'push', { enemy })],
              }
              return {
                ...o,
                then: [
                  {
                    ...o.then[0]!,
                    modifier: skillValueFor(s, by, 'willpower', kind),
                    kind,
                  },
                ],
              }
            }),
      effect: (s, by, step, data) => {
        const enemy = s.enemies[String(data.enemy)]
        const from = here(s, by)
        if (step !== 'push' || !enemy || elite(enemy) || from === null || enemy.location !== from)
          return []
        const range = s.skillTest && testMargin(s.skillTest) >= 3 ? 2 : 1
        return ask(
          by,
          [
            { label: 'choice.skip', then: [] },
            ...awayFrom(s, from, range).map((location): Choice => ({
              label: 'choice.moveEnemyTo',
              params: { enemy: enemy.name, location: s.locations[location]!.name },
              target: { type: 'location', id: location },
              then: [{ type: 'MoveEnemy', enemy: enemy.id, location, effectSource: code }],
            })),
          ],
          true,
        )
      },
    })
    return true
  }
  return false
}
