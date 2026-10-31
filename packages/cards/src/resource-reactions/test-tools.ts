// RR: Replenish, Limits, Skill Test Timing (ST.3/ST.6), Return, Cancel.
import {
  registerPlayerCard,
  playerCardDef,
  previewToken,
  skillTestValue,
  type SkillType,
  type Message,
} from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'
import { boost } from '../asset-utilities/register'
const masks: Record<string, SkillType[]> = {
  '10043': ['willpower', 'intellect'],
  '10067': ['intellect', 'agility'],
  '10111': ['willpower', 'agility'],
}
export function registerTestTools(code: string): boolean {
  const skills = masks[code]
  if (skills) {
    registerPlayerCard({
      code,
      limitTrait: 'Mask',
      forced: (_s, t, a) => {
        const triggered =
          code === '10043'
            ? (t.type === 'afterRevealLocation' || t.type === 'afterPutLocation') &&
              t.investigator === a.owner
            : code === '10067'
              ? t.type === 'afterMove' && t.investigator === a.owner && t.fromHadEnemy
              : t.type === 'afterTakeDamage' &&
                t.investigator === a.owner &&
                t.damage + t.horror > 0
        return triggered && a.uses < 2 ? [{ type: 'AddUses', asset: a.id, amount: 1 }] : []
      },
      testOptions: (_s, t, a) =>
        t.investigator === a.owner &&
        skills.includes(t.skill) &&
        a.uses > 0 &&
        !t.abilityCounts?.[a.id + ':mask']
          ? [
              boost(
                a,
                'mask',
                'ability.talentUse',
                { skill: t.skill },
                [
                  { type: 'SpendUses', asset: a.id, amount: 1 },
                  { type: 'ModifySkillTest', use: a.id + ':mask' },
                ],
                2,
              ),
            ]
          : [],
    })
    return true
  }
  if (['04159', '02309'].includes(code)) {
    registerPlayerCard({
      code,
      ...(code === '04159' ? { discardWhenEmpty: true } : {}),
      reactions: (s, t, a) => {
        if (
          t.type !== 'afterSkillTest' ||
          t.succeeded ||
          a.exhausted ||
          (code === '04159' && a.uses < 1)
        )
          return []
        const choices =
          s.skillTest?.committed.flatMap((c, index) =>
            c.by === a.owner && !c.returnToHand && playerCardDef(c.code)?.type === 'skill'
              ? [
                  {
                    label: 'choice.resourceReturn',
                    params: { card: cardName(c.code) },
                    then: [
                      { type: 'ExhaustAsset' as const, asset: a.id },
                      ...(code === '04159'
                        ? [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }]
                        : []),
                      { type: 'ReturnCommittedCard' as const, index },
                    ],
                  },
                ]
              : [],
          ) ?? []
        return choices.length
          ? [
              {
                key: a.id + ':return',
                investigator: a.owner,
                label: 'choice.resourceReact',
                params: { card: cardName(code) },
                then: ask(a.owner, choices, true),
              },
            ]
          : []
      },
    })
    return true
  }
  if (code === '08126') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        const face = s.skillTest?.revealing?.face
        return t.type === 'afterRevealingChaosToken' &&
          t.investigator === a.owner &&
          typeof face === 'string' &&
          face !== 'autoFail'
          ? [
              {
                key: a.id + ':fur',
                investigator: a.owner,
                label: 'choice.resourceReact',
                params: { card: cardName(code) },
                then: [
                  { type: 'DamageAsset', asset: a.id, damage: 1, horror: 0 },
                  { type: 'CancelRevealedToken', redraw: true },
                ],
              },
            ]
          : []
      },
    })
    return true
  }
  if (['01056', '05324'].includes(code)) {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) => {
        const test = s.skillTest,
          held = test?.revealing
        if (t.type !== 'afterRevealingChaosToken' || t.investigator !== by || !test || !held)
          return []
        const effect = previewToken(s, held.face)
        const before = test.autoFail ? 0 : Math.max(0, skillTestValue(s).total + test.tokenModifier)
        const eligible =
          code === '01056'
            ? effect.modifier < 0 && held.reverseModifierOf !== held.face
            : effect.autoFail ||
              (before > 0 && effect.modifier < 0 && before + effect.modifier <= 0)
        if (!eligible) return []
        const action: Message =
          code === '01056'
            ? { type: 'ReverseRevealedTokenModifier' }
            : { type: 'TreatRevealedTokenAs', token: 'elderSign' }
        return [
          {
            key: code + ':token',
            investigator: by,
            label: 'ability.playCard',
            params: { card: cardName(code) },
            target: { type: 'hand', code },
            then: [{ type: 'PlayCard', investigator: by, code, effect: [action] }],
          },
        ]
      },
    })
    return true
  }
  return false
}
