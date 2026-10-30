import {
  enemyBehavior,
  findEnemy,
  getInvestigator,
  limitTitleReached,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  scenarioBehavior,
  uniqueAssetInPlay,
  type GameState,
  type Message,
  type Asset,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { fast } from '../asset-utilities/register'
const turn = (s: GameState) =>
  s.phase !== 'investigation'
    ? null
    : s.immediateActions?.[0]
      ? s.immediateActions[0].endedTurn
        ? null
        : s.immediateActions[0].activeTurn
      : s.activeTurn
const near = (s: GameState, by: string) => {
  const at = getInvestigator(s, by).location
  return at === null ? [] : s.investigators.filter((i) => !i.eliminated && i.location === at)
}
const assetNear = (s: GameState, by: string, a: Asset) => near(s, by).some((i) => i.id === a.owner)
const heal = (id: string, asset: boolean, damage: number, horror: number): Message =>
  asset
    ? { type: 'HealAsset', asset: id, damage, horror }
    : { type: 'Heal', investigator: id, damage, horror }
const handAssets = (s: GameState, by: string, trait: string) =>
  [...new Set(getInvestigator(s, by).hand)].filter((code) => {
    const d = playerCardDef(code),
      b = playerCardBehavior(code)
    return (
      d?.type === 'asset' &&
      d.traits.includes(trait) &&
      !b?.permanent &&
      !uniqueAssetInPlay(s, code) &&
      !limitTitleReached(s, by, code) &&
      !(
        b?.limitTrait &&
        Object.values(s.assets).some(
          (a) => a.owner === by && playerCardDef(a.code)?.traits.includes(b.limitTrait!),
        )
      )
    )
  })
export function registerMoreWindows(code: string): boolean {
  if (code === '07108') {
    registerPlayerCard({ code, additionalEngageActions: 1 })
    return true
  }
  if (['03266', '10108'].includes(code)) {
    const amount = code === '03266' ? 2 : 1
    registerPlayerCard({
      code,
      ...(code === '10108' ? { discardWhenEmpty: true } : {}),
      abilities: (s, a, by) =>
        !turn(s) || a.uses < 1 || (code === '10108' && a.exhausted)
          ? []
          : [
              {
                ...fast(
                  a,
                  'shroud',
                  'choice.windowShroud',
                  { n: amount },
                  [
                    ...(code === '10108' ? [{ type: 'ExhaustAsset' as const, asset: a.id }] : []),
                    { type: 'SpendUses', asset: a.id, amount: 1 },
                  ],
                  [{ type: 'TurnShroudModifier', investigator: by, amount: -amount }],
                ),
                ...(code === '03266' ? { limit: { per: 'turn' as const } } : {}),
              },
            ],
    })
    return true
  }
  if (['03029', '09066'].includes(code)) {
    const trait = code === '03029' ? 'Item' : 'Ally'
    registerPlayerCard({
      code,
      canPlay: (s, by) => turn(s) === by && handAssets(s, by, trait).length > 0,
      play: (s, by) =>
        ask(
          by,
          handAssets(s, by, trait).map((card) => ({
            label: 'choice.windowPut',
            params: { card: cardName(card) },
            target: { type: 'hand' as const, code: card },
            then: [
              {
                type: 'PutAssetIntoPlay',
                investigator: by,
                code: card,
                fromHand: true,
                onEntered: continuation(code, by, 'capture') as Extract<
                  Message,
                  { type: 'PlayerCardEffect' }
                >,
              },
            ],
          })),
          true,
        ),
      effect: (s, by, step, data) => {
        const asset = String(data.asset)
        if (!s.assets[asset]) return []
        if (step === 'capture')
          return [
            {
              type: 'AtEndOfTurn',
              investigator: by,
              then: [continuation(code, by, 'return', { asset })],
            },
          ]
        return step === 'return' ? [{ type: 'ReturnAssetToHand', asset }] : []
      },
    })
    return true
  }
  if (['10069', '10048'].includes(code)) {
    const draw = code === '10048',
      total = draw ? 5 : 8
    const recipients = (s: GameState, by: string) =>
      near(s, by).filter(
        (i) =>
          !(draw
            ? scenarioBehavior(s.scenarioId)?.cannotDrawCards?.(s, i.id)
            : scenarioBehavior(s.scenarioId)?.cannotGainResources?.(s, i.id)),
      )
    registerPlayerCard({
      code,
      additionalPlayActions: 1,
      canPlay: (s, by) => recipients(s, by).length > 0,
      play: (_s, by) => [continuation(code, by, 'allocate', { remaining: total })],
      effect: (s, by, step, data) => {
        if (step !== 'allocate' || Number(data.remaining) < 1) return []
        const remaining = Number(data.remaining)
        return ask(
          by,
          recipients(s, by).flatMap((i) =>
            Array.from({ length: remaining }, (_, n) => ({
              label: draw ? 'choice.windowDraw' : 'choice.windowResources',
              params: { name: i.name, n: n + 1 },
              then: [
                {
                  type: draw ? ('DrawCards' as const) : ('GainResources' as const),
                  investigator: i.id,
                  amount: n + 1,
                },
                continuation(code, by, 'allocate', { remaining: remaining - n - 1 }),
              ],
            })),
          ),
          true,
        )
      },
    })
    return true
  }
  if (code === '08083') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        if (t.type !== 'afterAssetEntersPlay' || t.asset !== a.id) return []
        const choices = [
          ...near(s, a.owner)
            .filter((i) => i.damage > 0 || i.horror > 0)
            .map((i) => ({
              label: 'choice.windowHeal',
              params: { name: i.name },
              then: [heal(i.id, false, 1, 1)],
            })),
          ...Object.values(s.assets)
            .filter(
              (x) =>
                assetNear(s, a.owner, x) &&
                playerCardDef(x.code)?.traits.includes('Ally') &&
                (x.damage > 0 || x.horror > 0),
            )
            .map((x) => ({
              label: 'choice.windowHeal',
              params: { name: cardName(x.code) },
              target: { type: 'asset' as const, id: x.id },
              then: [heal(x.id, true, 1, 1)],
            })),
        ]
        return choices.length
          ? [
              {
                key: a.id + ':student',
                investigator: a.owner,
                label: 'choice.windowStudent',
                params: { name: cardName(code) },
                then: ask(a.owner, choices, true),
              },
            ]
          : []
      },
    })
    return true
  }
  if (code === '60309') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (t.skill === 'combat' ? 1 : 0),
      abilities: (s, a, by) =>
        a.exhausted || getInvestigator(s, by).resources < 1
          ? []
          : Object.values(s.assets)
              .filter(
                (x) =>
                  assetNear(s, by, x) &&
                  playerCardDef(x.code)?.traits.includes('Item') &&
                  (x.damage > 0 || a.horror > 0),
              )
              .map((x) =>
                fast(
                  a,
                  x.id,
                  'choice.windowLonnie',
                  { card: cardName(x.code) },
                  [
                    { type: 'ExhaustAsset', asset: a.id },
                    { type: 'SpendResources', investigator: by, amount: 1 },
                  ],
                  [heal(x.id, true, 1, 0), heal(a.id, true, 0, 1)],
                  { type: 'asset', id: x.id },
                ),
              ),
    })
    return true
  }
  if (code === '60570') {
    registerPlayerCard({
      code,
      discardWhenEmpty: true,
      abilities: (s, a, by) => {
        if (a.exhausted || a.uses < 1) return []
        const targets = [
          ...(getInvestigator(s, by).damage > 0
            ? [{ id: by, asset: false, name: getInvestigator(s, by).name }]
            : []),
          ...Object.values(s.assets)
            .filter(
              (x) =>
                x.owner === by && x.damage > 0 && playerCardDef(x.code)?.traits.includes('Ally'),
            )
            .map((x) => ({ id: x.id, asset: true, name: cardName(x.code) })),
        ]
        return targets.map((x) =>
          fast(
            a,
            x.id,
            'choice.healDamageOf',
            { name: x.name },
            [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'SpendUses', asset: a.id, amount: 1 },
            ],
            [heal(x.id, x.asset, 1, 0)],
          ),
        )
      },
    })
    return true
  }
  if (code === '60472') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      handReactions: (s, t, by) => {
        if (t.type !== 'whenEnemyAttacks') return []
        const e = findEnemy(s, t.enemy) ?? s.attackSourcesWithoutLocation?.[t.enemy],
          i = getInvestigator(s, t.investigator)
        if (
          !e ||
          e.traits?.includes('Elite') ||
          i.eliminated ||
          !near(s, by).some((x) => x.id === i.id)
        )
          return []
        if (
          (s.canceledAttack === t.enemy || enemyBehavior(e.code)?.attacksCannotBeCanceled) &&
          i.damage === 0
        )
          return []
        return [
          {
            key: 'hand:' + code,
            investigator: by,
            label: 'ability.playCard',
            params: { card: cardName(code) },
            target: { type: 'hand', code },
            then: [
              {
                type: 'PlayCard',
                investigator: by,
                code,
                effect: [{ type: 'CancelEnemyAttack', enemy: t.enemy }, heal(i.id, false, 2, 0)],
              },
            ],
          },
        ]
      },
    })
    return true
  }
  if (code === '07027') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        if (
          t.type !== 'whenEnemyAttacks' ||
          !t.opportunity ||
          t.investigator !== a.owner ||
          a.uses < 1 ||
          s.canceledAttack === t.enemy
        )
          return []
        const e = findEnemy(s, t.enemy) ?? s.attackSourcesWithoutLocation?.[t.enemy]
        if (e && enemyBehavior(e.code)?.attacksCannotBeCanceled) return []
        return [
          {
            key: a.id,
            investigator: a.owner,
            label: 'choice.windowCancelAttack',
            then: [
              { type: 'SpendUses', asset: a.id, amount: 1 },
              { type: 'CancelEnemyAttack', enemy: t.enemy },
            ],
          },
        ]
      },
    })
    return true
  }
  if (code === '03314') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      handReactions: (_s, t, by) =>
        t.type === 'enemyPhaseBegins'
          ? [
              {
                key: 'hand:' + code,
                investigator: by,
                label: 'ability.playCard',
                params: { card: cardName(code) },
                target: { type: 'hand', code },
                then: [
                  {
                    type: 'PlayCard',
                    investigator: by,
                    code,
                    effect: [{ type: 'ProtectFromAttacks', investigator: by, nonElite: true }],
                  },
                ],
              },
            ]
          : [],
    })
    return true
  }
  return false
}
