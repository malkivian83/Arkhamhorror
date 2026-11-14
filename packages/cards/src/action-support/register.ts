// RR: Activate, Evade, Fight, Skill Tests ST.1–ST.8, Uses, Move, Lasting Effects.
import {
  engagedEnemies,
  getInvestigator,
  getLocation,
  playerCardDef,
  playerCardBehavior,
  poolTokensAvailable,
  turnActionTiming,
  shroudOf,
  type AbilityOption,
  type Asset,
  type Choice,
  type GameState,
  type Message,
  type ReactionOption,
  type SkillTest,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  option,
  exhaust,
  spend,
  ask,
  cardName,
  continuation,
} from '../advanced-tests/common'
import { attackable, fightOptions } from '../dunwich-pilot/effects'

const own = (s: GameState, by: string) => Object.values(s.assets).filter((a) => a.owner === by)
const discard = (by: string, card: string): Message => ({
  type: 'DiscardFromHand',
  investigator: by,
  card,
})
const handCosts = (s: GameState, by: string, then: Message[]): Message[] =>
  ask(
    by,
    [
      ...[...new Set(getInvestigator(s, by).hand)]
        .filter((c) => !playerCardDef(c)?.weakness)
        .map((card) => ({
          label: 'choice.discard',
          params: { card: cardName(card) },
          then: [discard(by, card), ...then],
        })),
      { label: 'choice.skip', then: [] },
    ],
    true,
  )
const fast = (a: Asset, then: Message[], suffix = ''): AbilityOption => ({
  ...option(a, then, suffix),
  actions: 0,
  provokes: false,
})
const readyReaction = (a: Asset, then: Message[]): ReactionOption[] =>
  a.exhausted ? [] : [option(a, [exhaust(a), ...then])]
const special = ['11081', '11082', '11084']

/** Same printed action in play or in hand; the latter replaces exhaust with discard. */
function nautical(s: GameState, a: Asset, fromHand: boolean): AbilityOption[] {
  if (!fromHand && a.exhausted) return []
  const by = a.owner,
    here = getInvestigator(s, by).location
  if (!here) return []
  const pay = fromHand ? discard(by, a.code) : exhaust(a)
  const begin = (
    skill: 'combat' | 'agility' | 'intellect',
    difficulty: number,
    kind: SkillTest['kind'],
  ): Message => ({
    type: 'BeginSkillTest',
    investigator: by,
    source: a.id,
    sourceSnapshot: a,
    effectSource: a.code,
    skill,
    difficulty,
    modifier: 1,
    kind,
  })
  const common = {
    actions: 1,
    key: a.id + ':nautical',
    label: 'ability.advancedTest',
    params: { card: cardName(a.code) },
  }
  if (a.code === '11084')
    return [
      {
        ...common,
        actionKind: 'investigate',
        provokes: true,
        then: [pay, begin('intellect', shroudOf(s, here), { type: 'investigate', location: here })],
      },
    ]
  const evade = a.code === '11081'
  return (
    evade
      ? engagedEnemies(s, by).filter((e) => !e.cannotBeEvaded && !e.hasNoStats)
      : attackable(s, by)
  ).map((e) => ({
    ...common,
    key: common.key + ':' + e.id,
    actionKind: evade ? 'evade' : 'fight',
    provokes: false,
    target: { type: 'enemy', id: e.id },
    then: [
      pay,
      begin(
        evade ? 'agility' : 'combat',
        evade ? e.evade : e.fight,
        evade ? { type: 'evade', enemy: e.id } : { type: 'fight', enemy: e.id },
      ),
    ],
  }))
}

function healHorror(s: GameState, by: string, code: string, left: number): Message[] {
  if (!left) return []
  const here = getInvestigator(s, by).location
  const next = continuation(code, by, 'heal', { left: left - 1 })
  const choices: Choice[] = s.investigators
    .filter((i) => !i.eliminated && i.location === here && i.horror > 0)
    .map((i) => ({
      label: 'choice.actionSupportHeal',
      params: { card: i.name },
      target: { type: 'investigator', id: i.id },
      then: [{ type: 'Heal', investigator: i.id, damage: 0, horror: 1, healer: by }, next],
    }))
  choices.push(
    ...Object.values(s.assets)
      .filter(
        (a) =>
          a.horror > 0 &&
          playerCardDef(a.code)?.traits.includes('Ally') &&
          getInvestigator(s, a.owner).location === here,
      )
      .map((a) => ({
        label: 'choice.actionSupportHeal',
        params: { card: cardName(a.code) },
        target: { type: 'asset' as const, id: a.id },
        then: [{ type: 'HealAsset' as const, asset: a.id, damage: 0, horror: 1, healer: by }, next],
      })),
  )
  if (!choices.length) return []
  return ask(by, [...choices, { label: 'choice.skip', then: [] }], true)
}

export function registerActionSupport(code: string): void {
  if (code === '07022') {
    registerPlayerCard({
      code,
      abilities: (s, a) => [
        ...(poolTokensAvailable(s, 'curse') > 0
          ? [
              {
                ...fast(
                  a,
                  [{ type: 'AddChaosTokens', tokens: ['curse'], scenarioOnly: true }],
                  ':curse',
                ),
                actions: 1,
                provokes: true,
              },
            ]
          : []),
        ...(s.chaosBag.filter((t) => t === 'curse').length >= 10
          ? [
              {
                ...fast(
                  a,
                  [
                    { type: 'DiscardAsset' as const, asset: a.id },
                    { type: 'RecordNote' as const, note: 'translatedGrimoire', value: a.owner },
                    {
                      type: 'RemoveChaosTokens' as const,
                      tokens: Array.from({ length: 5 }, () => 'curse' as const),
                    },
                    {
                      type: 'AddChaosTokens' as const,
                      tokens: Array.from({ length: 5 }, () => 'bless' as const),
                      scenarioOnly: true,
                    },
                  ],
                  ':translate',
                ),
                actions: 1,
                provokes: true,
              },
            ]
          : []),
      ],
    })
    return
  }
  if (code === '07273') {
    const options = (s: GameState, a: Asset): AbilityOption[] => {
      const i = getInvestigator(s, a.owner)
      if (
        (!s.encounterDeck.length && !s.encounterDiscard.length) ||
        (!i.damage && !i.horror && !a.uses)
      )
        return []
      return [
        fast(a, [
          { type: 'DrawEncounterCard', investigator: a.owner },
          continuation(code, a.owner, 'afterEncounter', { asset: a.id }),
        ]),
      ]
    }
    registerPlayerCard({
      code,
      abilities: options,
      fastOptions: (s, a) => options(s, a).map((o) => ({ ...o, investigator: a.owner })),
      reactions: (s, t, a) =>
        t.type === 'whenTreacheryDrawn' &&
        t.investigator === a.owner &&
        !!s.treacheries[t.treachery] &&
        !playerCardDef(s.treacheries[t.treachery]?.code ?? '')?.weakness
          ? [
              option(a, [
                {
                  type: 'TakeDamage',
                  investigator: a.owner,
                  damage: 1,
                  horror: 1,
                  damageWindowResolved: true,
                },
                { type: 'CancelRevelation', treachery: t.treachery },
                { type: 'AddUses', asset: a.id, amount: 1 },
                continuation(code, a.owner, 'corruption', { asset: a.id }),
              ]),
            ]
          : [],
      effect: (s, by, step, d) => {
        const a = s.assets[String(d.asset)]
        if (step === 'afterEncounter')
          return ask(
            by,
            [
              {
                label: 'choice.actionSupportRestore',
                then: [{ type: 'Heal', investigator: by, damage: 1, horror: 1, healer: by }],
              },
              ...(a && a.uses > 0
                ? [
                    {
                      label: 'choice.actionSupportCorruption',
                      then: [{ type: 'RemoveUses' as const, asset: a.id, amount: 1 }],
                    },
                  ]
                : []),
            ],
            true,
          )
        return a && a.uses >= 3 ? [{ type: 'RemoveAssetFromGame', asset: a.id }] : []
      },
    })
    return
  }
  if (special.includes(code)) {
    registerPlayerCard({
      code,
      abilities: (s, a) => nautical(s, a, false),
      handAbilities: (s, by) =>
        nautical(
          s,
          { id: 'hand:' + code, code, owner: by, uses: 0, damage: 0, horror: 0, exhausted: false },
          true,
        ),
      beforeResults: (s, t) => {
        if (!t.succeeded) return []
        const by = t.investigator
        if (code === '11081')
          return t.kind.type === 'evade' && !s.enemies[t.kind.enemy]?.traits?.includes('Elite')
            ? handCosts(s, by, [{ type: 'EnemyStaysExhausted', enemy: t.kind.enemy }])
            : []
        return handCosts(s, by, [
          code === '11082'
            ? { type: 'ModifySkillTest', extraDamage: 1 }
            : { type: 'AddInvestigationResults', extraClues: 1 },
        ])
      },
    })
    return
  }
  if (code === '03028' || code === '52005') {
    registerPlayerCard({
      code,
      evadeAction: true,
      fastOptions: (s, a) =>
        code === '52005' && turnActionTiming(s, a.owner) !== null
          ? (playerCardBehavior(code)?.abilities?.(s, a, a.owner) ?? []).map((o) => ({
              ...o,
              investigator: a.owner,
            }))
          : [],
      abilities: (s, a) =>
        a.exhausted
          ? []
          : engagedEnemies(s, a.owner)
              .filter((e) => !e.cannotBeEvaded && !e.hasNoStats)
              .map((e) => ({
                key: a.id + ':evade:' + e.id,
                label: 'ability.advancedTest',
                params: { card: cardName(code) },
                actions: code === '52005' ? 0 : 1,
                actionKind: 'evade',
                provokes: false,
                target: { type: 'enemy', id: e.id },
                then: [
                  exhaust(a),
                  {
                    type: 'BeginSkillTest',
                    investigator: a.owner,
                    source: a.id,
                    skill: 'agility',
                    difficulty: e.evade - 2,
                    kind: {
                      type: 'evade',
                      enemy: e.id,
                      doNotExhaust: true,
                      onSuccess: [
                        {
                          type: 'AddEnemyModifier',
                          enemy: e.id,
                          modifier: { source: code, until: 'turn', cannotEngage: a.owner },
                        },
                      ],
                    },
                  },
                ],
              })),
    })
    return
  }
  if (code === '11052') {
    registerPlayerCard({
      code,
      reactions: (s, trigger, a) =>
        trigger.type === 'afterSkillTestInitiated' &&
        trigger.investigator === a.owner &&
        s.skillTest?.kind.type === 'evade'
          ? readyReaction(a, [
              { type: 'BoostSkillTest', amount: 1 },
              {
                type: 'ModifySkillTest',
                addedEnemyKeywords: ['alert'],
                doNotDisengage: true,
                onSuccess: [{ type: 'DrawCards', investigator: a.owner, amount: 1 }],
              },
            ])
          : [],
    })
    return
  }
  if (code === '04155') {
    registerPlayerCard({
      code,
      afterCommittedTest: (_s, t, success) =>
        success && t.kind.type === 'evade'
          ? [
              {
                type: 'AddEnemyModifier',
                enemy: t.kind.enemy,
                modifier: { source: code, until: 'turn', nextDamage: 1 },
              },
            ]
          : [],
    })
    return
  }
  if (code === '10118') {
    registerPlayerCard({ code, commitFromDiscard: true })
    return
  }
  if (code === '09090') {
    registerPlayerCard({
      code,
      observesCommitCopies: true,
      onCommit: (s, by) =>
        s.skillTest?.source && s.assets[s.skillTest.source]
          ? [continuation(code, by, 'choose', { asset: s.skillTest.source })]
          : [],
      effect: (s, by, step, data) => {
        const a = s.assets[String(data.asset)]
        if (!a) return []
        if (step === 'recover') {
          const initial =
            playerCardBehavior(a.code)?.initialUses?.(s, a.owner) ??
            playerCardDef(a.code)?.uses?.count ??
            0
          const refill = Math.min(Math.floor(initial / 2), Math.max(0, initial - a.uses))
          return ask(
            by,
            [
              ...((a.doom ?? 0) > 0
                ? [
                    {
                      label: 'choice.actionSupportRemoveDoom',
                      then: [
                        {
                          type: 'RemoveDoom' as const,
                          target: { type: 'asset' as const, id: a.id },
                          amount: 1,
                        },
                      ],
                    },
                  ]
                : []),
              ...(refill
                ? [
                    {
                      label: 'choice.actionSupportReplenish',
                      then: [{ type: 'AddUses' as const, asset: a.id, amount: refill }],
                    },
                  ]
                : []),
            ],
            true,
          )
        }
        if (step === 'choose') {
          const copy = s.skillTest?.committed.filter((c) => c.code === code && c.by === by).at(-1)
          return copy?.id === undefined
            ? []
            : ask(
                by,
                [
                  {
                    label: 'choice.actionSupportDoom',
                    then: [
                      { type: 'PlaceDoomOnAsset', asset: a.id, amount: 1 },
                      { type: 'AddCommittedIcon', commitId: copy.id, icon: 'wild' },
                      { type: 'AddCommittedIcon', commitId: copy.id, icon: 'wild' },
                    ],
                  },
                  {
                    label: 'choice.actionSupportReplenishLater',
                    then: [],
                  },
                ],
                true,
              )
        }
        return []
      },
      afterCommittedTest: (_s, t, success, by, copy) =>
        success && t.source && !copy?.returnToHand && !copy?.iconBonus?.wild
          ? [continuation(code, by, 'recover', { asset: t.source })]
          : [],
    })
    return
  }
  if (code === '07309') {
    registerPlayerCard({
      code,
      noUpkeepReady: true,
      reactions: (_s, t, a) =>
        t.type === 'whenWouldFail' && t.investigator === a.owner
          ? readyReaction(a, [{ type: 'BoostSkillTest', amount: 2 }])
          : t.type === 'afterRevealChaosToken' &&
              t.investigator === a.owner &&
              t.token === 'bless' &&
              a.exhausted
            ? [option(a, [{ type: 'ReadyAsset', asset: a.id }])]
            : [],
    })
    return
  }
  if (code === '07304') {
    const options = (s: GameState, a: Asset): AbilityOption[] =>
      a.exhausted
        ? []
        : [
            ...(getInvestigator(s, a.owner).resources > 0
              ? own(s, a.owner)
                  .filter((d) => playerCardDef(d.code)?.uses?.type === 'secret')
                  .map((d) =>
                    fast(
                      a,
                      [
                        exhaust(a),
                        {
                          type: 'MoveResourcesToUses',
                          investigator: a.owner,
                          asset: d.id,
                          amount: 1,
                        },
                      ],
                      ':deposit:' + d.id,
                    ),
                  )
              : []),
            ...own(s, a.owner)
              .filter((d) => d.uses > 0 && playerCardDef(d.code)?.uses?.type === 'secret')
              .map((d) =>
                fast(
                  a,
                  [
                    exhaust(a),
                    { type: 'MoveUsesToResources', asset: d.id, investigator: a.owner, amount: 1 },
                  ],
                  ':withdraw:' + d.id,
                ),
              ),
          ]
    registerPlayerCard({
      code,
      lendsUses: { traits: [], types: ['secret'], atLocation: true },
      abilities: options,
      fastOptions: (s, a) => options(s, a).map((o) => ({ ...o, investigator: a.owner })),
    })
    return
  }
  if (code === '05192') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) => fightOptions(s, a, by, 2),
      beforeResults: (s, t, a) =>
        !t.succeeded || t.kind.type !== 'fight' || (s.assets[a.id]?.uses ?? 0) < 1
          ? []
          : ask(
              a.owner,
              [
                {
                  label: 'choice.actionSupportEmpower',
                  then: [
                    spend(a),
                    {
                      type: 'ModifySkillTest',
                      extraDamage: 1,
                      onDefeat: [
                        { type: 'DrawCards', investigator: a.owner, amount: 1 },
                        {
                          type: 'Heal',
                          investigator: a.owner,
                          damage: 0,
                          horror: 1,
                          healer: a.owner,
                        },
                      ],
                    },
                  ],
                },
                { label: 'choice.skip', then: [] },
              ],
              true,
            ),
    })
    return
  }
  if (code === '08104' || code === '08106') {
    registerPlayerCard({
      code,
      reactions: (s, trigger, a) => {
        const t = s.skillTest
        if (
          trigger.type !== 'afterSkillTest' ||
          !trigger.succeeded ||
          trigger.investigator !== a.owner ||
          t?.kind.type !== 'investigate' ||
          a.exhausted ||
          a.uses < 1
        )
          return []
        const by = a.owner,
          here = getInvestigator(s, by).location
        const items = [...new Set(getInvestigator(s, by).discard)].filter((c) =>
          playerCardDef(c)?.traits.includes('Item'),
        )
        const mayReplace = !!here && t.kind.location === here
        if (code === '08104' && !mayReplace) return []
        const locations =
          mayReplace && here
            ? getLocation(s, here).connections.filter(
                (id) => s.locations[id] && s.locations[id]!.clues > 0,
              )
            : []
        const replace: Message = { type: 'ModifySkillTest', baseClues: 0 }
        const remote = locations.map((id) => ({
          label: 'choice.location',
          params: { location: getLocation(s, id).name },
          target: { type: 'location' as const, id },
          then: [
            replace,
            { type: 'DiscoverClues' as const, investigator: by, location: id, amount: 1 },
          ],
        }))
        const item = items.map((c) => ({
          label: 'choice.card',
          params: { card: cardName(c) },
          then: [
            { type: 'DiscardToHand' as const, investigator: by, code: c },
            ...(code === '08104' ? [replace] : []),
          ],
        }))
        if (code === '08106' && !items.length && !locations.length) return []
        const effects =
          code === '08104'
            ? ask(by, [...item, ...remote], true)
            : [
                ...ask(by, item, true),
                ...ask(by, [...remote, { label: 'choice.skip', then: [] }], true),
              ]
        return effects.length ? [option(a, [exhaust(a), spend(a), ...effects])] : []
      },
    })
    return
  }
  if (code === '04304') {
    registerPlayerCard({
      code,
      discardWhenEmpty: true,
      abilities: (s, a) =>
        a.exhausted ||
        a.uses < 1 ||
        !(s.enemyDefeats ?? []).some(
          (d) => d.round === s.round && d.location === getInvestigator(s, a.owner).location,
        ) ||
        !healHorror(s, a.owner, code, 2).length
          ? []
          : [
              {
                ...fast(a, [
                  exhaust(a),
                  spend(a),
                  continuation(code, a.owner, 'heal', { left: 2 }),
                ]),
                actions: 1,
                provokes: true,
              },
            ],
      effect: (s, by, _step, data) => healHorror(s, by, code, Number(data.left)),
    })
    return
  }
  if (code === '09094') {
    const options = (s: GameState, a: Asset): AbilityOption[] =>
      a.exhausted
        ? []
        : own(s, a.owner)
            .filter((d) => d.id !== a.id && (d.doom ?? 0) > 0)
            .map((d) =>
              fast(
                a,
                [
                  exhaust(a),
                  { type: 'RemoveDoom', target: { type: 'asset', id: d.id }, amount: 1 },
                  { type: 'PlaceDoomOnAsset', asset: a.id, amount: 1 },
                  ...ask(
                    a.owner,
                    [
                      {
                        label: 'choice.actionSupportReady',
                        then: [{ type: 'ReadyAsset', asset: d.id }],
                      },
                      ...(!playerCardDef(d.code)?.uses ||
                      playerCardDef(d.code)?.uses?.type === 'charge'
                        ? [
                            {
                              label: 'choice.actionSupportCharge',
                              then: [{ type: 'AddUses' as const, asset: d.id, amount: 1 }],
                            },
                          ]
                        : []),
                    ],
                    true,
                  ),
                ],
                ':' + d.id,
              ),
            )
    registerPlayerCard({
      code,
      permanent: {},
      fastOptions: (s, a) => options(s, a).map((o) => ({ ...o, investigator: a.owner })),
      abilities: (s, a) => [
        ...options(s, a),
        ...((a.doom ?? 0)
          ? [
              {
                ...fast(
                  a,
                  [
                    {
                      type: 'RemoveDoom' as const,
                      target: { type: 'asset' as const, id: a.id },
                      amount: a.doom!,
                    },
                  ],
                  ':clean',
                ),
                actions: 1,
                provokes: true,
              },
            ]
          : []),
      ],
    })
    return
  }
  if (code === '08087') {
    registerPlayerCard({
      code,
      noAttacksOfOpportunity: true,
      play: (_s, by) => [{ type: 'PrimeFightTokenConversion', investigator: by, code }],
    })
    return
  }
  if (code === '08088') {
    registerPlayerCard({
      code,
      initialUses: (s) => (s.eventResolutions?.length ? 2 : 0),
      abilities: (s, a, by) =>
        a.uses < 1
          ? []
          : fightOptions(s, a, by, 3, { damagePerSuccess: { max: 3 }, failDamagePerPoint: 3 }).map(
              (o) => ({ ...o, then: [spend(a), ...o.then] }),
            ),
    })
    return
  }
  throw Error('Unreviewed action support ' + code)
}
