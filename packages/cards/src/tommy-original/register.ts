// RR: Defeat, When/After, Moving Damage/Horror, Ownership and Control, Replacement Effects, Fast, Myriad.
import {
  assetBehavior,
  assetVitals,
  effectiveVitals,
  getInvestigator,
  registerInvestigator,
  registerTreachery,
  type Asset,
  type GameState,
  type Message,
  type DamageHolder,
} from '@lcg/engine'
import {
  ask,
  cardName,
  continuation,
  mayParticipate,
  registerAdvancedCard as registerPlayerCard,
} from '../advanced-tests/common'
import { fightOptions } from '../dunwich-pilot/effects'
const own = (s: GameState, by: string) => Object.values(s.assets).filter((a) => a.owner === by)
const canReceive = (s: GameState, a: Asset, kind: 'damage' | 'horror') => {
  const n = assetVitals(a, s)[kind === 'damage' ? 'health' : 'sanity']
  return n !== undefined && a[kind] < n
}
const moveOptions = (
  s: GameState,
  by: string,
  asset: string,
  reverse: boolean,
  left: number,
): Message[] => {
  const a = s.assets[asset],
    i = getInvestigator(s, by)
  if (!a || a.owner !== by || i.eliminated || !left) return []
  const v = effectiveVitals(s, i),
    source = reverse ? a : i
  return ask(
    by,
    [
      ...(['damage', 'horror'] as const)
        .filter(
          (kind) =>
            source[kind] > 0 &&
            (reverse
              ? i[kind] < v[kind === 'damage' ? 'health' : 'sanity']
              : canReceive(s, a, kind)),
        )
        .map((kind) => ({
          label: 'choice.tommyMove',
          params: { kind, card: cardName(a.code) },
          then: [
            {
              type: 'MoveDamage' as const,
              from: {
                type: reverse ? ('asset' as const) : ('investigator' as const),
                id: reverse ? a.id : by,
              },
              to: {
                type: reverse ? ('investigator' as const) : ('asset' as const),
                id: reverse ? by : a.id,
              },
              kind,
            },
            continuation('06001', by, 'move', { asset, reverse, left: left - 1 }),
          ],
        })),
      { label: 'choice.skip', then: [] },
    ],
    true,
  )
}
const holderChoices = (s: GameState, by: string, kind: 'damage' | 'horror', target = false) =>
  [
    {
      holder: { type: 'investigator' as const, id: by },
      name: getInvestigator(s, by).name,
      value: getInvestigator(s, by)[kind],
      allowed:
        !target ||
        getInvestigator(s, by)[kind] <
          effectiveVitals(s, getInvestigator(s, by))[kind === 'damage' ? 'health' : 'sanity'],
    },
    ...own(s, by).map((a) => ({
      holder: { type: 'asset' as const, id: a.id },
      name: cardName(a.code),
      value: a[kind],
      allowed: !target || canReceive(s, a, kind),
    })),
  ].filter((x) => (target ? x.allowed : x.value > 0))
export function registerTommyOriginalCard(code: string): void {
  if (code === '06001') {
    registerInvestigator({
      code,
      observesAssetDefeat: true,
      reactions: (s, t, i) =>
        t.type === 'whenAssetDefeated' && t.asset.owner === i.id && mayParticipate(s, i.id)
          ? [
              {
                key: '06001:recover:' + t.asset.id,
                investigator: i.id,
                label: 'ability.tommyRecover',
                params: { card: cardName(t.asset.code), n: t.asset.damage + t.asset.horror },
                then: [
                  continuation(code, i.id, 'reward', {
                    asset: t.asset.id,
                    amount: t.asset.damage + t.asset.horror,
                  }),
                ],
              },
            ]
          : [],
      elderSign: (_s, i) => ({ modifier: 2, immediate: [continuation(code, i.id, 'elder')] }),
    })
    registerPlayerCard({
      code,
      effect: (s, by, step, d) => {
        if (step === 'reward') {
          const a = s.assets[String(d.asset)],
            amount = Number(d.amount)
          if (!a || a.owner !== by) return []
          const beckys = own(s, by).filter(
            (a) => a.code === '06006' && assetBehavior(s, a)?.abilities,
          )
          if (!beckys.length)
            return [
              { type: 'GainResources', investigator: by, amount },
              { type: 'ShuffleAssetIntoDeck', asset: a.id },
            ]
          return ask(
            by,
            beckys.flatMap((b) =>
              Array.from({ length: amount + 1 }, (_, ammo) => ({
                label: 'choice.tommyAmmo',
                params: { n: ammo, resources: amount - ammo },
                then: [
                  ...(ammo ? [{ type: 'AddUses' as const, asset: b.id, amount: ammo }] : []),
                  ...(amount > ammo
                    ? [{ type: 'GainResources' as const, investigator: by, amount: amount - ammo }]
                    : []),
                  { type: 'ShuffleAssetIntoDeck' as const, asset: a.id },
                ],
              })),
            ),
            true,
          )
        }
        if (step === 'elder')
          return ask(
            by,
            [
              ...own(s, by).flatMap((a) =>
                [false, true]
                  .filter((reverse) => {
                    const i = getInvestigator(s, by)
                    return (['damage', 'horror'] as const).some(
                      (kind) =>
                        (reverse ? a : i)[kind] > 0 &&
                        (reverse
                          ? i[kind] < effectiveVitals(s, i)[kind === 'damage' ? 'health' : 'sanity']
                          : canReceive(s, a, kind)),
                    )
                  })
                  .map((reverse) => ({
                    label: reverse ? 'choice.tommyFromAsset' : 'choice.tommyToAsset',
                    params: { card: cardName(a.code) },
                    then: [continuation(code, by, 'move', { asset: a.id, reverse, left: 2 })],
                  })),
              ),
              { label: 'choice.skip', then: [] },
            ],
            true,
          )
        if (step === 'move')
          return moveOptions(s, by, String(d.asset), Boolean(d.reverse), Number(d.left))
        return []
      },
    })
    return
  }
  if (code === '06006') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        a.uses > 0
          ? fightOptions(s, a, by, 2, { extraDamage: 1 }).map((o) => ({
              ...o,
              costs: [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }],
            }))
          : [],
    })
    return
  }
  if (code === '06007') {
    registerPlayerCard({
      code,
      effect: (s, by, _step, d) => {
        const t = s.treacheries[String(d.treachery)]
        return t && !t.abilityState?.discarded
          ? [{ type: 'ShuffleTreacheryIntoDeck', treachery: t.id, investigator: by }]
          : []
      },
    })
    registerTreachery({
      code,
      revelation: (s, by, t) => [
        { type: 'SetTreacheryAbilityState', treachery: t.id, values: { discarded: false } },
        ...own(s, by)
          .filter((a) => a.damage > 0 || a.horror > 0)
          .map((a) => ({
            type: 'DiscardAsset' as const,
            asset: a.id,
            onDiscard: [
              {
                type: 'SetTreacheryAbilityState' as const,
                treachery: t.id,
                values: { discarded: true },
              },
            ],
          })),
        continuation(code, by, 'check', { treachery: t.id }),
      ],
    })
    return
  }
  if (code === '06020') {
    registerPlayerCard({
      code,
      playInAnyFastWindow: true,
      canPlay: (s, by) =>
        s.investigators.some(
          (i) =>
            !i.eliminated &&
            i.id !== by &&
            i.location !== null &&
            i.location === getInvestigator(s, by).location,
        ),
      playAsset: (s, by, entry) =>
        ask(
          by,
          s.investigators
            .filter(
              (i) =>
                !i.eliminated &&
                i.id !== by &&
                i.location !== null &&
                i.location === getInvestigator(s, by).location,
            )
            .map((i) => ({
              label: 'choice.solemnController',
              params: { name: i.name },
              then: [
                {
                  ...entry,
                  playedBy: by,
                  investigator: i.id,
                  originalOwner: entry.originalOwner ?? by,
                },
              ],
            })),
          true,
        ),
      abilities: (s, a, by) => {
        const owner = a.originalOwner ?? a.owner,
          i = getInvestigator(s, owner),
          controller = getInvestigator(s, by)
        if (
          a.exhausted ||
          by !== a.owner ||
          i.eliminated ||
          controller.location === null ||
          controller.location !== i.location
        )
          return []
        return (['damage', 'horror'] as const).flatMap((kind) =>
          holderChoices(s, by, kind).flatMap((from) =>
            holderChoices(s, owner, kind, true)
              .filter(
                (to) => to.holder.type !== from.holder.type || to.holder.id !== from.holder.id,
              )
              .map((to) => ({
                key: a.id + ':vow',
                label: 'ability.solemnMove',
                params: { from: from.name, to: to.name, kind },
                actions: 0,
                provokes: false,
                then: [
                  { type: 'ExhaustAsset' as const, asset: a.id },
                  {
                    type: 'MoveDamage' as const,
                    from: from.holder as DamageHolder,
                    to: to.holder as DamageHolder,
                    kind,
                  },
                ],
              })),
          ),
        )
      },
    })
    return
  }
  throw Error('Unreviewed original Tommy card ' + code)
}
