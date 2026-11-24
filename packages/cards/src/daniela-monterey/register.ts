// RR: Enemy Attacks, Attacks of Opportunity, Direct Damage/Horror, Movement, Investigate, Costs, Then.
import {
  attachedEnemyRestriction,
  distancesFrom,
  enemiesAt,
  enemyBehavior,
  getInvestigator,
  immuneToPlayerCards,
  investigationBlocked,
  registerEnemy,
  registerInvestigator,
  registerTreachery,
  scenarioBehavior,
  shroudOf,
  type GameState,
  type Investigator,
  type Message,
} from '@lcg/engine'
import {
  ask,
  cardName,
  continuation,
  mayParticipate,
  registerAdvancedCard as registerPlayerCard,
} from '../advanced-tests/common'
import { fightOptions } from '../dunwich-pilot/effects'
const distance = (s: GameState, i: Investigator) => {
  const origin = String(i.abilityState?.montereyOrigin ?? '')
  return i.abilityState?.montereyRound === s.round && i.location && s.locations[origin]
    ? (distancesFrom(s, origin).get(i.location) ?? 0)
    : 0
}
const reward = (by: string): Message[] =>
  ask(
    by,
    [
      {
        label: 'choice.montereyResource',
        then: [{ type: 'GainResources', investigator: by, amount: 1 }],
      },
      { label: 'choice.montereyDraw', then: [{ type: 'DrawCards', investigator: by, amount: 1 }] },
    ],
    true,
  )
const canInvestigate = (s: GameState, by: string) => {
  const location = getInvestigator(s, by).location
  return (
    !!location &&
    !!s.locations[location]?.revealed &&
    !investigationBlocked(s, location) &&
    !scenarioBehavior(s.scenarioId)?.cannotInvestigate?.(s, by, location)
  )
}
export function registerDanielaMontereyCard(code: string): void {
  if (code === '08001') {
    registerInvestigator({
      code,
      observesCanceledAttacks: true,
      observesAttackHistory: true,
      reactions: (s, t, i) => {
        if (
          (t.type !== 'afterEnemyAttack' && t.type !== 'afterCanceledEnemyAttack') ||
          t.investigator !== i.id ||
          t.opportunityProvoker === i.id ||
          !mayParticipate(s, i.id)
        )
          return []
        const e = s.enemies[t.enemy]
        return e && !immuneToPlayerCards(e)
          ? [
              {
                key: code + ':respond',
                investigator: i.id,
                label: 'ability.danielaRespond',
                then: ask(
                  i.id,
                  [
                    {
                      label: 'choice.danielaDamage',
                      params: { enemy: e.name },
                      then: [
                        { type: 'DamageEnemy', enemy: e.id, by: i.id, amount: 1, source: { code } },
                      ],
                    },
                    ...(!e.cannotBeEvaded
                      ? [
                          {
                            label: 'choice.danielaEvade',
                            params: { enemy: e.name },
                            then: [{ type: 'EvadeEnemy' as const, enemy: e.id, by: i.id }],
                          },
                        ]
                      : []),
                  ],
                  true,
                ),
              },
            ]
          : []
      },
      elderSign: (s, i) => ({
        modifier: 1,
        ...(s.enemyAttacks?.some((a) => a.investigator === i.id && a.round === s.round)
          ? { autoSucceed: true }
          : {}),
      }),
    })
    return
  }
  if (code === '08002') {
    registerPlayerCard({
      code,
      fastOptions: (s, a) =>
        !a.exhausted && mayParticipate(s, a.owner)
          ? enemiesAt(s, getInvestigator(s, a.owner).location ?? '')
              .filter(
                (e) =>
                  !immuneToPlayerCards(e) &&
                  !attachedEnemyRestriction(s, e.id, 'attachedEnemyCannotAttack') &&
                  e.noAttackAnyPhaseRound !== s.round &&
                  !(
                    s.phase === 'enemy' &&
                    (e.noAttackRound === s.round ||
                      (e.huntedRound === s.round && enemyBehavior(e.code)?.noAttackAfterHunting))
                  ) &&
                  !e.spares?.some((p) => p.investigator === a.owner && p.round === s.round),
              )
              .map((e) => ({
                key: a.id + ':provoke',
                investigator: a.owner,
                label: 'ability.wrenchProvoke',
                params: { enemy: e.name },
                then: [
                  { type: 'ExhaustAsset' as const, asset: a.id },
                  {
                    type: 'EnemyAttack' as const,
                    enemy: e.id,
                    investigator: a.owner,
                    exhaustAfter: false,
                    evenIfExhausted: true,
                  },
                ],
              }))
          : [],
      abilities: (s, a, by) =>
        fightOptions(s, a, by, 2, { extraDamage: 1 }).filter((o) =>
          getInvestigator(s, by).enemiesAttackedSinceTurnEnd?.includes(o.target.id),
        ),
    })
    return
  }
  if (code === '08003') {
    registerPlayerCard({
      code,
      enemy: {
        kind: 'enemy',
        code,
        name: cardName(code),
        fight: 3,
        health: 3,
        evade: 3,
        damage: 1,
        horror: 1,
        keywords: ['hunter'],
        traits: ['Humanoid', 'Criminal'],
        prey: { type: 'only', investigator: '08001' },
      },
    })
    registerEnemy({ code, attacksCannotBeCanceled: true, attacksDealDirect: true })
    return
  }
  if (code === '08007') {
    registerInvestigator({
      code,
      forced: (_s, t, i) =>
        t.type === 'roundBegins'
          ? [
              {
                type: 'SetInvestigatorAbilityState',
                investigator: i.id,
                values: { montereyOrigin: i.location ?? '', montereyRound: _s.round },
              },
            ]
          : [],
      reactions: (s, t, i) =>
        t.type === 'turnEnds' &&
        t.investigator === i.id &&
        distance(s, i) >= 1 &&
        mayParticipate(s, i.id)
          ? [
              {
                key: code + ':travel',
                investigator: i.id,
                label: 'ability.montereyTravel',
                then:
                  distance(s, i) >= 2
                    ? [
                        { type: 'GainResources', investigator: i.id, amount: 1 },
                        { type: 'DrawCards', investigator: i.id, amount: 1 },
                      ]
                    : reward(i.id),
              },
            ]
          : [],
      elderSign: (s, i) => ({ modifier: 1, immediate: distance(s, i) >= 1 ? reward(i.id) : [] }),
    })
    return
  }
  if (code === '08008') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        fightOptions(s, a, by, 0).map((o) => ({
          ...o,
          then: o.then.map((m) =>
            m.type === 'BeginSkillTest' ? { ...m, skill: 'agility' as const } : m,
          ),
        })),
      beforeResults: (s, t, a) =>
        !a.exhausted && t.succeeded && t.kind.type === 'fight'
          ? ask(
              t.investigator,
              [
                {
                  label: 'choice.whipDamage',
                  then: [
                    { type: 'ExhaustAsset', asset: a.id },
                    { type: 'AdjustAttackDamage', amount: 1 },
                  ],
                },
                ...(!s.enemies[t.kind.enemy]?.cannotBeEvaded
                  ? [
                      {
                        label: 'choice.whipEvade',
                        then: [
                          { type: 'ExhaustAsset' as const, asset: a.id },
                          { type: 'EvadeEnemy' as const, enemy: t.kind.enemy, by: t.investigator },
                        ],
                      },
                    ]
                  : []),
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          : [],
    })
    return
  }
  if (code === '08009') {
    registerPlayerCard({
      code,
      effect: (s, by, step, d) => {
        const t = s.treacheries[String(d.treachery)]
        if (step !== 'paid' || !t) return []
        return t.abilityState?.paid
          ? [{ type: 'ShuffleTreacheryIntoDeck', treachery: t.id, investigator: t.owner ?? by }]
          : [
              {
                type: 'SetTreacheryAbilityState',
                treachery: t.id,
                values: { paying: false, paid: false },
              },
            ]
      },
    })
    registerTreachery({
      code,
      revelation: (_s, by, t) => [
        {
          type: 'PlaceTreachery',
          treachery: t.id,
          placement: { type: 'threatArea', investigator: by },
        },
      ],
      blocksPlayerMovement: (s, _t, by) => canInvestigate(s, by),
      forced: (_s, t, self) =>
        t.type === 'afterDamageAssigned' &&
        t.source === cardName(code) &&
        t.investigator === self.abilityState?.paying &&
        t.dealt.reduce((n, d) => n + d.horror, 0) >= 2
          ? [{ type: 'SetTreacheryAbilityState', treachery: self.id, values: { paid: true } }]
          : [],
      abilities: (s, t, by) =>
        canInvestigate(s, by)
          ? [
              {
                key: t.id + ':investigate',
                label: 'ability.buriedInvestigate',
                actions: 1,
                provokes: false,
                actionKind: 'investigate',
                then: [
                  {
                    type: 'BeginSkillTest',
                    investigator: by,
                    skill: 'intellect',
                    difficulty: shroudOf(s, getInvestigator(s, by).location!),
                    kind: {
                      type: 'investigate',
                      location: getInvestigator(s, by).location!,
                      replaceClue: true,
                      onSuccess: [{ type: 'DiscardTreachery', treachery: t.id }],
                      onFail: ask(
                        by,
                        [
                          {
                            label: 'choice.buriedHorror',
                            then: [
                              {
                                type: 'SetTreacheryAbilityState',
                                treachery: t.id,
                                values: { paying: by, paid: false },
                              },
                              {
                                type: 'TakeDamage',
                                investigator: by,
                                damage: 0,
                                horror: 2,
                                source: cardName(code),
                              },
                              continuation(code, by, 'paid', { treachery: t.id }),
                            ],
                          },
                          { label: 'choice.skip', then: [] },
                        ],
                        true,
                      ),
                    },
                  },
                ],
              },
            ]
          : [],
    })
    return
  }
  if (code === '08021') {
    registerPlayerCard({
      code,
      playInAnyFastWindow: true,
      play: (_s, by) => [{ type: 'InterceptAttacksThisPhase', investigator: by, code }],
    })
    return
  }
  throw Error('Unreviewed Daniela/Monterey card ' + code)
}
