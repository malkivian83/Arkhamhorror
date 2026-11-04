// RR: Fight, Additional Costs, Success by X, Damage, Uses, Ready/Exhaust.
import {
  getInvestigator,
  attackBlocked,
  registerPlayerCard,
  skillValueFor,
  enemiesAt,
  type Message,
  type SkillTest,
} from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { attackable } from '../dunwich-pilot/effects'
import { ask, continuation, cardName, traits } from './common'
const margin = (t: SkillTest) => (t.modifiedSkill ?? 0) - t.difficulty
export function registerSupportCombat(code: string): boolean {
  if (code === '11119') {
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          cost: ['use'],
          available: ({ self }) => !self.exhausted,
          modifier: 5,
          extraDamage: 3,
        },
      ],
      () => ({ requiredInvestigatorTraits: traits[code]! }),
      (_c, { self }) =>
        self.exhausted || self.uses >= 1
          ? []
          : [
              {
                key: self.id + ':reload',
                label: 'choice.supportReload',
                params: { card: cardName(code) },
                actions: 1,
                provokes: true,
                costs: [{ type: 'ExhaustAsset', asset: self.id }],
                then: [{ type: 'AddUses', asset: self.id, amount: 1 }],
              },
            ],
    )
    return true
  }
  if (code === '60331') {
    registerBasicAsset(
      code,
      [{ action: 'fight', cost: ['exhaust', 'use'], modifier: 4, extraDamage: 1 }],
      () => ({
        beforeResults: (s, t, a) => {
          if (!t.succeeded || t.kind.type !== 'fight' || margin(t) < 2) return []
          const ready: Message[] = s.assets[a.id]?.exhausted
            ? [{ type: 'ReadyAsset', asset: a.id }]
            : []
          const damage: Message[] = [{ type: 'ModifySkillTest', extraDamage: 1 }]
          if (margin(t) >= 4) return [...ready, ...damage]
          return ask(
            t.investigator,
            [
              ...(ready.length ? [{ label: 'choice.supportReady', then: ready }] : []),
              { label: 'choice.supportDamage', then: damage },
            ],
            true,
          )
        },
      }),
    )
    return true
  }
  if (code === '11115') {
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          modifier: ({ state, investigator }, enemy) =>
            skillValueFor(state, investigator, 'willpower', { type: 'fight', enemy: enemy!.id }),
          onSuccess: ({ self, investigator }) => [
            continuation(code, investigator, 'storm', { asset: self.id }),
          ],
        },
      ],
      () => ({
        requiredInvestigatorTraits: traits[code]!,
        effect: (s, by, _step, data) => {
          const a = s.assets[String(data.asset)],
            t = s.skillTest
          if (!a || a.exhausted || !t?.succeeded) return []
          const n = Math.min(
            3,
            t.tokens.filter((token) =>
              ['skull', 'cultist', 'tablet', 'elderThing'].includes(String(token)),
            ).length,
          )
          const here = getInvestigator(s, by).location,
            enemies = here ? enemiesAt(s, here) : []
          if (n === 0 || !enemies.length) return []
          return ask(
            by,
            [
              ...enemies.map((e) => ({
                label: 'choice.supportStorm',
                params: { enemy: e.name, n },
                then: [
                  { type: 'ExhaustAsset' as const, asset: a.id },
                  { type: 'DamageEnemy' as const, enemy: e.id, by, amount: n },
                ],
              })),
              { label: 'choice.skip', then: [] },
            ],
            true,
          )
        },
      }),
    )
    return true
  }
  if (code === '02304') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        a.uses <= 0
          ? []
          : attackable(s, by)
              .filter((e) => !attackBlocked(s, by, e, code))
              .flatMap((e) =>
                Array.from(
                  {
                    length: Math.max(
                      0,
                      getInvestigator(s, by).actionsRemaining +
                        (getInvestigator(s, by).fightActionsThisTurn ?? 0),
                    ),
                  },
                  (_, extra) => ({
                    key: a.id + ':fight:' + e.id + ':' + extra,
                    label: 'choice.supportTypewriter',
                    params: { enemy: e.name, n: extra },
                    actions: 1 + extra,
                    actionKind: 'fight' as const,
                    target: { type: 'enemy' as const, id: e.id },
                    provokes: false,
                    costs: [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }],
                    then: [continuation(code, by, 'fight', { asset: a.id, enemy: e.id })],
                  }),
                ),
              ),
      effect: (s, by, _step, data) => {
        const a = s.assets[String(data.asset)],
          e = s.enemies[String(data.enemy)]
        if (!a || !e) return []
        const actions =
          s.resolvingAssetActions?.findLast((frame) => frame.asset === a.id)?.actions ?? 0
        return [
          {
            type: 'BeginSkillTest',
            investigator: by,
            source: a.id,
            skill: 'combat',
            modifier: actions * 2,
            difficulty: e.fight,
            kind: { type: 'fight', enemy: e.id, extraDamage: 2 },
          },
        ]
      },
    })
    return true
  }
  if (code === '60255') {
    registerBasicAsset(code, [{ action: 'investigate', cost: ['use'] }], () => ({
      observesCommitCopies: true,
      forced: (s, t, a) => {
        if (
          t.type !== 'afterCommit' ||
          t.by !== a.owner ||
          s.skillTest?.source !== a.id ||
          t.commitId === undefined
        )
          return []
        const own = s.skillTest.committed.filter((c) => c.by === a.owner)
        return own.length === 1 && own[0]!.id === t.commitId
          ? [{ type: 'AddCommittedIcon', commitId: t.commitId, icon: 'wild' }]
          : []
      },
      beforeResults: (_s, t, _a) =>
        t.succeeded && t.kind.type === 'investigate'
          ? ask(
              t.investigator,
              [
                {
                  label: 'choice.supportHorrorClue',
                  then: [
                    { type: 'TakeDamage', investigator: t.investigator, damage: 0, horror: 1 },
                    { type: 'AddInvestigationResults', extraClues: 1 },
                  ],
                },
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          : [],
    }))
    return true
  }
  if (code === '10064') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        enemiesAt(s, getInvestigator(s, by).location!)
          .filter((e) => !e.traits?.includes('Elite'))
          .map((e) => ({
            key: a.id + ':parley:' + e.id,
            label: 'choice.supportParley',
            params: { enemy: e.name, card: cardName(code) },
            actions: 1,
            provokes: false,
            parley: true,
            then: [
              {
                type: 'BeginSkillTest',
                investigator: by,
                source: a.id,
                skill: 'willpower',
                difficulty: e.health,
                tags: ['parley'],
                kind: {
                  type: 'effect',
                  source: code,
                  onSuccess: [
                    { type: 'EnemyGainsKeyword', enemy: e.id, keyword: 'aloof' },
                    { type: 'DisengageEnemy', enemy: e.id },
                  ],
                  onFail: [],
                  onFailEach: [],
                },
              },
            ],
          })),
    })
    return true
  }
  return false
}
