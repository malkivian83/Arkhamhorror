// RR: Reactions, Skill Tests ST.2–ST.8, Success/Failure, Costs, Damage Assignment.
import {
  getInvestigator,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  skillTestValue,
  type GameState,
  type Message,
} from '@lcg/engine'
import { ask, continuation, exhaust, react, gain, heal, investigatorTraits } from './common'
export const successMargin = (s: GameState) => {
  const t = s.skillTest!
  const value = t.forcedSuccess
    ? t.difficulty
    : Math.max(0, skillTestValue(s).total + t.tokenModifier)
  return Math.max(0, value - (t.autoSucceed ? 0 : t.difficulty) + (t.successMarginModifier ?? 0))
}
export function registerTestEconomy(code: string): boolean {
  if (code === '60177') {
    registerPlayerCard({
      code,
      soaksAtLocation: true,
      skillModifier: (_s, _a, t) => (t.skill === 'combat' ? 1 : 0),
      reactions: (s, t, a) =>
        t.type === 'afterAssetDamaged' &&
        t.asset === a.id &&
        t.damage > 0 &&
        !a.exhausted &&
        getInvestigator(s, a.owner).location !== null &&
        s.locations[getInvestigator(s, a.owner).location!]!.clues > 0
          ? [react(a, [exhaust(a), { type: 'DiscoverClues', investigator: a.owner, amount: 1 }])]
          : [],
    })
    return true
  }
  if (code === '09055') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        !a.exhausted &&
        t.type === 'afterCluesSpentOrPlaced' &&
        t.investigator === a.owner &&
        t.amount > 0
          ? [
              react(a, [
                exhaust(a),
                s.activeTurn === a.owner
                  ? { type: 'GainActions', investigator: a.owner, amount: 1 }
                  : { type: 'NextTurnBenefits', investigator: a.owner, actions: 1, code },
              ]),
            ]
          : [],
    })
    return true
  }
  if (code === '11111') {
    registerPlayerCard({
      code,
      requiredInvestigatorTraits: investigatorTraits[code]!,
      testOptions: (s, t, a) =>
        !a.exhausted &&
        t.source &&
        playerCardDef(s.assets[t.source]?.code ?? t.sourceSnapshot?.code ?? '')?.traits.includes(
          'Tool',
        )
          ? [
              react(a, [
                exhaust(a),
                { type: 'BoostSkillTest', amount: 2 },
                {
                  type: 'ModifySkillTest',
                  onFail: [continuation(code, a.owner, 'fail', { asset: t.source })],
                },
              ]),
            ]
          : [],
      effect: (s, by, _step, data) => {
        const a = s.assets[String(data.asset)],
          max = a
            ? (playerCardBehavior(a.code)?.initialUses?.(s, a.owner) ??
              playerCardDef(a.code)?.uses?.count ??
              0)
            : 0
        return ask(
          by,
          [
            { label: 'choice.eventGain', then: [gain(by)] },
            ...(a && playerCardDef(a.code)?.uses?.type === 'supply' && a.uses < max
              ? [
                  {
                    label: 'choice.eventAddUses',
                    params: { card: playerCardDef(a.code)!.name, n: 1 },
                    then: [{ type: 'AddUses' as const, asset: a.id, amount: 1 }],
                  },
                ]
              : []),
          ],
          true,
        )
      },
    })
    return true
  }
  if (code === '10053') {
    registerPlayerCard({
      code,
      limitTitle: true,
      reactions: (s, t, a) =>
        t.type === 'whenWouldSucceed' && t.investigator === a.owner && !a.exhausted
          ? [react(a, [exhaust(a), continuation(code, a.owner, 'margin')])]
          : [],
      effect: (s, by) => {
        const margin = successMargin(s)
        return ask(
          by,
          [-1, 1]
            .filter((n) => margin + n >= 0)
            .map((n) => ({
              label: 'choice.eventMargin',
              params: { n },
              then: [
                { type: 'AdjustSuccessMargin' as const, amount: n },
                ...(margin + n === 2 ? [heal(by, 0, 1)] : []),
              ],
            })),
          true,
        )
      },
    })
    return true
  }
  if (code === '11101') {
    registerPlayerCard({
      code,
      requiredInvestigatorTraits: investigatorTraits[code]!,
      committedReactions: (s, t, by) => {
        if (t.type !== 'whenWouldSucceed' || !s.skillTest) return []
        const copy = s.skillTest.committed.find(
          (c) => c.code === code && c.by === by && !s.skillTest!.abilityCounts?.[code + ':' + c.id],
        )
        if (!copy) return []
        return [
          {
            key: code + ':' + copy.id,
            investigator: s.skillTest.investigator,
            label: 'choice.eventInquisitive',
            then: [
              { type: 'ModifySkillTest', use: code + ':' + copy.id },
              continuation(code, s.skillTest.investigator, 'margin'),
            ],
          },
        ]
      },
      effect: (s, by) => {
        const margin = successMargin(s)
        return ask(
          by,
          [-2, -1, 1, 2]
            .filter((n) => margin + n >= 0)
            .map((n) => ({
              label: 'choice.eventMargin',
              params: { n },
              then: [{ type: 'AdjustSuccessMargin' as const, amount: n }],
            })),
          true,
        )
      },
    })
    return true
  }
  if (code === '11107') {
    registerPlayerCard({
      code,
      requiredInvestigatorTraits: investigatorTraits[code]!,
      observesCommitCopies: true,
      onCommit: (_s, by) => [continuation(code, by, 'pay')],
      effect: (s, by) => {
        const copy = s.skillTest?.committed.findLast((c) => c.code === code && c.by === by)
        if (copy?.id === undefined) return []
        return ask(
          by,
          Array.from({ length: Math.min(3, getInvestigator(s, by).resources) + 1 }, (_, n) => ({
            label: 'choice.spendResources',
            params: { n },
            then: [
              ...(n ? [{ type: 'SpendResources' as const, investigator: by, amount: n }] : []),
              ...Array.from({ length: 2 * n }, (): Message => ({
                type: 'AddCommittedIcon',
                commitId: copy.id!,
                icon: 'wild',
              })),
            ],
          })),
          true,
        )
      },
    })
    return true
  }
  return false
}
