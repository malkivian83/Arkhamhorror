// RR: Reaction Opportunities, As If, Investigate, Cannot, Fast Abilities, Costs, Then, Weaknesses.
import {
  canPlayByEffect,
  engagedEnemies,
  enemiesAt,
  enemyBehavior,
  immuneToPlayerCards,
  playerCardDef,
  registerEnemy,
  registerInvestigator,
  releaseOrphanedSeals,
  shroudOf,
  stuckInPlay,
  type Choice,
  type GameState,
} from '@lcg/engine'
import {
  ask,
  cardName,
  continuation,
  mayParticipate,
  registerAdvancedCard as registerPlayerCard,
} from '../advanced-tests/common'
const movable = (s: GameState, by: string) =>
  Object.values(s.assets).filter((a) => a.owner === by && !stuckInPlay(s, a))
export function registerTrishDexterCard(code: string): void {
  if (code === '07003') {
    registerInvestigator({
      code,
      reactions: (s, t, i) => {
        if (
          t.type !== 'afterDiscoverClues' ||
          t.investigator !== i.id ||
          (t.amount ?? 1) <= 0 ||
          !mayParticipate(s, i.id)
        )
          return []
        const enemies = enemiesAt(s, t.location)
        if (!enemies.length) return []
        const choices: Choice[] = [
          ...(s.locations[t.location]!.clues > 0 &&
          !engagedEnemies(s, i.id).some((e) => enemyBehavior(e.code)?.cluesOnlyByInvestigating)
            ? [
                {
                  label: 'choice.trishClue',
                  then: [
                    {
                      type: 'DiscoverClues' as const,
                      investigator: i.id,
                      location: t.location,
                      amount: 1,
                    },
                  ],
                },
              ]
            : []),
          ...enemies
            .filter((e) => !immuneToPlayerCards(e))
            .map((e) => ({
              label: 'choice.trishEvade',
              params: { enemy: e.name },
              then: [{ type: 'EvadeEnemy' as const, enemy: e.id, by: i.id }],
            })),
        ]
        return choices.length
          ? [
              {
                key: code + ':clues',
                investigator: i.id,
                label: 'ability.trishClues',
                limit: { per: 'round' },
                then: ask(i.id, choices, true),
              },
            ]
          : []
      },
      elderSign: (s, i) => ({
        modifier: 2,
        immediate:
          s.skillTest?.kind.type === 'investigate'
            ? ask(
                i.id,
                Object.values(s.locations)
                  .filter((l) => l.revealed)
                  .map((l) => ({
                    label: 'choice.trishInvestigate',
                    params: { location: l.name },
                    target: { type: 'location' as const, id: l.id },
                    then: [
                      {
                        type: 'AsIfAt' as const,
                        investigator: i.id,
                        location: l.id,
                        untilTestEnds: true,
                        then: [
                          continuation(code, i.id, 'retarget', {
                            location: l.id,
                            oldShroud: shroudOf(
                              s,
                              s.skillTest!.kind.type === 'investigate'
                                ? s.skillTest!.kind.location
                                : l.id,
                            ),
                          }),
                        ],
                      },
                    ],
                  })),
                true,
              )
            : [],
      }),
    })
    registerPlayerCard({
      code,
      effect: (s, _by, step, d) =>
        step === 'retarget' && s.skillTest?.kind.type === 'investigate'
          ? [
              {
                type: 'ModifySkillTest',
                investigateLocation: String(d.location),
                difficultyDelta: shroudOf(s, String(d.location)) - Number(d.oldShroud),
              },
            ]
          : [],
    })
    return
  }
  if (code === '07010') {
    registerPlayerCard({
      code,
      handReactions: (_s, t, by) =>
        t.type === 'turnBegins' && t.investigator === by
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
                    asFast: true,
                    effect: [{ type: 'BecomeEthereal', investigator: by }],
                  },
                ],
              },
            ]
          : [],
    })
    return
  }
  if (code === '07011') {
    registerPlayerCard({
      code,
      enemy: {
        kind: 'enemy',
        code,
        name: cardName(code),
        fight: 3,
        health: 3,
        evade: 5,
        damage: 2,
        horror: 0,
        traits: ['Humanoid', 'Cultist'],
        keywords: ['hunter'],
        prey: { type: 'only', investigator: '07003' },
      },
    })
    registerEnemy({
      code,
      cluesOnlyByInvestigating: true,
      forced: (_s, t, e) =>
        t.type === 'afterEvade' && t.enemy === e.id ? [{ type: 'DiscardEnemy', enemy: e.id }] : [],
    })
    return
  }
  if (code === '07004') {
    registerInvestigator({
      code,
      fastOptions: (s, i) =>
        s.phase === 'investigation' &&
        s.activeTurn === i.id &&
        i.abilityState?.dexterSwapRound !== s.round &&
        mayParticipate(s, i.id)
          ? movable(s, i.id).flatMap((a) => {
              const { [a.id]: _removed, ...assets } = s.assets
              const projected = releaseOrphanedSeals({ ...s, assets })
              return [...new Set(i.hand)]
                .filter(
                  (c) =>
                    playerCardDef(c)?.type === 'asset' &&
                    cardName(c) !== cardName(a.code) &&
                    canPlayByEffect(projected, i.id, c, 'hand', false, 1, false, true, true),
                )
                .map((c) => ({
                  key: code + ':swap',
                  investigator: i.id,
                  label: 'ability.dexterSwap',
                  params: { discard: cardName(a.code), card: cardName(c) },
                  then: [
                    {
                      type: 'DiscardAsset' as const,
                      asset: a.id,
                      onDiscard: [
                        {
                          type: 'SetInvestigatorAbilityState' as const,
                          investigator: i.id,
                          values: { dexterSwapRound: s.round },
                        },
                        {
                          type: 'PlayCard' as const,
                          investigator: i.id,
                          code: c,
                          byEffect: true,
                          asFast: true,
                          noOpportunity: true,
                          discount: 1,
                        },
                      ],
                    },
                  ],
                }))
            })
          : [],
      elderSign: (s, i) => ({
        modifier: 2,
        immediate: ask(
          i.id,
          [
            ...movable(s, i.id).map((a) => ({
              label: 'choice.dexterReturn',
              params: { card: cardName(a.code) },
              target: { type: 'asset' as const, id: a.id },
              then: [
                {
                  type: 'ReturnAssetToHand' as const,
                  asset: a.id,
                  onReturn: [{ type: 'DrawCards' as const, investigator: i.id, amount: 1 }],
                },
              ],
            })),
            { label: 'choice.skip', then: [] },
          ],
          true,
        ),
      }),
    })
    registerPlayerCard({ code })
    return
  }
  if (code === '07012') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'afterAssetEntersPlay' && s.assets[t.asset]?.owner === a.owner
          ? [
              {
                key: a.id + ':show:' + t.asset,
                investigator: a.owner,
                label: 'ability.showmanship',
                params: { card: cardName(s.assets[t.asset]!.code) },
                then: [
                  {
                    type: 'SetAssetAbilityState',
                    asset: a.id,
                    values: { ['show:' + t.asset]: s.round },
                  },
                ],
              },
            ]
          : [],
      skillModifier: (s, a, t) =>
        t.investigator === a.owner && t.source && a.abilityState?.['show:' + t.source] === s.round
          ? 2
          : 0,
    })
    return
  }
  if (code === '07013') {
    registerPlayerCard({
      code,
      cannotPlayAction: true,
      handSkillModifier: (_s, _by, t) => (t.skill === 'willpower' ? -2 : 0),
      skillModifier: (_s, _a, t) => (t.skill === 'willpower' ? -1 : 0),
    })
    return
  }
  throw new Error('Unreviewed Trish/Dexter card ' + code)
}
