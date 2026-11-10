// RR: Seal (sealed tokens leave the chaos bag; released ones return to it; bless/curse
// returned "to the token pool" leave play), Chaos Bag (Bless/Curse tokens), Triggered
// Abilities, Enemy Attacks (Cancel), Uses, Fight, Investigate, Limits.
import {
  enemyBehavior,
  getInvestigator,
  playerCardDef,
  poolTokensAvailable,
  registerPlayerCard,
  type AbilityOption,
  type Asset,
  type ChaosToken,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
  type ReactionOption,
  type Trigger,
} from '@lcg/engine'
import { basicTest, testChoices, type Ctx } from '../basic-events/register'
import { ask, cardName, continuation, fightOptions, moveChoices } from '../dunwich-pilot/effects'

type PoolToken = 'bless' | 'curse'
const add = (token: PoolToken, n: number): Message[] =>
  n > 0 ? [{ type: 'AddChaosTokens', tokens: Array(n).fill(token), scenarioOnly: true }] : []
const remove = (token: PoolToken, n: number): Message[] =>
  n > 0 ? [{ type: 'RemoveChaosTokens', tokens: Array(n).fill(token) }] : []
const inBag = (s: GameState, token: ChaosToken) => s.chaosBag.filter((t) => t === token).length
const SYMBOLS: ChaosToken[] = ['skull', 'cultist', 'tablet', 'elderThing']
const holderOf = (a: Asset) => ({ type: 'asset' as const, id: a.id })

/** Tokens sealed on this asset (optionally only `token`). */
export const sealedOn = (s: GameState, id: string, token?: ChaosToken) =>
  (s.sealed ?? []).filter(
    (e) =>
      e.holder?.type === 'asset' &&
      e.holder.id === id &&
      (token === undefined || e.token === token),
  )

const seal = (a: Asset, code: string, token: ChaosToken, n = 1): Message[] =>
  Array.from({ length: n }, () => ({
    type: 'SealToken' as const,
    investigator: a.owner,
    code,
    token,
    holder: holderOf(a),
  }))
const release = (a: Asset, n = 1): Message => ({
  type: 'ReleaseSealedTokens',
  holder: holderOf(a),
  count: n,
})
const tokenLabel = (t: ChaosToken) => (typeof t === 'number' ? (t > 0 ? `+${t}` : `${t}`) : t)
const here = (s: GameState, by: InvestigatorId) => getInvestigator(s, by).location

interface SealSpec {
  /** Seal one of these tokens (the player chooses among those in the bag). */
  one?: ChaosToken[] | 'anyButAutoFail'
  /** Seal up to N tokens of this kind (may be 0). */
  upTo?: { token: PoolToken; max: number }
  /** "If there are no tokens sealed on it, discard it." */
  discardWhenEmpty?: boolean
}

const options = (s: GameState, one: SealSpec['one']): ChaosToken[] =>
  one === 'anyButAutoFail'
    ? [...new Set(s.chaosBag.filter((t) => t !== 'autoFail'))]
    : (one ?? []).filter((t) => s.chaosBag.includes(t))

/** RR Seal keyword: seal when it enters play; a fixed Seal that cannot be paid blocks playing. */
function sealOnEnter(code: string, spec: SealSpec, s: GameState, a: Asset): Message[] {
  if (spec.one) {
    const choices = options(s, spec.one).map((t): Choice => ({
      label: 'choice.sealTokenOn',
      params: { token: tokenLabel(t), card: cardName(code) },
      then: seal(a, code, t),
    }))
    return ask(a.owner, choices, true)
  }
  const { token, max } = spec.upTo!
  const top = Math.min(max, inBag(s, token))
  return ask(
    a.owner,
    Array.from({ length: top + 1 }, (_, n) => top - n).map((n): Choice => ({
      label: 'choice.sealCount',
      params: { n, token, card: cardName(code) },
      then: [...seal(a, code, token, n), ...(spec.discardWhenEmpty ? [empty(code, a)] : [])],
    })),
    true,
  )
}

/** Continuation: discard the asset if nothing is sealed on it any more. */
const empty = (code: string, a: Asset): Message =>
  continuation(code, a.owner, 'empty', { asset: a.id })

function sealBehavior(code: string, spec: SealSpec) {
  return {
    ...(spec.one && spec.one !== 'anyButAutoFail'
      ? { canPlay: (s: GameState) => options(s, spec.one).length > 0 }
      : {}),
    forced: (s: GameState, t: Trigger, self: Asset): Message[] =>
      t.type === 'afterAssetEntersPlay' && t.asset === self.id
        ? sealOnEnter(code, spec, s, self)
        : [],
  }
}

const emptyEffect =
  (code: string) =>
  (
    s: GameState,
    _by: InvestigatorId,
    step: string,
    data: Record<string, string | number | boolean>,
  ) => {
    const a = s.assets[String(data.asset)]
    if (step !== 'empty' || !a || a.code !== code) return []
    return sealedOn(s, a.id).length ? [] : [{ type: 'DiscardAsset', asset: a.id } as Message]
  }

/** "You must either spend 1 resource (or charge) or discard it." */
function payOrDiscard(a: Asset, s: GameState, use: 'resource' | 'charge'): Message[] {
  const can = use === 'resource' ? getInvestigator(s, a.owner).resources > 0 : a.uses > 0
  const discard: Choice = {
    label: 'choice.discard',
    params: { card: cardName(a.code) },
    then: [{ type: 'DiscardAsset', asset: a.id }],
  }
  if (!can) return [{ type: 'DiscardAsset', asset: a.id }]
  return ask(
    a.owner,
    [
      use === 'resource'
        ? {
            label: 'choice.sealKeepResource',
            params: { card: cardName(a.code) },
            then: [{ type: 'SpendResources', investigator: a.owner, amount: 1 }],
          }
        : {
            label: 'choice.sealKeepCharge',
            params: { card: cardName(a.code) },
            then: [{ type: 'SpendUses', asset: a.id, amount: 1 }],
          },
      discard,
    ],
    true,
  )
}

/** "When an enemy attacks an investigator at your location, exhaust and release: cancel." */
function cancelAttack(
  s: GameState,
  t: Trigger,
  a: Asset,
  then: (enemy: string, investigator: InvestigatorId) => Message[],
): ReactionOption[] {
  if (t.type !== 'whenEnemyAttacks' || a.exhausted || !sealedOn(s, a.id).length) return []
  if (s.canceledAttack === t.enemy) return []
  const e = s.enemies[t.enemy] ?? s.attackSourcesWithoutLocation?.[t.enemy]
  const at = here(s, a.owner)
  if (!e || enemyBehavior(e.code)?.attacksCannotBeCanceled) return []
  if (at === null || here(s, t.investigator) !== at) return []
  return [
    {
      key: a.id + ':cancel',
      investigator: a.owner,
      label: 'ability.sealCancelAttack',
      params: { card: cardName(a.code), enemy: e.name },
      target: { type: 'asset', id: a.id },
      then: [
        { type: 'ExhaustAsset', asset: a.id },
        release(a),
        { type: 'CancelEnemyAttack', enemy: e.id },
        ...then(e.id, t.investigator),
      ],
    },
  ]
}

/** "You may resolve this keyword again": seal one more token. */
const sealAgain = (s: GameState, a: Asset, code: string, one: ChaosToken[]): ReactionOption[] =>
  options(s, one).length
    ? [
        {
          key: a.id + ':again',
          investigator: a.owner,
          label: 'ability.sealAgain',
          params: { card: cardName(code) },
          target: { type: 'asset', id: a.id },
          then: sealOnEnter(code, { one }, s, a),
        },
      ]
    : []

const limitOnePerInvestigator = (code: string) => (s: GameState, by: InvestigatorId) =>
  !Object.values(s.assets).some((a) => a.code === code && a.owner === by)

function registerAsset(code: string): boolean {
  // Shield of Faith: Seal (up to 5 [bless]); discarded when empty. [reaction] When an enemy
  // attacks an investigator at your location, exhaust and release a sealed token: cancel it.
  if (code === '07221') {
    const spec: SealSpec = { upTo: { token: 'bless', max: 5 }, discardWhenEmpty: true }
    registerPlayerCard({
      code,
      ...sealBehavior(code, spec),
      reactions: (s, t, a) => cancelAttack(s, t, a, () => [empty(code, a)]),
      effect: emptyEffect(code),
    })
    return true
  }
  // Dark Ritual: Seal (up to 5 [curse]). Forced - at the end of the mythos phase: spend 1
  // resource or discard it.
  if (code === '07026') {
    registerPlayerCard({
      code,
      ...sealBehavior(code, { upTo: { token: 'curse', max: 5 } }),
      forced: (s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? sealOnEnter(code, { upTo: { token: 'curse', max: 5 } }, s, a)
          : t.type === 'mythosPhaseEnds'
            ? payOrDiscard(a, s, 'resource')
            : [],
    })
    return true
  }
  // Favor of the Moon / Sun: fast; Seal (up to 3 [curse]/[bless]); discarded when empty.
  // [reaction] When you would reveal a chaos token from the bag, exhaust: resolve a sealed
  // token instead, as if just revealed. Moon: then gain 1 resource.
  if (code === '07271' || code === '07272') {
    const token: PoolToken = code === '07271' ? 'curse' : 'bless'
    registerPlayerCard({
      code,
      ...sealBehavior(code, { upTo: { token, max: 3 }, discardWhenEmpty: true }),
      resolveSealedInstead: {
        exhaust: true,
        then: (_s, a) => [
          ...(code === '07271'
            ? [{ type: 'GainResources', investigator: a.owner, amount: 1 } as Message]
            : []),
          empty(code, a),
        ],
      },
      effect: emptyEffect(code),
    })
    return true
  }
  // Holy Spear: [action] Fight, +2 [combat], +1 damage; when you initiate it, you may release a
  // sealed [bless]. [action] Seal 2 [bless] from the bag: Fight, +4 [combat], +2 damage.
  if (code === '07302') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) => {
        const basic = fightOptions(s, a, by, 2, { extraDamage: 1 })
        const released = sealedOn(s, a.id, 'bless').length
          ? basic.map((o): AbilityOption => ({
              ...o,
              key: o.key + ':release',
              label: 'ability.holySpearRelease',
              then: [{ ...release(a), token: 'bless' } as Message, ...o.then],
            }))
          : []
        const sealed =
          inBag(s, 'bless') >= 2
            ? fightOptions(s, a, by, 4, { extraDamage: 2 }).map((o): AbilityOption => ({
                ...o,
                key: o.key + ':seal',
                label: 'ability.holySpearSeal',
                costs: seal(a, code, 'bless', 2),
              }))
            : []
        return [...basic, ...released, ...sealed]
      },
    })
    return true
  }
  // The Chthonian Stone (0, 3): Seal ([skull], [cultist], [tablet] or [elder_thing]). Forced -
  // after you reveal an [auto_fail] during a skill test: return it to your hand (level 3:
  // remove 1 charge; with no charges, return it to your hand).
  if (code === '04030' || code === '53008') {
    registerPlayerCard({
      code,
      ...sealBehavior(code, { one: SYMBOLS }),
      forced: (s, t, a) => {
        if (t.type === 'afterAssetEntersPlay' && t.asset === a.id)
          return sealOnEnter(code, { one: SYMBOLS }, s, a)
        if (t.type !== 'afterRevealChaosToken' || t.token !== 'autoFail') return []
        if (t.investigator !== a.owner || !s.skillTest) return []
        return code === '04030'
          ? [{ type: 'ReturnAssetToHand', asset: a.id }]
          : [
              { type: 'RemoveUses', asset: a.id, amount: 1 },
              continuation(code, a.owner, 'charges', { asset: a.id }),
            ]
      },
      effect: (s, _by, step, data) => {
        const a = s.assets[String(data.asset)]
        return step === 'charges' && a && a.uses <= 0
          ? [{ type: 'ReturnAssetToHand', asset: a.id }]
          : []
      },
    })
    return true
  }
  // Protective Incantation: group limit 2 in play. Seal (any except [auto_fail]). Forced - at
  // the end of your turn: spend 1 resource or discard it.
  if (code === '04031') {
    const spec: SealSpec = { one: 'anyButAutoFail' }
    registerPlayerCard({
      code,
      canPlay: (s) =>
        options(s, 'anyButAutoFail').length > 0 &&
        Object.values(s.assets).filter((a) => a.code === code).length < 2,
      forced: (s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? sealOnEnter(code, spec, s, a)
          : t.type === 'turnEnds' && t.investigator === a.owner
            ? payOrDiscard(a, s, 'resource')
            : [],
    })
    return true
  }
  // Crystalline Elder Sign: Seal (+1 or [elder_sign]). +1 to each skill.
  if (code === '04235') {
    registerPlayerCard({
      code,
      ...sealBehavior(code, { one: [1, 'elderSign'] }),
      skillModifier: (_s, a, test) => (test.investigator === a.owner ? 1 : 0),
    })
    return true
  }
  // Seal of the Seventh Sign: Seal ([auto_fail]). Uses (7 charges). Removed from the game with
  // no charges or when it leaves play. Forced - after a [skull], [cultist], [tablet] or
  // [elder_thing] is revealed during any skill test: remove 1 charge.
  if (code === '04311') {
    registerPlayerCard({
      code,
      ...sealBehavior(code, { one: ['autoFail'] }),
      leavesPlay: (_s, a) => [{ type: 'RemoveAssetFromGame', asset: a.id, leavingResolved: true }],
      forced: (s, t, a) => {
        if (t.type === 'afterAssetEntersPlay' && t.asset === a.id)
          return sealOnEnter(code, { one: ['autoFail'] }, s, a)
        if (t.type !== 'afterRevealChaosToken' || !s.skillTest || !SYMBOLS.includes(t.token))
          return []
        return [
          { type: 'RemoveUses', asset: a.id, amount: 1 },
          continuation(code, a.owner, 'charges', { asset: a.id }),
        ]
      },
      effect: (s, _by, step, data) => {
        const a = s.assets[String(data.asset)]
        return step === 'charges' && a && a.uses <= 0
          ? [{ type: 'RemoveAssetFromGame', asset: a.id, leavingResolved: true }]
          : []
      },
    })
    return true
  }
  // Bulwark: limit 1 per investigator. Seal ([elder_sign] or +1), again after you defeat an
  // enemy. [reaction] When an enemy would attack an investigator at your location, exhaust and
  // release a sealed token: cancel that attack; ready another asset you control.
  if (code === '11028') {
    const one: ChaosToken[] = ['elderSign', 1]
    registerPlayerCard({
      code,
      canPlay: (s, by) => limitOnePerInvestigator(code)(s, by) && options(s, one).length > 0,
      forced: (s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? sealOnEnter(code, { one }, s, a)
          : [],
      reactions: (s, t, a) => [
        ...cancelAttack(s, t, a, () => [continuation(code, a.owner, 'ready', { asset: a.id })]),
        ...(t.type === 'enemyDefeated' && t.by === a.owner ? sealAgain(s, a, code, one) : []),
      ],
      effect: (s, by, step, data) => {
        if (step !== 'ready') return []
        const others = Object.values(s.assets).filter(
          (o) => o.owner === by && o.exhausted && o.id !== String(data.asset),
        )
        return ask(
          by,
          others.map((o): Choice => ({
            label: 'choice.sealReadyAsset',
            params: { card: playerCardDef(o.code)?.name ?? o.code },
            target: { type: 'asset', id: o.id },
            then: [{ type: 'ReadyAsset', asset: o.id }],
          })),
        )
      },
    })
    return true
  }
  // Misdirection: limit 1 per investigator. Seal (+1 or 0), again after you discover the last
  // clue at your location. [reaction] When an enemy attacks an investigator at your location,
  // exhaust and release a sealed token: cancel that attack; that investigator may move to a
  // connecting location.
  if (code === '11043') {
    const one: ChaosToken[] = [1, 0]
    registerPlayerCard({
      code,
      canPlay: (s, by) => limitOnePerInvestigator(code)(s, by) && options(s, one).length > 0,
      forced: (s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? sealOnEnter(code, { one }, s, a)
          : [],
      reactions: (s, t, a) => [
        ...cancelAttack(s, t, a, (_e, who) => [continuation(code, who, 'move')]),
        ...(t.type === 'afterDiscoverClues' &&
        t.investigator === a.owner &&
        t.last &&
        t.location === here(s, a.owner)
          ? sealAgain(s, a, code, one)
          : []),
      ],
      effect: (s, by, step) =>
        step === 'move'
          ? ask(by, [...moveChoices(s, by), { label: 'choice.skip', then: [] }], true)
          : [],
    })
    return true
  }
  // Sign of Xelotaph: myriad. Seal ([skull], [cultist], [tablet] or [elder_thing]). Uses (3
  // charges). Forced - when your turn begins: spend 1 charge or discard it. [fast] Discard a
  // copy from your hand: replenish all its charges.
  if (code === '11070') {
    registerPlayerCard({
      code,
      ...sealBehavior(code, { one: SYMBOLS }),
      forced: (s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? sealOnEnter(code, { one: SYMBOLS }, s, a)
          : t.type === 'turnBegins' && t.investigator === a.owner
            ? payOrDiscard(a, s, 'charge')
            : [],
      fastOptions: (s, a) =>
        getInvestigator(s, a.owner).hand.includes(code) && a.uses < 3
          ? [
              {
                key: a.id + ':replenish',
                investigator: a.owner,
                label: 'ability.sealReplenish',
                params: { card: cardName(code) },
                target: { type: 'asset', id: a.id },
                then: [
                  { type: 'DiscardFromHand', investigator: a.owner, card: code },
                  { type: 'AddUses', asset: a.id, amount: 3 - a.uses },
                ],
              },
            ]
          : [],
    })
    return true
  }
  // Blessed Blade (0): [action] if ready: Fight, +1 [combat]; +1 damage if a [bless] or
  // [elder_sign] is revealed. Before revealing, you may exhaust it to add 1 [bless].
  // Blessed Blade (4): [action] Fight, +2 [combat], +1 damage if successful; each [bless]
  // revealed returns to the bag. Before revealing, you may exhaust it to add 2 [bless].
  if (code === '07018' || code === '10034') {
    const high = code === '10034'
    registerPlayerCard({
      code,
      abilities: (s, a, by) => {
        if (!high && a.exhausted) return []
        const basic = fightOptions(
          s,
          a,
          by,
          high ? 2 : 1,
          high
            ? { extraDamage: 1 }
            : { damageIfTokens: { tokens: ['bless', 'elderSign'], amount: 1 } },
        )
        const n = high ? 2 : 1
        const blessed =
          !a.exhausted && poolTokensAvailable(s, 'bless') > 0
            ? basic.map((o): AbilityOption => ({
                ...o,
                key: o.key + ':bless',
                label: 'ability.blessedBladeBless',
                params: { ...o.params, n },
                then: [{ type: 'ExhaustAsset', asset: a.id }, ...add('bless', n), ...o.then],
              }))
            : []
        return [...basic, ...blessed]
      },
      ...(high
        ? {
            forced: (_s: GameState, t: Trigger, a: Asset): Message[] =>
              t.type === 'skillTestEnded' && t.source === a.id
                ? add('bless', (t.tokens ?? []).filter((x) => x === 'bless').length)
                : [],
          }
        : {}),
    })
    return true
  }
  return false
}

/** Return `n` [bless] tokens to the pool from the bag first, then from sealed cards. */
function returnBless(s: GameState, n: number): Message[] {
  const fromBag = Math.min(n, inBag(s, 'bless'))
  let left = n - fromBag
  const sealed: Message[] = []
  for (const e of s.sealed ?? []) {
    if (left <= 0) break
    if (e.token !== 'bless' || !e.holder) continue
    left--
    sealed.push({
      type: 'ReleaseSealedTokens',
      holder: e.holder,
      token: 'bless',
      count: 1,
      toPool: true,
    })
  }
  return [...remove('bless', fromBag), ...sealed]
}
const blessInPlay = (s: GameState) =>
  inBag(s, 'bless') + (s.sealed ?? []).filter((e) => e.token === 'bless' && e.holder).length

function doomChoices(s: GameState): Choice[] {
  const one = (target: Extract<Message, { type: 'RemoveDoom' }>['target']): Message[] => [
    { type: 'RemoveDoom', target, amount: 1 },
  ]
  return [
    ...(s.doom > 0
      ? [{ label: 'choice.sealDoomAgenda', then: one({ type: 'agenda' }) } as Choice]
      : []),
    ...Object.values(s.enemies)
      .filter((e) => (e.doom ?? 0) > 0)
      .map((e): Choice => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: one({ type: 'enemy', id: e.id }),
      })),
    ...Object.values(s.assets)
      .filter((a) => (a.doom ?? 0) > 0)
      .map((a): Choice => ({
        label: 'choice.assignToAsset',
        params: { card: playerCardDef(a.code)?.name ?? a.code },
        target: { type: 'asset', id: a.id },
        then: one({ type: 'asset', id: a.id }),
      })),
    ...s.investigators
      .filter((i) => !i.eliminated && (i.doom ?? 0) > 0)
      .map((i): Choice => ({
        label: 'choice.investigator',
        params: { name: i.name },
        target: { type: 'investigator', id: i.id },
        then: one({ type: 'investigator', id: i.id }),
      })),
  ]
}

function registerEvent(code: string): boolean {
  // Hallow: additional cost, return a total of 10 [bless] to the pool from the bag or sealed
  // on cards in play. Remove 1 doom from any card in play.
  if (code === '07301') {
    registerPlayerCard({
      code,
      canPlay: (s) => blessInPlay(s) >= 10,
      additionalPlayCosts: (s) => returnBless(s, 10),
      play: (s, by) => ask(by, doomChoices(s)),
    })
    return true
  }
  // Tides of Fate: replace every [curse] in the bag with [bless]; at the end of the round,
  // replace every [bless] in the bag with [curse].
  if (code === '07030') {
    const swap = (s: GameState, from: PoolToken, to: PoolToken): Message[] => {
      const n = inBag(s, from)
      return [...remove(from, n), ...add(to, n)]
    }
    registerPlayerCard({
      code,
      playInAnyFastWindow: true,
      play: (s, by) => [
        ...swap(s, 'curse', 'bless'),
        { type: 'AtEndOfRound', then: [continuation(code, by, 'reverse')] },
      ],
      effect: (s, _by, step) => (step === 'reverse' ? swap(s, 'bless', 'curse') : []),
    })
    return true
  }
  // Ríastrad: Fight. When you initiate it, add up to 3 [curse]; +1 [combat] and +1 damage each.
  if (code === '07193') {
    const spec = { action: 'fight' as const }
    registerPlayerCard({
      code,
      fightAction: true,
      noAttacksOfOpportunity: true,
      canPlay: (s, by) => testChoices(spec, { state: s, investigator: by, code }).length > 0,
      play: (s, by) =>
        ask(
          by,
          [0, 1, 2, 3]
            .filter((n) => poolTokensAvailable(s, 'curse') >= n)
            .map((n): Choice => ({
              label: 'choice.addCurse',
              params: { n },
              then: [
                ...add('curse', n),
                ...testChoices(
                  spec,
                  { state: s, investigator: by, code },
                  {
                    modifier: n,
                    extraDamage: n,
                  },
                ),
              ],
            })),
          true,
        ),
    })
    return true
  }
  // Guided by Faith: Investigate, [willpower] may replace [intellect]. Before revealing, add 2
  // [bless]. If a [bless] or [elder_sign] is revealed, discover 1 additional clue.
  if (code === '10025') {
    const test = (ctx: Ctx, skill: 'willpower' | 'intellect') => {
      const at = here(ctx.state, ctx.investigator)!
      return basicTest(
        {
          action: 'investigate',
          skill,
          onSuccess: () => [
            {
              type: 'IfTestResult',
              tokens: ['bless', 'elderSign'],
              then: [
                { type: 'DiscoverClues', investigator: ctx.investigator, amount: 1, location: at },
              ],
            },
          ],
        },
        ctx,
      )
    }
    registerPlayerCard({
      code,
      investigateAction: true,
      canPlay: (s, by) => here(s, by) !== null,
      play: (s, by) => {
        const ctx = { state: s, investigator: by, code }
        return [
          ...add('bless', 2),
          ...ask(
            by,
            (['intellect', 'willpower'] as const).map((skill): Choice => ({
              label: `choice.test.${skill}`,
              params: { difficulty: s.locations[here(s, by)!]?.shroud ?? 0 },
              then: [test(ctx, skill)],
            })),
            true,
          ),
        ]
      },
    })
    return true
  }
  return false
}

export function registerSealedTokens(code: string): void {
  if (registerEvent(code) || registerAsset(code)) return
  throw Error('Unreviewed sealed-token card ' + code)
}
