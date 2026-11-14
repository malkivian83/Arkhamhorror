// RR: Bonded, Revealing/Resolving Chaos Tokens, Replenish, Lasting Effects, Costs.
import {
  canPlayByEffect,
  actionKinds,
  attackBlocked,
  enemyHasKeyword,
  fightEnemies,
  enemiesAt,
  getInvestigator,
  getLocation,
  immuneToPlayerCards,
  playerCardBehavior,
  playerCardDef,
  playableHand,
  poolTokensAvailable,
  turnActionTiming,
  type Asset,
  type ChaosToken,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { boost } from '../asset-utilities/register'
import {
  ask,
  cardName,
  continuation,
  exhaust,
  fast,
  here,
  option,
  registerPlayerCard,
  spend,
} from './common'

const skills: SkillType[] = ['willpower', 'intellect', 'combat', 'agility']
const local = (s: GameState, by: string, other: string) =>
  !!here(s, by) && here(s, by) === here(s, other)
const count = (tokens: ChaosToken[] | undefined, face: ChaosToken) =>
  tokens?.filter((t) => t === face).length ?? 0
const nearby = (s: GameState, by: string) =>
  here(s, by)
    ? [here(s, by)!, ...getLocation(s, here(s, by)!).connections].filter((id) => !!s.locations[id])
    : []
const fighters = (s: GameState, by: string, code: string) =>
  fightEnemies(s, by).filter(
    (e) =>
      !attackBlocked(s, by, e, code) && (e.engagedWith !== null || !enemyHasKeyword(s, e, 'aloof')),
  )
const playZones = (s: GameState, by: string) => {
  const hand = getInvestigator(s, by).hand
  return [
    ...[...new Set(hand)].map((c) => ({ c, from: 'hand' as const })),
    ...[...new Set(playableHand(s, by).slice(hand.length))].map((c) => ({
      c,
      from: 'discard' as const,
    })),
  ]
}

export function registerChaosAssets(code: string): boolean {
  if (code === '10084') {
    registerPlayerCard({
      code,
      limitTrait: 'Mask',
      observesDoomPlacement: true,
      forced: (_s, t, a) =>
        t.type === 'afterDoomOnEmptyCard' && a.uses < 2
          ? [{ type: 'AddUses', asset: a.id, amount: 2 - a.uses }]
          : [],
      testOptions: (_s, t, a) =>
        t.investigator === a.owner &&
        ['willpower', 'combat'].includes(t.skill) &&
        a.uses > 0 &&
        !t.abilityCounts?.[a.id + ':mask']
          ? [
              boost(
                a,
                'mask',
                'ability.talentUse',
                { skill: t.skill },
                [spend(a), { type: 'ModifySkillTest', use: a.id + ':mask' }],
                2,
              ),
            ]
          : [],
    })
    return true
  }
  if (code === '06328') {
    const refill = (s: GameState, a: Asset) =>
      getInvestigator(s, a.owner).hand.includes(code)
        ? [
            fast(
              a,
              [
                { type: 'DiscardFromHand', investigator: a.owner, card: code },
                { type: 'AddUses', asset: a.id, amount: 2 },
              ],
              ':refill',
            ),
          ]
        : []
    registerPlayerCard({
      code,
      abilities: refill,
      fastOptions: (s, a) => refill(s, a).map((o) => ({ ...o, investigator: a.owner })),
      reactions: (s, t, a) =>
        t.type === 'afterSkillTestInitiated' &&
        t.investigator === a.owner &&
        a.uses > 0 &&
        s.skillTest &&
        s.skillTest.skill !== 'willpower'
          ? [option(a, [spend(a), { type: 'ModifySkillTest', skill: 'willpower' }])]
          : [],
    })
    return true
  }
  if (code === '07194') {
    registerPlayerCard({
      code,
      forced: (_s, t, a) =>
        t.type === 'turnBegins' && t.investigator === a.owner
          ? [{ type: 'SetAssetForm', asset: a.id, form: '' }]
          : [],
      skillModifier: (_s, a, t) => (a.form?.split(',').includes(t.skill) ? 1 : 0),
      reactions: (_s, t, a) =>
        t.type === 'turnBegins' && t.investigator === a.owner
          ? [
              option(
                a,
                ask(
                  a.owner,
                  skills.map((first) => ({
                    label: 'skill.' + first,
                    then: ask(
                      a.owner,
                      skills
                        .filter((second) => second !== first)
                        .map((second) => ({
                          label: 'skill.' + second,
                          then: [{ type: 'SetAssetForm', asset: a.id, form: first + ',' + second }],
                        })),
                      true,
                    ),
                  })),
                  true,
                ),
              ),
            ]
          : [],
      handReactions: (_s, t, by) =>
        t.type === 'skillTestEnded' &&
        count(t.revealedTokens, 'bless') + count(t.revealedTokens, 'curse') >= 3
          ? [
              {
                key: 'hand:' + code,
                investigator: by,
                label: 'ability.playCard',
                params: { card: cardName(code) },
                then: [
                  {
                    type: 'PlayCard',
                    investigator: by,
                    code,
                    byEffect: true,
                    noCost: true,
                    asFast: true,
                  },
                ],
              },
            ]
          : [],
    })
    return true
  }
  if (code === '10133') {
    registerPlayerCard({
      code,
      limitTrait: 'Mask',
      reactions: (s, t, a) =>
        t.type === 'skillTestEnded' &&
        local(s, a.owner, t.investigator) &&
        count(t.revealedTokens, 'bless') > 0 &&
        count(t.revealedTokens, 'curse') > 0
          ? [
              option(a, [
                { type: 'AddUses', asset: a.id, amount: 1 },
                continuation(code, a.owner, 'swap', { asset: a.id }),
              ]),
            ]
          : [],
      effect: (s, _by, _step, d) =>
        s.assets[String(d.asset)]?.uses === 3
          ? [{ type: 'SwapSetAsideAsset', asset: String(d.asset), code: '10134', moveUses: true }]
          : [],
    })
    return true
  }
  if (code === '10134') {
    registerPlayerCard({
      code,
      limitTrait: 'Mask',
      reactions: (s, t, a) => {
        const held = s.skillTest?.revealing
        return t.type === 'whenRevealChaosToken' &&
          s.skillTest?.investigator === a.owner &&
          held &&
          ['bless', 'curse'].includes(String(held.face)) &&
          !a.exhausted &&
          a.uses > 0
          ? [
              option(a, [
                spend(a),
                exhaust(a),
                { type: 'ReturnTokensToBagAfterTest', tokens: [held.token] },
                { type: 'TreatRevealedTokenAs', token: 'elderSign' },
                continuation(code, a.owner, 'swap', { asset: a.id }),
              ]),
            ]
          : []
      },
      effect: (s, _by, _step, d) =>
        s.assets[String(d.asset)]?.uses === 0
          ? [{ type: 'SwapSetAsideAsset', asset: String(d.asset), code: '10133', moveUses: false }]
          : [],
    })
    return true
  }
  if (code === '10106' || code === '10107') {
    registerPlayerCard({
      code,
      leavesPlay: (_s, a) => [
        {
          type: 'SetAsidePlayerCards',
          investigator: a.originalOwner ?? a.owner,
          codes: [],
          assets: [a.id],
        },
      ],
      reactions: (s, t, a) => {
        const face = s.skillTest?.revealing?.face
        if (
          t.type !== 'whenRevealChaosToken' ||
          !s.skillTest ||
          !local(s, a.owner, s.skillTest.investigator) ||
          face !== (code === '10106' ? 'bless' : 'curse')
        )
          return []
        const pay: Message = {
          type: 'DamageAsset',
          asset: a.id,
          damage: code === '10107' ? 1 : 0,
          horror: code === '10106' ? 1 : 0,
        }
        const choices =
          code === '10106'
            ? nearby(s, a.owner)
                .filter((id) => s.locations[id]!.clues > 0)
                .map((id) => ({
                  label: 'choice.location',
                  params: { location: getLocation(s, id).name },
                  target: { type: 'location' as const, id },
                  then: [
                    pay,
                    {
                      type: 'DiscoverClues' as const,
                      investigator: a.owner,
                      location: id,
                      amount: 1,
                    },
                  ],
                }))
            : nearby(s, a.owner)
                .flatMap((id) => enemiesAt(s, id))
                .filter(
                  (e) =>
                    !e.hasNoStats &&
                    !immuneToPlayerCards(e) &&
                    getInvestigator(s, a.owner).etherealRound !== s.round,
                )
                .map((e) => ({
                  label: 'choice.enemy',
                  params: { enemy: e.name },
                  target: { type: 'enemy' as const, id: e.id },
                  then: [
                    pay,
                    {
                      type: 'DamageEnemy' as const,
                      by: a.owner,
                      enemy: e.id,
                      amount: 2,
                      source: { code },
                    },
                  ],
                }))
        return choices.length ? [option(a, ask(a.owner, choices, true))] : []
      },
    })
    return true
  }
  if (code === '07191' || code === '07192') {
    registerPlayerCard({
      code,
      requiredResearch: 'translatedGrimoire',
      ...(code === '07192' ? { observesEncounterDraw: true } : {}),
      reactions: (_s, t, a) =>
        t.type === 'afterRevealChaosToken' && t.investigator === a.owner && t.token === 'curse'
          ? [option(a, [{ type: 'AddUses', asset: a.id, amount: 1 }])]
          : code === '07192' &&
              t.type === 'wouldDrawTopEncounter' &&
              t.investigator === a.owner &&
              a.uses >= 5
            ? [
                option(a, [
                  { type: 'SpendUses', asset: a.id, amount: 5 },
                  { type: 'ReplaceEncounterDrawWithPlayerCard', investigator: a.owner },
                ]),
              ]
            : [],
      ...(code === '07191'
        ? {
            playModifiers: (s: GameState, a: Asset, c: string, fast: boolean) =>
              s.activeTurn === a.owner &&
              a.uses >= 2 &&
              fast &&
              playerCardDef(c)?.type === 'event' &&
              playerCardDef(c)?.traits.includes('Insight')
                ? [{ discount: 1, costs: [{ type: 'SpendUses' as const, asset: a.id, amount: 2 }] }]
                : [],
            fastOptions: (s: GameState, a: Asset) =>
              s.activeTurn === a.owner && turnActionTiming(s, a.owner) !== null && a.uses >= 2
                ? playZones(s, a.owner)
                    .filter(
                      ({ c, from }) =>
                        playerCardDef(c)?.type === 'event' &&
                        playerCardDef(c)?.traits.includes('Insight') &&
                        (!s.skillTest || actionKinds({ kind: 'play', card: c }).length === 1) &&
                        canPlayByEffect(
                          { ...s, assets: { ...s.assets, [a.id]: { ...a, uses: 0 } } },
                          a.owner,
                          c,
                          from,
                          false,
                          1,
                          false,
                          true,
                          true,
                        ),
                    )
                    .map(({ c, from }) => ({
                      ...fast(
                        a,
                        [
                          { type: 'SpendUses', asset: a.id, amount: 2 },
                          {
                            type: 'PlayCard',
                            investigator: a.owner,
                            code: c,
                            from,
                            consideredModifiers: [a.id],
                            byEffect: true,
                            asFast: true,
                            discount: 1,
                            noOpportunity: true,
                          },
                        ],
                        ':insight:' + from + ':' + c,
                      ),
                      investigator: a.owner,
                      label:
                        from === 'discard' ? 'choice.chaosInsightDiscard' : 'choice.chaosInsight',
                      params: { card: cardName(c) },
                    }))
                : [],
          }
        : {}),
    })
    return true
  }
  if (code === '10092') {
    registerPlayerCard({
      code,
      fightAction: true,
      abilities: (s, a) => {
        const cap = fighters(s, a.owner, code).length
          ? Math.min(3, poolTokensAvailable(s, 'curse'))
          : 0
        return cap
          ? Array.from({ length: cap }, (_, n) => ({
              key: a.id + ':athame:' + (n + 1),
              label: 'choice.chaosAthame',
              params: { n: n + 1 },
              actions: 1,
              actionKind: 'fight' as const,
              provokes: false,
              costs: [
                {
                  type: 'AddChaosTokens' as const,
                  tokens: Array.from({ length: n + 1 }, () => 'curse' as const),
                  scenarioOnly: true,
                },
              ],
              then: [continuation(code, a.owner, 'fight', { asset: a.id, n: n + 1 })],
            }))
          : []
      },
      effect: (s, by, step, d) => {
        const a = s.assets[String(d.asset)]
        if (step === 'replenish') {
          const choices = Object.values(s.assets)
            .filter(
              (x) =>
                x.owner === by &&
                ['charge', 'offering'].includes(playerCardDef(x.code)?.uses?.type ?? '') &&
                x.uses <
                  (playerCardBehavior(x.code)?.initialUses?.(s, by) ??
                    playerCardDef(x.code)?.uses?.count ??
                    0),
            )
            .map((x) => ({
              label: 'choice.chaosReplenish',
              params: { card: cardName(x.code) },
              then: [{ type: 'AddUses' as const, asset: x.id, amount: 1 }],
            }))
          return ask(by, choices, true)
        }
        if (!a) return []
        return ask(
          by,
          fighters(s, by, code).map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            target: { type: 'enemy' as const, id: e.id },
            then: [
              {
                type: 'BeginSkillTest' as const,
                investigator: by,
                source: a.id,
                skill: 'combat' as const,
                modifier: 2 * Number(d.n),
                difficulty: e.fight,
                kind: {
                  type: 'fight' as const,
                  enemy: e.id,
                  onDefeat: [continuation(code, by, 'replenish')],
                },
              },
            ],
          })),
          true,
        )
      },
    })
    return true
  }
  if (code === '10075') {
    registerPlayerCard({
      code,
      observesCommitCopies: true,
      handReactions: (s, t, by) =>
        t.type === 'whenRevealChaosToken' &&
        s.skillTest?.investigator === by &&
        s.skillTest.revealing?.face === 'curse'
          ? [
              {
                key:
                  'hand:' +
                  code +
                  ':' +
                  s.skillTest.committed.filter((c) => c.code === code && c.by === by).length,
                investigator: by,
                label: 'choice.chaosLuck',
                then: [
                  { type: 'CommitCard', investigator: by, code },
                  continuation(code, by, 'icons', { id: s.skillTest.nextCommitId ?? 0 }),
                ],
              },
            ]
          : [],
      effect: (s, by, _step, d) => {
        const c = s.skillTest?.committed.find(
          (c) => c.code === code && c.by === by && c.id === Number(d.id),
        )
        return c?.id === undefined
          ? []
          : Array.from({ length: 3 }, () => ({
              type: 'AddCommittedIcon' as const,
              commitId: c.id!,
              icon: 'wild' as const,
            }))
      },
    })
    return true
  }
  return false
}
