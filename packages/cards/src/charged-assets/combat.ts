// RR: Fight, Skill Tests (ST.6), Limits and Maximums, Put into Play.
import { playerCardBehavior, registerPlayerCard, skillTestValue, skillValueFor } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { cardName } from '../dunwich-pilot/effects'
export function registerCombat(code: string): boolean {
  if (['10065', '10077'].includes(code)) {
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          skills: ['combat', 'agility'],
          cost: ['use'],
          modifier: code === '10077' ? 2 : 0,
          extraDamage: 1,
          ignoreAloof: code === '10077',
        },
      ],
      () => ({
        handReactions: (s, t, by) =>
          t.type === 'afterSkillTest' &&
          t.investigator === by &&
          !t.succeeded &&
          s.skillTest?.tags?.includes('parley')
            ? [
                {
                  key: code + ':entry',
                  investigator: by,
                  label: 'choice.toolEntry',
                  params: { card: cardName(code) },
                  then: [{ type: 'PutAssetIntoPlay', investigator: by, code, fromHand: true }],
                },
              ]
            : [],
      }),
    )
    return true
  }
  if (code === '10021') {
    registerBasicAsset(
      code,
      [
        { action: 'fight', modifier: 2 },
        { action: 'fight', skills: ['agility'], cost: ['exhaust'], actions: 0 },
      ],
      () => ({
        reactions: (s, t, a) =>
          t.type === 'whenWouldSucceed' &&
          t.investigator === a.owner &&
          s.skillTest?.source === a.id &&
          s.skillTest.kind.type === 'fight' &&
          !a.exhausted &&
          Math.max(0, skillTestValue(s).total + s.skillTest.tokenModifier) -
            s.skillTest.difficulty ===
            2
            ? [
                {
                  key: a.id + ':precise',
                  investigator: a.owner,
                  label: 'choice.chargedLegend',
                  params: { card: cardName(code) },
                  then: [
                    { type: 'ExhaustAsset', asset: a.id },
                    { type: 'ModifySkillTest', extraDamage: 2 },
                  ],
                },
              ]
            : [],
      }),
    )
    return true
  }
  if (code === '04276') {
    registerBasicAsset(code, [
      { action: 'fight', modifier: 2, extraDamage: 1, available: ({ self }) => !self.exhausted },
      {
        action: 'fight',
        key: ':legend',
        cost: ['exhaust'],
        extraDamage: 3,
        modifier: ({ state, investigator }, enemy) =>
          skillValueFor(state, investigator, 'willpower', { type: 'fight', enemy: enemy!.id }),
      },
    ])
    const b = playerCardBehavior(code)!,
      abilities = b.abilities!
    registerPlayerCard({
      ...b,
      abilities: (s, a, by) =>
        abilities(s, a, by).map((o) => {
          if (!o.key.endsWith(':legend')) return o
          return {
            ...o,
            key: code + ':legend',
            limit: { per: 'game' as const },
            then: o.then.map((m) =>
              m.type === 'BeginSkillTest' && m.kind.type === 'fight'
                ? {
                    ...m,
                    kind: {
                      ...m.kind,
                      onDefeat: s.enemies[m.kind.enemy]?.traits?.includes('Elite')
                        ? [{ type: 'DrawCards' as const, investigator: by, amount: 3 }]
                        : [],
                    },
                  }
                : m,
            ),
          }
        }),
    })
    return true
  }
  return false
}
