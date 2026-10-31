// RR: Reactions, Uses, Replenish, Moving Tokens, Limits, Defeat.
import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  stuckInPlay,
  playerCardBehavior,
} from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'
import { fast } from '../asset-utilities/register'
export function registerCounters(code: string): boolean {
  if (code === '04308') {
    registerPlayerCard({
      code,
      maxUses: 3,
      abilities: (_s, a) =>
        a.uses >= 3
          ? []
          : [
              {
                key: a.id + ':click',
                label: 'choice.resourceReact',
                params: { card: cardName(code) },
                actions: 1,
                provokes: false,
                then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
              },
            ],
      forced: (_s, t, a) =>
        t.type === 'turnBegins' && t.investigator === a.owner && a.uses > 0
          ? [
              { type: 'AddUses', asset: a.id, amount: -a.uses },
              { type: 'GainActions', investigator: a.owner, amount: a.uses },
            ]
          : [],
    })
    return true
  }
  if (code === '03024') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'afterMove' &&
        t.investigator === a.owner &&
        !a.exhausted &&
        (s.locations[getInvestigator(s, a.owner).location ?? '']?.clues ?? 0) > 0
          ? [
              {
                key: a.id + ':fieldwork',
                investigator: a.owner,
                label: 'choice.resourceReact',
                params: { card: cardName(code) },
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'NextTestBonus', investigator: a.owner, amount: 2, thisPhase: true },
                ],
              },
            ]
          : [],
    })
    return true
  }
  if (code === '05233') {
    registerPlayerCard({
      code,
      maxUses: 10,
      abilities: (_s, a, by) =>
        a.exhausted
          ? []
          : [
              ...(a.uses < 10
                ? [
                    fast(
                      a,
                      'invest',
                      'choice.resourceReact',
                      { card: cardName(code) },
                      [{ type: 'ExhaustAsset', asset: a.id }],
                      [{ type: 'AddUses', asset: a.id, amount: 1 }],
                    ),
                  ]
                : []),
              ...(a.uses > 0
                ? [
                    {
                      key: a.id + ':cash',
                      label: 'choice.resourceInvest',
                      params: { n: a.uses },
                      actions: 1,
                      provokes: true,
                      costs: [
                        { type: 'ExhaustAsset' as const, asset: a.id },
                        { type: 'DiscardAsset' as const, asset: a.id },
                      ],
                      then: [
                        { type: 'MoveResourcesToPool' as const, investigator: by, amount: a.uses },
                      ],
                    },
                  ]
                : []),
            ].filter((o) => o.actions === 0 || !stuckInPlay(_s, a)),
    })
    return true
  }
  if (code === '06244') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'afterUsesSpent' &&
        t.asset.owner === a.owner &&
        t.amount > 0 &&
        !a.exhausted &&
        !!s.assets[t.asset.id] &&
        ['charge', 'charges'].includes(playerCardDef(t.asset.code)?.uses?.type ?? '') &&
        playerCardDef(t.asset.code)?.traits.includes('Spell')
          ? [
              {
                key: a.id + ':twila',
                investigator: a.owner,
                label: 'choice.resourceReact',
                params: { card: cardName(code) },
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'AddUses', asset: t.asset.id, amount: 1 },
                ],
              },
            ]
          : [],
    })
    return true
  }
  if (code === '07111') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) => {
        if (a.exhausted) return []
        const here = getInvestigator(s, by).location
        return Object.values(s.assets)
          .filter(
            (from) =>
              from.owner === by &&
              from.uses > 0 &&
              ['secret', 'secrets', 'charge', 'charges'].includes(
                playerCardDef(from.code)?.uses?.type ?? '',
              ),
          )
          .flatMap((from) =>
            Object.values(s.assets)
              .filter(
                (to) =>
                  to.id !== from.id &&
                  getInvestigator(s, to.owner).location === here &&
                  playerCardDef(to.code)?.uses?.type.replace(/s$/, '') ===
                    playerCardDef(from.code)?.uses?.type.replace(/s$/, '') &&
                  to.uses < (playerCardBehavior(to.code)?.maxUses ?? Infinity),
              )
              .map((to) =>
                fast(
                  a,
                  from.id + ':' + to.id,
                  'choice.resourceUses',
                  { from: cardName(from.code), to: cardName(to.code) },
                  [{ type: 'ExhaustAsset', asset: a.id }],
                  [{ type: 'TransferUses', from: from.id, to: to.id, amount: 1 }],
                ),
              ),
          )
      },
    })
    return true
  }
  if (code === '06162') {
    registerPlayerCard({
      code,
      reactions: (_s, t, a) =>
        t.type === 'afterSkillTestInitiated' &&
        t.investigator === a.owner &&
        a.uses > 0 &&
        !_s.skillTest?.abilityCounts?.[a.id + ':wager']
          ? [
              {
                key: a.id + ':wager',
                investigator: a.owner,
                label: 'choice.resourceReact',
                params: { card: cardName(code) },
                then: ask(
                  a.owner,
                  Array.from({ length: Math.min(3, a.uses) }, (_, n) => n + 1).map((n) => ({
                    label: 'choice.resourceBet',
                    params: { n, card: cardName(code) },
                    then: [
                      { type: 'SpendUses' as const, asset: a.id, amount: n },
                      {
                        type: 'ModifySkillTest' as const,
                        use: a.id + ':wager',
                        onSuccess: [
                          {
                            type: 'IfTestResult' as const,
                            atLeast: n,
                            then: [
                              { type: 'GainResources' as const, investigator: a.owner, amount: n },
                            ],
                          },
                        ],
                      },
                    ],
                  })),
                  true,
                ),
              },
            ]
          : [],
    })
    return true
  }
  if (code === '01041') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'enemySpawned' &&
        t.location === getInvestigator(s, a.owner).location &&
        !!s.enemies[t.enemy] &&
        !s.enemies[t.enemy]!.traits?.includes('Elite') &&
        !stuckInPlay(s, a)
          ? [
              {
                key: a.id + ':disc',
                investigator: a.owner,
                label: 'choice.resourceReact',
                params: { card: cardName(code) },
                then: [
                  { type: 'DiscardAsset', asset: a.id },
                  { type: 'DiscardEnemy', enemy: t.enemy },
                ],
              },
            ]
          : [],
    })
    return true
  }
  if (code === '05236') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (t.skill === 'intellect' ? 1 : 0),
      beforeOwnerAssignment: ['horror'],
      whenDefeated: (_s, a) =>
        a.horror >= (playerCardDef(code)?.sanity ?? Infinity)
          ? [{ type: 'ExileCard', investigator: a.owner, code, asset: a.id }]
          : null,
    })
    return true
  }
  return false
}
