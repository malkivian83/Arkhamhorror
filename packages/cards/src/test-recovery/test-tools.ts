// RR: Reactions, Skill Icons, Last Known Information, Uses, Researched, Healing.
import {
  registerPlayerCard,
  playerCardBehavior,
  playerCardDef,
  getInvestigator,
  turnStartedAt,
  turnActionTiming,
  type SkillIcon,
  type Message,
  type Choice,
} from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { ask, cardName, continuation, destinations } from '../dunwich-pilot/effects'
import { boost } from '../asset-utilities/register'
import { near, onTreachery, reaction } from './helpers'
const totems = ['05119', '05194', '05195'],
  stones = ['04230', '04231', '53004'],
  mash = ['05117', '05190', '05191']
const icons: SkillIcon[] = ['willpower', 'intellect', 'combat', 'agility', 'wild']
export function registerTools(code: string): boolean {
  if (totems.includes(code)) {
    registerPlayerCard({
      code,
      observesCommitCopies: true,
      reactions: (s, t, a) => {
        if (t.type !== 'afterCommit' || t.by !== a.owner || a.exhausted || t.commitId === undefined)
          return []
        const test = s.skillTest,
          c = test?.committed.find((c) => c.id === t.commitId)
        if (!test || !c) return []
        const base = playerCardDef(c.code)?.icons,
          extra = playerCardBehavior(c.code)?.additionalIcons?.(s, test, c.by, 'committed')
        const delayed: Message[] =
          code === '05194'
            ? [
                {
                  type: 'ModifySkillTest',
                  onSuccess: [{ type: 'DrawCards', investigator: test.investigator, amount: 1 }],
                },
              ]
            : code === '05195'
              ? [
                  {
                    type: 'ModifySkillTest',
                    onFail: [continuation(code, a.owner, 'return', { commitId: t.commitId })],
                  },
                ]
              : []
        const choices: Choice[] = icons
          .filter(
            (icon) => (base?.[icon] ?? 0) + (extra?.[icon] ?? 0) + (c.iconBonus?.[icon] ?? 0) > 0,
          )
          .map((icon) => ({
            label: 'choice.recoveryIcon',
            params: { skill: icon, card: cardName(c.code) },
            then: [
              { type: 'ExhaustAsset' as const, asset: a.id },
              { type: 'AddCommittedIcon' as const, commitId: t.commitId!, icon },
              ...delayed,
            ],
          }))
        // RR Effects: resolve as much as possible; the upgraded delayed result can
        // affect the game even when a committed card (Take Heart) has no icons.
        if (!choices.length && delayed.length)
          choices.push({
            label: 'choice.recoveryUse',
            params: { card: cardName(c.code) },
            then: [{ type: 'ExhaustAsset', asset: a.id }, ...delayed],
          })
        return choices.length
          ? [reaction(a.id + ':totem', a.owner, code, ask(a.owner, choices, true))]
          : []
      },
      effect: (s, _by, step, data) => {
        if (step !== 'return' || s.skillTest?.succeeded !== false) return []
        const index = s.skillTest.committed.findIndex((c) => c.id === Number(data.commitId))
        return index >= 0 && !getInvestigator(s, s.skillTest.committed[index]!.by).eliminated
          ? [{ type: 'ReturnCommittedCard', index }]
          : []
      },
    })
    return true
  }
  if (mash.includes(code)) {
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          modifier: 3,
          cost: ['discard'],
          ...(code === '05190' ? { extraDamage: 1 } : {}),
          ...(code === '05191'
            ? {
                onSuccess: ({ investigator }, e) =>
                  e && !e.traits?.includes('Elite')
                    ? [{ type: 'EvadeEnemy', enemy: e.id, by: investigator }]
                    : [],
              }
            : {}),
        },
      ],
      () => ({
        testOptions: (_s, t, a) =>
          t.investigator === a.owner && onTreachery(t) && !a.exhausted && a.uses > 0
            ? [
                boost(
                  a,
                  'mash',
                  'choice.recoveryUse',
                  {},
                  [
                    { type: 'ExhaustAsset', asset: a.id },
                    { type: 'SpendUses', asset: a.id, amount: 1 },
                  ],
                  code === '05190' ? 3 : 2,
                ),
              ]
            : [],
      }),
    )
    return true
  }
  if (code === '04023') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) =>
        onTreachery(t) && ['willpower', 'agility'].includes(t.skill) ? 1 : 0,
      reactions: (s, t, a) =>
        t.type === 'afterSkillTest' &&
        t.succeeded &&
        t.investigator === a.owner &&
        !a.exhausted &&
        s.skillTest &&
        onTreachery(s.skillTest)
          ? [
              reaction(a.id + ':tooth', a.owner, code, [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'DrawCards', investigator: a.owner, amount: 1 },
              ]),
            ]
          : [],
    })
    return true
  }
  if (code === '03309') {
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          cost: ['use'],
          modifier: ({ state, self }) =>
            turnActionTiming(state) !== null &&
            self.enteredAtTurn !== undefined &&
            self.enteredAtTurn === turnStartedAt(state)
              ? 2
              : 1,
          extraDamage: ({ state, self }) =>
            turnActionTiming(state) !== null &&
            self.enteredAtTurn !== undefined &&
            self.enteredAtTurn === turnStartedAt(state)
              ? 2
              : 1,
        },
      ],
      () => ({ recordsEntryTurn: true, noAttacksOfOpportunity: true }),
    )
    return true
  }
  if (['08114', '08115'].includes(code)) {
    registerPlayerCard({
      code,
      deckLimitBySubtitle: true,
      reactions: (_s, t, a) => {
        if (
          t.type !== 'afterSkillTest' ||
          t.investigator !== a.owner ||
          a.exhausted ||
          Math.abs(t.margin) < 2
        )
          return []
        const damage = t.succeeded ? (code === '08115' ? 1 : 0) : code === '08114' ? 1 : 0,
          horror = 1 - damage
        return (damage ? a.damage : a.horror) > 0
          ? [
              reaction(a.id + ':memento', a.owner, code, [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'HealAsset', asset: a.id, damage, horror },
              ]),
            ]
          : []
      },
    })
    return true
  }
  if (stones.includes(code)) {
    registerPlayerCard({
      code,
      requiredResearch: 'identifiedStone',
      initialUses: (s) => Math.max(0, Number(s.campaignLog?.values.identifiedStone) || 0),
      reactions: (s, t, a) => {
        if (
          t.type !== 'whenCardsDrawn' ||
          t.investigator !== a.owner ||
          t.amount < 1 ||
          a.uses < t.amount
        )
          return []
        const n = t.amount,
          cost: Message = { type: 'SpendUses', asset: a.id, amount: n },
          here = getInvestigator(s, a.owner).location
        let choices: Choice[] = []
        if (code === '04230')
          choices = Object.values(s.enemies)
            .filter((e) => e.location === here)
            .map((e) => ({
              label: 'choice.recoveryTarget',
              params: { name: e.name },
              then: [cost, { type: 'DamageEnemy', enemy: e.id, amount: n, by: a.owner }],
            }))
        if (code === '04231') {
          choices = near(s, a.owner)
            .filter((i) => i.horror > 0)
            .map((i) => ({
              label: 'choice.recoveryTarget',
              params: { name: i.name },
              then: [cost, { type: 'Heal', investigator: i.id, damage: 0, horror: n }],
            }))
          choices.push(
            ...Object.values(s.assets)
              .filter((x) => near(s, a.owner).some((i) => i.id === x.owner) && x.horror > 0)
              .map((x) => ({
                label: 'choice.recoveryTarget',
                params: { name: cardName(x.code) },
                then: [cost, { type: 'HealAsset' as const, asset: x.id, damage: 0, horror: n }],
              })),
          )
          choices.push(
            ...Object.values(s.placedAssets ?? {})
              .filter(
                (x) =>
                  !x.faceDown &&
                  x.placement.type === 'location' &&
                  x.placement.location === here &&
                  x.horror > 0 &&
                  playerCardDef(x.code)?.sanity !== undefined,
              )
              .map((x) => ({
                label: 'choice.recoveryTarget',
                params: { name: x.name },
                then: [cost, { type: 'HealAsset' as const, asset: x.id, damage: 0, horror: n }],
              })),
          )
        }
        if (code === '53004' && destinations(s, a.owner).length)
          choices = [
            {
              label: 'choice.recoveryUse',
              params: { card: cardName(code) },
              then: [cost, continuation(code, a.owner, 'move', { left: n })],
            },
          ]
        return choices.length
          ? [reaction(a.id + ':stone', a.owner, code, ask(a.owner, choices, true))]
          : []
      },
      effect: (_s, by, step, data) => {
        if (step !== 'move' || Number(data.left) < 1) return []
        return [
          {
            type: 'ChooseMove',
            investigator: by,
            mandatory: true,
            then: [continuation(code, by, 'move', { left: Number(data.left) - 1 })],
          },
        ]
      },
    })
    return true
  }
  return false
}
