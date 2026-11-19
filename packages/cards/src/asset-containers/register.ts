// RR: Search, Face Down, Attach To, Commit, Uses, Resolve Effects, Slots, Doom.
import {
  assetSlots,
  assetTraits,
  availableAbilities,
  canCommitFrom,
  getInvestigator,
  fastAbilitiesBlocked,
  playerCardDef,
  skillValueFor,
  scenarioBehavior,
  type Asset,
  type GameState,
  type Message,
  type Choice,
  type ReactionOption,
  type Trigger,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  ask,
  cardName,
  continuation,
  mayParticipate,
  local,
  option,
} from '../advanced-tests/common'
import { registerUpgrade } from '../attached-upgrades/register'

type Data = Record<string, string | number | boolean>
const owned = (s: GameState, by: string) => Object.values(s.assets).filter((a) => a.owner === by)
const children = (s: GameState, a: Asset) =>
  Object.values(s.assets).filter((x) => x.attachedTo === a.id)
const call = (code: string, by: string, step: string, d: Data = {}) =>
  continuation(code, by, step, d) as Extract<Message, { type: 'PlayerCardEffect' }>
const cardChoice = (code: string, then: Message[], target?: Choice['target']): Choice => ({
  label: 'choice.takeCard',
  params: { card: cardName(code) },
  ...(target ? { target } : {}),
  then,
})
const fast = (a: Asset, then: Message[], suffix = ''): ReactionOption => ({
  ...option(a, then, suffix),
  label: 'ability.container',
  params: { card: cardName(a.code) },
})
const store = (
  a: Asset,
  code: string,
  from: 'hand' | 'deck' | 'discard',
  owner = a.owner,
): Message => ({
  type: 'StorePlayerCard',
  asset: a.id,
  investigator: owner,
  code,
  from,
})
const slotFree = (code: string) =>
  code === '04021' || code === '09120'
    ? ('all' as const)
    : code === '06324' || code === '08089'
      ? ('hand' as const)
      : undefined
const traitTarget = (s: GameState, host: Asset, a: Asset) => {
  if (a.id === host.id || a.attachedTo === host.id) return false
  if (host.code === '09092') return (a.doom ?? 0) > 0
  const trait = host.code === '06324' ? 'Tome' : host.code === '08089' ? 'Firearm' : 'Tool'
  return (
    assetTraits(a).includes(trait) &&
    (host.code !== '08089' || assetSlots(a, s).filter((x) => x === 'hand').length === 1)
  )
}
const attachmentChoices = (s: GameState, host: Asset): Choice[] =>
  owned(s, host.owner)
    .filter((a) => traitTarget(s, host, a))
    .flatMap((a) => {
      const attached = children(s, host),
        limit = host.code === '09092' ? 2 : host.code === '09120' ? Infinity : 1
      return [
        ...(attached.length < limit
          ? [
              cardChoice(a.code, [{ type: 'AttachControlledAsset', asset: a.id, host: host.id }], {
                type: 'asset',
                id: a.id,
              }),
            ]
          : []),
        ...attached.map((old) => ({
          label: 'choice.containerSwap',
          params: { card: cardName(a.code), old: cardName(old.code) },
          target: { type: 'asset' as const, id: a.id },
          then: [
            { type: 'AttachControlledAsset' as const, asset: a.id, host: host.id, swap: old.id },
          ],
        })),
      ]
    })
/** Free printed action arrows; all non-action costs and ability restrictions still apply. */
const useAttached = (s: GameState, a: Asset): Choice[] => {
  const child = children(s, a)[0]
  if (!child) return []
  const preview = {
    ...s,
    investigators: s.investigators.map((i) =>
      i.id === a.owner ? { ...i, actionsRemaining: 100 } : i,
    ),
  }
  return availableAbilities(preview, a.owner)
    .filter(
      (o) =>
        o.key.startsWith(child.id + ':') &&
        o.actions > 0 &&
        (a.code !== '08089' ||
          o.actionKind === 'fight' ||
          o.then.some((m) => m.type === 'BeginSkillTest' && m.kind.type === 'fight')),
    )
    .map((o) => ({
      label: o.label,
      ...(o.params ? { params: o.params } : {}),
      ...(o.target ? { target: o.target } : {}),
      then: [
        {
          type: 'UseAbility',
          investigator: a.owner,
          key: o.key,
          actions: 0,
          printedActions: o.actions,
          provokes: false,
          ...(o.limit ? { limit: o.limit } : {}),
          ...(o.actionKind ? { actionKind: o.actionKind } : {}),
          ...(a.code === '09076' ? { baseSkill: 4 } : {}),
          ...(o.costs ? { costs: o.costs } : {}),
          then: o.then,
        },
      ],
    }))
}

export function registerContainer(code: string): void {
  if (code === '04037' || code === '53011') {
    registerPlayerCard({
      code,
      playsStoredCards: true,
      storedLimit: 3,
      discardWhenStoredEmpty: true,
      reactions: (_s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? [
              fast(a, [
                {
                  type: 'BeginDeckSearch',
                  investigator: a.owner,
                  top: code === '53011' ? 12 : 6,
                  then: call(code, a.owner, 'search', { asset: a.id }),
                },
              ]),
            ]
          : [],
      effect: (s, by, step, d) => {
        const a = s.assets[String(d.asset)]
        if (step !== 'search' || !a) return [{ type: 'ShuffleDeck', investigator: by }]
        const cards = JSON.parse(String(d.cards ?? '[]')) as string[]
        if ((a.storedCards?.length ?? 0) >= 3) return [{ type: 'ShuffleDeck', investigator: by }]
        return ask(
          by,
          [
            ...[...new Set(cards)]
              .filter(
                (c) =>
                  !playerCardDef(c)?.weakness &&
                  playerCardDef(c)?.traits.some((t) => t === 'Item' || t === 'Supply'),
              )
              .map((c) =>
                cardChoice(c, [
                  store(a, c, 'deck'),
                  call(code, by, 'search', {
                    asset: a.id,
                    cards: JSON.stringify(cards.filter((_, n) => n !== cards.indexOf(c))),
                  }),
                ]),
              ),
            { label: 'choice.done', then: [{ type: 'ShuffleDeck', investigator: by }] },
          ],
          true,
        )
      },
    })
    return
  }
  if (code === '08067') {
    registerPlayerCard({
      code,
      storedLimit: 5,
      helpsOtherTests: true,
      fastOptions: (s, a) =>
        !a.exhausted &&
        (a.storedCards?.length ?? 0) < 5 &&
        getInvestigator(s, a.owner).deck.length &&
        mayParticipate(s, a.owner)
          ? [
              fast(a, [
                { type: 'ExhaustAsset', asset: a.id },
                call(code, a.owner, 'top', { asset: a.id }),
              ]),
            ]
          : [],
      testOptions: (s, t, a) =>
        !t.usedAbilities?.includes(a.id) &&
        !fastAbilitiesBlocked(s, a.owner) &&
        local(s, t, a.owner)
          ? (a.storedCards ?? []).flatMap((c, index) =>
              canCommitFrom(s, a.owner, c.code, 'hand', true)
                ? [
                    {
                      ...fast(
                        a,
                        [
                          {
                            type: 'MarkTestAbility',
                            key: a.id,
                          },
                          {
                            type: 'CommitCard',
                            investigator: a.owner,
                            code: c.code,
                            byEffect: true,
                            fromStored: { asset: a.id, index },
                            returnAfterSuccess: true,
                          },
                        ],
                        ':' + index,
                      ),
                      label: 'choice.containerCommit',
                      params: { card: cardName(c.code) },
                    },
                  ]
                : [],
            )
          : [],
      effect: (s, by, step, d) => {
        const a = s.assets[String(d.asset)],
          top = getInvestigator(s, by).deck[0]
        return step === 'top' && a && top
          ? [
              { type: 'Log', key: 'choice.divinationSeen', params: { cards: cardName(top) } },
              ...(!playerCardDef(top)?.weakness ? [store(a, top, 'deck')] : []),
            ]
          : []
      },
    })
    return
  }
  if (code === '10121') {
    registerPlayerCard({
      code,
      storedLimit: 3,
      fastOptions: (s, a) =>
        !a.exhausted && (a.storedCards?.length ?? 0) < 3 && mayParticipate(s, a.owner)
          ? [
              fast(
                a,
                ask(
                  a.owner,
                  [...new Set(getInvestigator(s, a.owner).hand)]
                    .filter((c) => !playerCardDef(c)?.weakness)
                    .map((c) =>
                      cardChoice(c, [
                        { type: 'ExhaustAsset', asset: a.id },
                        store(a, c, 'hand'),
                        call(code, a.owner, 'gain', { asset: a.id }),
                      ]),
                    ),
                  true,
                ),
              ),
            ].filter((o) => o.then.length)
          : [],
      whenDefeated: (s, a) =>
        a.storedCards?.length && !scenarioBehavior(s.scenarioId)?.cannotDrawCards?.(s, a.owner)
          ? ask(
              a.owner,
              [
                {
                  label: 'choice.containerDrawAll',
                  then: [
                    { type: 'DrawStoredCards', asset: a.id },
                    { type: 'DiscardAsset', asset: a.id },
                  ],
                },
                { label: 'choice.skip', then: [{ type: 'DiscardAsset', asset: a.id }] },
              ],
              true,
            )
          : null,
      effect: (s, by, step, d) => {
        const a = s.assets[String(d.asset)]
        return step === 'gain' && a
          ? [{ type: 'GainResources', investigator: by, amount: a.storedCards?.length ?? 0 }]
          : []
      },
    })
    return
  }
  if (code === '11059') {
    registerPlayerCard({
      code,
      storedLimit: 1,
      observesAssetDiscards: true,
      reactions: (s, t, a) =>
        t.type === 'afterAssetDiscarded' &&
        t.asset.owner === a.owner &&
        !a.exhausted &&
        !a.storedCards?.length &&
        assetTraits(t.asset).includes('Illicit') &&
        getInvestigator(s, t.asset.originalOwner ?? a.owner).discard.includes(t.asset.code)
          ? [
              fast(a, [
                { type: 'ExhaustAsset', asset: a.id },
                store(a, t.asset.code, 'discard', t.asset.originalOwner ?? a.owner),
              ]),
            ]
          : [],
      abilities: (s, a) =>
        a.storedCards?.length &&
        getInvestigator(s, a.owner).resources >= 2 &&
        !scenarioBehavior(s.scenarioId)?.cannotDrawCards?.(s, a.owner)
          ? [
              {
                key: a.id + ':draw',
                label: 'ability.container',
                params: { card: cardName(code) },
                actions: 1,
                provokes: true,
                costs: [{ type: 'SpendResources', investigator: a.owner, amount: 2 }],
                then: [
                  {
                    type: 'TakeStoredCard',
                    asset: a.id,
                    index: 0,
                    investigator: a.owner,
                    draw: true,
                  },
                ],
              },
            ]
          : [],
    })
    return
  }
  if (code === '04021' || code === '09076') {
    registerPlayerCard({
      code,
      attachmentLimit: 1,
      ...(code === '04021' ? { attachmentSlots: 'all' as const } : {}),
      reactions: (s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? [
              fast(
                a,
                code === '04021'
                  ? [
                      {
                        type: 'BeginDeckSearch',
                        investigator: a.owner,
                        top: 9,
                        then: call(code, a.owner, 'search', { asset: a.id }),
                      },
                    ]
                  : ask(
                      a.owner,
                      [
                        ...[...new Set(getInvestigator(s, a.owner).hand)]
                          .filter(
                            (c) =>
                              playerCardDef(c)?.type === 'asset' &&
                              playerCardDef(c)?.traits.includes('Illicit'),
                          )
                          .map((c) =>
                            cardChoice(c, [
                              {
                                type: 'PutAssetIntoPlay',
                                investigator: a.owner,
                                code: c,
                                fromHand: true,
                                attachedTo: a.id,
                              },
                            ]),
                          ),
                        { label: 'choice.skip', then: [] },
                      ],
                      true,
                    ),
              ),
            ]
          : [],
      ...(code === '09076'
        ? {
            fastOptions: (s: GameState, a: Asset) =>
              !a.exhausted &&
              getInvestigator(s, a.owner).resources >= 1 &&
              mayParticipate(s, a.owner) &&
              useAttached(s, a).length
                ? [
                    fast(a, [
                      { type: 'ExhaustAsset', asset: a.id },
                      { type: 'SpendResources', investigator: a.owner, amount: 1 },
                      call(code, a.owner, 'use', { asset: a.id }),
                    ]),
                  ]
                : [],
          }
        : {}),
      effect: (s, by, step, d) => {
        const a = s.assets[String(d.asset)]
        if (!a) return step === 'search' ? [{ type: 'ShuffleDeck', investigator: by }] : []
        if (step === 'use') return ask(by, useAttached(s, a), true)
        if (step !== 'search') return []
        const cards = JSON.parse(String(d.cards ?? '[]')) as string[]
        return ask(
          by,
          [
            ...[...new Set(cards)]
              .filter(
                (c) =>
                  playerCardDef(c)?.type === 'asset' && playerCardDef(c)?.traits.includes('Relic'),
              )
              .map((c) =>
                cardChoice(c, [
                  { type: 'TakeFromDeck', investigator: by, code: c, to: 'put', attachedTo: a.id },
                  { type: 'ShuffleDeck', investigator: by },
                ]),
              ),
            { label: 'choice.skip', then: [{ type: 'ShuffleDeck', investigator: by }] },
          ],
          true,
        )
      },
    })
    return
  }
  if (['06324', '08089', '09120', '09092'].includes(code)) {
    registerPlayerCard({
      code,
      ...(slotFree(code) ? { attachmentSlots: slotFree(code)! } : {}),
      ...(code === '09120'
        ? { blanksAttachedAsset: true }
        : { attachmentLimit: code === '09092' ? 2 : 1 }),
      ...(code === '09092'
        ? {
            attachedDoomDiscount: 1,
            skillModifier: (s: GameState, a: Asset, t: { source?: string }) =>
              t.source && s.assets[t.source]?.attachedTo === a.id ? 1 : 0,
          }
        : {}),
      ...(code === '06324'
        ? {
            observesActionAbilities: true,
            reactions: (s: GameState, t: Trigger, a: Asset) =>
              t.type === 'afterActionAbility' &&
              t.asset &&
              s.assets[t.asset]?.attachedTo === a.id &&
              !a.exhausted &&
              t.effects?.length
                ? [
                    fast(a, [
                      { type: 'ExhaustAsset', asset: a.id },
                      { type: 'BeginAssetAbility', asset: t.asset },
                      ...t.effects,
                      { type: 'EndAssetAbility', asset: t.asset },
                    ]),
                  ]
                : [],
          }
        : {}),
      fastOptions: (s, a) =>
        mayParticipate(s, a.owner)
          ? [
              ...((code !== '09120' && code !== '09092') || !a.exhausted
                ? attachmentChoices(s, a).map((c) => ({
                    ...fast(
                      a,
                      [
                        ...(['09120', '09092'].includes(code)
                          ? [{ type: 'ExhaustAsset' as const, asset: a.id }]
                          : []),
                        ...c.then,
                      ],
                      ':' + JSON.stringify(c.then),
                    ),
                    label: c.label,
                    ...(c.params ? { params: c.params } : {}),
                    ...(c.target ? { target: c.target } : {}),
                  }))
                : []),
              ...(code === '09120' && !a.exhausted
                ? children(s, a).map((c) => ({
                    ...fast(
                      a,
                      [
                        { type: 'ExhaustAsset', asset: a.id },
                        { type: 'DetachControlledAsset', asset: c.id },
                      ],
                      ':detach:' + c.id,
                    ),
                    label: 'choice.containerDetach',
                    params: { card: cardName(c.code) },
                    target: { type: 'asset' as const, id: c.id },
                  }))
                : []),
              ...(code === '08089' && !a.exhausted && useAttached(s, a).length
                ? [
                    fast(
                      a,
                      [
                        { type: 'ExhaustAsset', asset: a.id },
                        call(code, a.owner, 'use', { asset: a.id }),
                      ],
                      ':use',
                    ),
                  ]
                : []),
            ]
          : [],
      effect: (s, by, step, d) => {
        const a = s.assets[String(d.asset)]
        return step === 'use' && a ? ask(by, useAttached(s, a), true) : []
      },
    })
    return
  }
  if (code === '08074') {
    registerUpgrade(code, 'Item', {
      atLocation: true,
      anyTiming: true,
      behavior: {
        attachedTestOptions: (s, a, index, t) => {
          const u = a.upgrades?.[index]
          return u &&
            (u.uses ?? 0) > 0 &&
            t.source === a.id &&
            mayParticipate(s, a.owner) &&
            !fastAbilitiesBlocked(s, a.owner) &&
            a.owner === t.investigator
            ? [
                {
                  key: a.id + ':jury:' + index,
                  investigator: a.owner,
                  label: 'ability.container',
                  params: { card: cardName(code) },
                  target: { type: 'asset', id: a.id },
                  then: [
                    { type: 'SpendUpgradeUses', asset: a.id, index, amount: 1 },
                    { type: 'BoostSkillTest', amount: 2 },
                  ],
                },
              ]
            : []
        },
      },
    })
    return
  }
  if (code === '07261') {
    registerUpgrade(code, 'Weapon', {
      atLocation: true,
      anyTiming: true,
      limitPerAsset: true,
      behavior: {
        attachedExtraSlots: ['arcane'],
        attachedTraits: ['Relic'],
        attachedReactions: (s, t, a, index) => {
          const u = a.upgrades?.[index],
            test = s.skillTest
          return u &&
            !u.exhausted &&
            test?.kind.type === 'fight' &&
            test.source === a.id &&
            t.type === 'afterSkillTestInitiated' &&
            t.investigator === a.owner &&
            mayParticipate(s, a.owner)
            ? [
                {
                  key: a.id + ':enchant:' + index,
                  investigator: a.owner,
                  label: 'ability.container',
                  params: { card: cardName(code) },
                  target: { type: 'asset', id: a.id },
                  then: [
                    { type: 'ExhaustUpgrade', asset: a.id, index },
                    ...(test.skill === 'combat'
                      ? [
                          {
                            type: 'BoostSkillTest' as const,
                            amount: skillValueFor(
                              s,
                              u.owner,
                              'willpower',
                              u.owner === a.owner
                                ? test.kind
                                : {
                                    type: 'effect',
                                    source: code,
                                    onSuccess: [],
                                    onFail: [],
                                    onFailEach: [],
                                  },
                            ),
                          },
                        ]
                      : []),
                    { type: 'AdjustAttackDamage', amount: 1 },
                  ],
                },
              ]
            : []
        },
      },
    })
    return
  }
  throw Error('Unreviewed container card ' + code)
}
