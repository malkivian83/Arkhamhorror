import {
  getInvestigator,
  playerCardDef,
  playerCardBehavior,
  registerPlayerCard,
  shroudOf,
  type Message,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { fast } from '../asset-utilities/register'
import { atLocation } from '../dunwich-pilot/helpers'
export function registerSupport(code: string): boolean {
  if (code === '03112') {
    registerPlayerCard({
      code,
      skillModifier: (_s, a, t) => (t.skill === 'willpower' && (a.doom ?? 0) > 0 ? 1 : 0),
      abilities: (s, a, by) =>
        a.exhausted
          ? []
          : [
              fast(
                a,
                'income',
                'choice.toolRenfield',
                { n: a.doom ?? 0 },
                [{ type: 'ExhaustAsset', asset: a.id }],
                ask(
                  by,
                  [0, 1].map((n) => ({
                    label: 'choice.toolDoom',
                    params: { n },
                    then: [
                      ...(n
                        ? [
                            {
                              type: 'PlaceDoomOnAsset' as const,
                              asset: a.id,
                              amount: 1,
                              checkAgenda: false,
                            },
                          ]
                        : []),
                      continuation(code, by, 'income', {
                        asset: a.id,
                        doom: (a.doom ?? 0) + (s.doomBecomesDamage ? 0 : n),
                      }),
                    ],
                  })),
                  true,
                ),
              ),
            ],
      effect: (s, by, step, data) =>
        step === 'income'
          ? [
              {
                type: 'GainResources',
                investigator: by,
                amount: s.assets[String(data.asset)]?.doom ?? Number(data.doom),
              },
            ]
          : [],
    })
    return true
  }
  if (code === '08075') {
    registerPlayerCard({
      code,
      fastOptions: (s, a) =>
        s.skillTest?.investigator === a.owner &&
        s.skillTest.succeeded === null &&
        a.uses > 0 &&
        !s.skillTest.abilityCounts?.[a.id + ':bangle']
          ? [
              {
                key: a.id + ':bangle',
                investigator: a.owner,
                label: 'choice.windowBonus',
                params: { n: 2 },
                then: [
                  { type: 'SpendUses', asset: a.id, amount: 1 },
                  { type: 'BoostSkillTest', amount: 2 },
                  { type: 'ModifySkillTest', use: a.id + ':bangle' },
                ],
              },
            ]
          : [],
      reactions: (_s, t, a) =>
        t.type === 'afterEnemyAttack' && t.investigator === a.owner
          ? [
              {
                key: a.id + ':charge',
                investigator: a.owner,
                label: 'choice.toolCharge',
                params: { card: cardName(code) },
                then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
              },
            ]
          : [],
    })
    return true
  }
  if (code === '04274') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        a.exhausted || a.uses < 1
          ? []
          : atLocation(s, by).flatMap((i) =>
              (['damage', 'horror'] as const)
                .filter((k) => i[k] > 0)
                .map((k) => ({
                  key: a.id + ':' + i.id + ':' + k,
                  label: k === 'damage' ? 'choice.healDamageOf' : 'choice.healHorrorOf',
                  params: { name: i.name },
                  target: { type: 'investigator' as const, id: i.id },
                  actions: 1,
                  provokes: true,
                  costs: [
                    { type: 'SpendUses' as const, asset: a.id, amount: 1 },
                    { type: 'ExhaustAsset' as const, asset: a.id },
                  ],
                  then: [
                    {
                      type: 'Heal' as const,
                      investigator: i.id,
                      damage:
                        k === 'damage'
                          ? (s.campaignLog?.investigators[i.id]?.physicalTrauma ?? 0) >= 2
                            ? 2
                            : 1
                          : 0,
                      horror:
                        k === 'horror'
                          ? (s.campaignLog?.investigators[i.id]?.mentalTrauma ?? 0) >= 2
                            ? 2
                            : 1
                          : 0,
                    },
                  ],
                })),
            ),
    })
    return true
  }
  if (code === '05159') {
    registerPlayerCard({
      code,
      reactions: (_s, t, a) =>
        t.type === 'afterSkillTestInitiated' && t.investigator === a.owner && !a.exhausted
          ? [
              {
                key: a.id,
                investigator: a.owner,
                label: 'choice.toolThin',
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'ReduceSkillTestDifficulty', amount: -2 },
                  ...ask(
                    a.owner,
                    [
                      {
                        label: 'choice.gainResources',
                        params: { n: 2 },
                        then: [{ type: 'GainResources', investigator: a.owner, amount: 2 }],
                      },
                      {
                        label: 'choice.drawCards',
                        params: { n: 1 },
                        then: [{ type: 'DrawCards', investigator: a.owner, amount: 1 }],
                      },
                    ],
                    true,
                  ),
                ],
              },
            ]
          : [],
    })
    return true
  }
  if (code === '08086') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (['intellect', 'combat'].includes(t.skill) ? 1 : 0),
      reactions: (s, t, a) => {
        if (
          t.type === 'afterSkillTest' &&
          t.investigator === a.owner &&
          t.kind === 'investigate' &&
          t.succeeded &&
          a.uses < 3
        )
          return [
            {
              key: a.id + ':evidence',
              investigator: a.owner,
              label: 'choice.toolEvidence',
              params: { card: cardName(code) },
              then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
            },
          ]
        if (
          t.type === 'afterSkillTestInitiated' &&
          t.investigator === a.owner &&
          s.skillTest?.kind.type === 'fight' &&
          !a.exhausted &&
          a.uses > 0
        )
          return [
            {
              key: a.id + ':damage',
              investigator: a.owner,
              label: 'choice.toolAttackDamage',
              params: { card: cardName(code) },
              then: [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'SpendUses', asset: a.id, amount: 1 },
                { type: 'ModifySkillTest', extraDamage: 1 },
              ],
            },
          ]
        return []
      },
    })
    return true
  }
  if (code === '10041') {
    registerPlayerCard({
      code,
      restrictedSlots: [{ slot: 'hand', count: 1, trait: 'Tool' }],
      reactions: (s, t, a) => {
        if (
          t.type !== 'afterSkillTest' ||
          t.investigator !== a.owner ||
          t.kind !== 'investigate' ||
          !t.succeeded ||
          ![1, 3].includes(t.margin) ||
          a.exhausted
        )
          return []
        const options = Object.values(s.enemies)
          .filter((e) => e.location === getInvestigator(s, a.owner).location)
          .map((e) => ({
            label: 'choice.toolDamage',
            params: { enemy: e.name, n: 1 },
            target: { type: 'enemy' as const, id: e.id },
            then: [
              { type: 'ExhaustAsset' as const, asset: a.id },
              { type: 'DamageEnemy' as const, enemy: e.id, by: a.owner, amount: 1 },
            ],
          }))
        return options.length
          ? [
              {
                key: a.id,
                investigator: a.owner,
                label: 'choice.toolAttackDamage',
                params: { card: cardName(code) },
                then: ask(a.owner, options, true),
              },
            ]
          : []
      },
    })
    return true
  }
  if (code === '08032') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (t.skill === 'intellect' ? 1 : 0),
      reactions: (_s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? [
              {
                key: a.id,
                investigator: a.owner,
                label: 'choice.toolKirby',
                then: ask(
                  a.owner,
                  [0, 1].map((n) => ({
                    label: n ? 'choice.toolOdd' : 'choice.toolEven',
                    then: [continuation(code, a.owner, 'reveal', { parity: n })],
                  })),
                  true,
                ),
              },
            ]
          : [],
      effect: (s, by, step, data) =>
        step === 'reveal'
          ? [
              {
                type: 'Story',
                entry: {
                  title: 'choice.toolKirby',
                  body: 'choice.toolRevealBody',
                  effects: getInvestigator(s, by)
                    .deck.slice(0, 5)
                    .map((c) => ({ key: 'choice.toolRevealed', params: { card: cardName(c) } })),
                },
                choices: [
                  {
                    label: 'choice.continue',
                    then: [
                      ...getInvestigator(s, by)
                        .deck.slice(0, 5)
                        .filter((c) => {
                          const d = playerCardDef(c),
                            cost = d?.cost ?? (playerCardBehavior(c)?.costX ? 0 : undefined)
                          return (
                            typeof cost === 'number' &&
                            cost >= 0 &&
                            cost % 2 === Number(data.parity)
                          )
                        })
                        .map((c): Message => ({
                          type: 'TakeFromDeck',
                          investigator: by,
                          code: c,
                          to: 'hand',
                          drawFound: true,
                        })),
                      { type: 'ShuffleDeck', investigator: by },
                    ],
                  },
                ],
              },
            ]
          : [],
    })
    return true
  }
  if (code === '11037') {
    registerPlayerCard({
      code,
      usesAsResources: (_s, a, payer, c) =>
        payer === a.owner && !!playerCardDef(c)?.traits.includes('Spell'),
      reactions: (_s, t, a) =>
        t.type === 'afterDiscoverClues' &&
        t.investigator === a.owner &&
        (t.amount ?? 1) > 0 &&
        !a.exhausted
          ? [
              {
                key: a.id,
                investigator: a.owner,
                label: 'choice.toolResourceOn',
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
  if (code === '11033') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (t.skill === 'agility' ? 1 : 0),
      reactions: (_s, t, a) =>
        t.type === 'afterSkillTest' && t.investigator === a.owner && t.succeeded && t.margin === 3
          ? [
              {
                key: a.id,
                investigator: a.owner,
                label: 'choice.toolEvidence',
                params: { card: cardName(code) },
                then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
              },
            ]
          : [],
      abilities: (s, a, by) => {
        const here = getInvestigator(s, by).location
        if (a.exhausted || here === null || !s.locations[here]!.clues || a.uses < shroudOf(s, here))
          return []
        return [
          fast(
            a,
            'clue',
            'choice.discoverClues',
            { n: 1 },
            [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'SpendUses', asset: a.id, amount: shroudOf(s, here) },
            ],
            [{ type: 'DiscoverClues', investigator: by, amount: 1 }],
          ),
        ]
      },
    })
    return true
  }
  return false
}
