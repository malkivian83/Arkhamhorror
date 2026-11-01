// RR: Uses, Fast Abilities, Skill Test Timing ST.6, Healing, Defeat, Search.
import {
  registerPlayerCard,
  playerCardBehavior,
  playerCardDef,
  getInvestigator,
  getLocation,
  engagedEnemies,
  skillTestValue,
  type Message,
  type Asset,
  type Choice,
} from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { boost } from '../asset-utilities/register'
import { exhaust, near, reaction } from './helpers'
const healChoices = (a: Asset): Choice[] => [
  ...(a.damage > 0
    ? [
        {
          label: 'choice.protectionHeal',
          params: { card: cardName(a.code), damage: 1, horror: 0 },
          then: [{ type: 'HealAsset' as const, asset: a.id, damage: 1, horror: 0 }],
        },
      ]
    : []),
  ...(a.horror > 0
    ? [
        {
          label: 'choice.protectionHeal',
          params: { card: cardName(a.code), damage: 0, horror: 1 },
          then: [{ type: 'HealAsset' as const, asset: a.id, damage: 0, horror: 1 }],
        },
      ]
    : []),
]
export function registerAssets(code: string): boolean {
  if (code === '02114') {
    registerBasicAsset(
      code,
      [
        { action: 'fight', modifier: 1 },
        {
          action: 'evade',
          modifier: 3,
          extraCosts: ({ self, investigator }) => [
            { type: 'ExileCard', investigator, code, asset: self.id },
          ],
          onSuccess: ({ investigator }) => [continuation(code, investigator, 'evade-others')],
        },
      ],
      () => ({
        effect: (s, by, step) =>
          step === 'evade-others'
            ? engagedEnemies(s, by).map((e) => ({ type: 'EvadeEnemy', enemy: e.id, by }))
            : [],
      }),
    )
    return true
  }
  if (code === '08080') {
    registerBasicAsset(
      code,
      [{ action: 'fight', modifier: 1, extraDamage: 1 }],
      () => ({ evadeAction: true }),
      (_code, { state, self, investigator }) =>
        engagedEnemies(state, investigator).length
          ? [
              {
                key: self.id + ':evade',
                label: 'ability.evadeWith',
                params: { card: cardName(code) },
                actions: 1,
                provokes: false,
                costs: [{ type: 'DiscardAsset', asset: self.id }],
                then: engagedEnemies(state, investigator).map((e) => ({
                  type: 'EvadeEnemy',
                  enemy: e.id,
                  by: investigator,
                })),
              },
              {
                key: self.id + ':exile',
                label: 'choice.protectionUse',
                params: { card: cardName(code) },
                actions: 1,
                provokes: false,
                costs: [{ type: 'ExileCard', investigator, code, asset: self.id }],
                then: engagedEnemies(state, investigator).flatMap((e): Message[] => [
                  { type: 'EvadeEnemy', enemy: e.id, by: investigator },
                  ...(!e.traits?.includes('Elite') && !e.cannotBeEvaded && !e.hasNoStats
                    ? [{ type: 'DiscardEnemy' as const, enemy: e.id }]
                    : []),
                ]),
              },
            ]
          : [],
    )
    return true
  }
  if (code === '05274') {
    registerPlayerCard({
      code,
      soaksAtLocation: true,
      fastOptions: (s, a) =>
        a.exhausted
          ? []
          : [
              ...Object.values(s.enemies)
                .filter((e) => e.location === getInvestigator(s, a.owner).location)
                .map((e) =>
                  reaction(a.id + ':damage:' + e.id, a.owner, code, [
                    exhaust(a.id),
                    { type: 'DamageAsset', asset: a.id, damage: 1, horror: 0 },
                    { type: 'DamageEnemy', enemy: e.id, amount: 1, by: a.owner },
                  ]),
                ),
              ...(getInvestigator(s, a.owner).location === null
                ? []
                : [
                    reaction(a.id + ':clue', a.owner, code, [
                      exhaust(a.id),
                      { type: 'DamageAsset', asset: a.id, damage: 0, horror: 1 },
                      {
                        type: 'DiscoverClues',
                        investigator: a.owner,
                        location: getInvestigator(s, a.owner).location!,
                        amount: 1,
                      },
                    ]),
                  ]),
            ],
    })
    return true
  }
  if (code === '06155') {
    registerPlayerCard({
      code,
      soaksAtLocation: true,
      reactions: (s, t, a) =>
        t.type === 'assetDefeated' && t.asset.id === a.id
          ? [
              reaction(
                a.id + ':search',
                a.owner,
                code,
                ask(
                  a.owner,
                  near(s, a.owner).flatMap((i) => [
                    {
                      label: 'choice.protectionSearch',
                      params: { name: i.name },
                      then: [
                        {
                          type: 'SearchDeck' as const,
                          investigator: i.id,
                          top: 9,
                          traits: ['Item'],
                          to: 'hand' as const,
                          optional: true,
                        },
                      ],
                    },
                    ...[...new Set(i.discard)]
                      .filter(
                        (c) =>
                          playerCardDef(c)?.type === 'asset' &&
                          playerCardDef(c)?.traits.includes('Item'),
                      )
                      .map((c) => ({
                        label: 'choice.protectionDiscard',
                        params: { card: cardName(c) },
                        then: [{ type: 'DiscardToHand' as const, investigator: i.id, code: c }],
                      })),
                  ]),
                  true,
                ),
              ),
            ]
          : [],
    })
    return true
  }
  if (code === '09038') {
    registerPlayerCard({
      code,
      soaksAtLocation: true,
      helpsOtherTests: true,
      testOptions: (s, t, a) =>
        !a.exhausted && near(s, a.owner).some((i) => i.id === t.investigator)
          ? [
              {
                ...boost(a, 'girish', 'choice.protectionUse', {}, [exhaust(a.id)], 2),
                investigator: a.owner,
                then: [
                  exhaust(a.id),
                  { type: 'BoostSkillTest', amount: 2 },
                  {
                    type: 'ModifySkillTest',
                    onSuccess: [continuation(code, a.owner, 'heal', { asset: a.id })],
                  },
                ],
              },
            ]
          : [],
      effect: (s, by, step, data) =>
        step === 'heal' && s.assets[String(data.asset)]
          ? ask(by, healChoices(s.assets[String(data.asset)]!), true)
          : [],
    })
    return true
  }
  if (code === '08107') {
    registerPlayerCard({
      code,
      testOptions: (_s, t, a) =>
        t.investigator === a.owner && !a.exhausted && ['fight', 'investigate'].includes(t.kind.type)
          ? [
              boost(a, 'ice', 'choice.protectionUse', {}, [exhaust(a.id)], 1, [
                { type: 'ModifySkillTest', use: a.id + ':ice' },
              ]),
            ]
          : [],
      beforeSkillTestResults: (_s, test, a) => {
        if (
          !test.succeeded ||
          test.investigator !== a.owner ||
          !test?.abilityCounts?.[a.id + ':ice'] ||
          !['fight', 'investigate'].includes(test.kind.type)
        )
          return []
        return ask(
          a.owner,
          [
            {
              label: 'choice.protectionUse',
              params: { card: cardName(code) },
              then: [
                { type: 'DiscardAsset', asset: a.id },
                test.kind.type === 'fight'
                  ? { type: 'ModifySkillTest', extraDamage: 1 }
                  : { type: 'AddInvestigationResults', extraClues: 1 },
              ],
            },
            { label: 'choice.skip', then: [] },
          ],
          true,
        )
      },
    })
    return true
  }
  if (code === '11034') {
    registerPlayerCard({
      code,
      limitTitle: true,
      maxUses: 1,
      fastOptions: (s, a) =>
        a.exhausted || a.uses >= 1
          ? []
          : [
              reaction(
                a.id + ':replenish',
                a.owner,
                code,
                ask(
                  a.owner,
                  [...new Set(getInvestigator(s, a.owner).hand)]
                    .filter((c) => !playerCardDef(c)?.weakness)
                    .map((c) => ({
                      label: 'choice.discard',
                      params: { card: cardName(c) },
                      then: [
                        exhaust(a.id),
                        { type: 'DiscardFromHand', investigator: a.owner, card: c },
                        { type: 'AddUses', asset: a.id, amount: 1 },
                      ],
                    })),
                  true,
                ),
              ),
            ],
      reactions: (_s, t, a) =>
        t.type === 'afterRevealingChaosToken' && t.investigator === a.owner && a.uses > 0
          ? [
              reaction(
                a.id + ':adjust',
                a.owner,
                code,
                ask(
                  a.owner,
                  [-1, 1].map((n) => ({
                    label: 'choice.protectionSkill',
                    params: { n },
                    then: [
                      { type: 'SpendUses', asset: a.id, amount: 1 },
                      { type: 'BoostSkillTest', amount: n },
                    ],
                  })),
                  true,
                ),
              ),
            ]
          : [],
    })
    return true
  }
  if (code === '11035') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'afterEvade' &&
        s.enemies[t.enemy]?.location === getInvestigator(s, a.owner).location
          ? [
              reaction(a.id + ':dial', a.owner, code, [
                { type: 'AddUses', asset: a.id, amount: 1 },
                ...(a.uses >= 3
                  ? [{ type: 'RecordNote' as const, note: 'calculatedReckoning' }]
                  : []),
              ]),
            ]
          : [],
    })
    return true
  }
  if (['10042', '10058'].includes(code)) {
    const high = code === '10058'
    registerBasicAsset(
      code,
      [{ action: 'investigate', modifier: ({ self }) => (high ? 2 : 1) * Math.min(3, self.uses) }],
      () => ({
        reactions: (s, t, a) => {
          const here = getInvestigator(s, a.owner).location
          const evidence =
            t.type === 'enemyDefeated'
              ? t.enemy.location === here
              : t.type === 'afterEvade' &&
                s.enemies[t.enemy]?.location === here &&
                s.skillTest?.succeeded === true &&
                s.skillTest.kind.type === 'evade' &&
                s.skillTest.kind.enemy === t.enemy
          if (evidence && (!a.exhausted || high))
            return [
              reaction(a.id + ':evidence', a.owner, code, [
                ...(!high ? [exhaust(a.id)] : []),
                { type: 'AddUses', asset: a.id, amount: 1 },
              ]),
            ]
          return []
        },
        beforeSkillTestResults: (_s, t, a) =>
          !t.succeeded || t.source !== a.id || t.kind.type !== 'investigate' || a.uses < 1
            ? []
            : ask(
                a.owner,
                [
                  ...Array.from({ length: Math.min(a.uses, high ? 3 : 2) }, (_, n) => n + 1).map(
                    (n) => ({
                      label: 'choice.protectionAmount',
                      params: { n },
                      then: [
                        { type: 'SpendUses' as const, asset: a.id, amount: n },
                        { type: 'AddInvestigationResults' as const, extraClues: n },
                      ],
                    }),
                  ),
                  { label: 'choice.skip', then: [] },
                ],
                true,
              ),
      }),
    )
    const b = playerCardBehavior(code)!,
      abilities = b.abilities!
    registerPlayerCard({
      ...b,
      abilities: (s, a, by) =>
        abilities(s, a, by).map((o) => ({
          ...o,
          actions:
            2 +
            (getInvestigator(s, by).location === null
              ? 0
              : (getLocation(s, getInvestigator(s, by).location!).investigateExtraActions ?? 0)),
        })),
    })
    return true
  }
  if (code === '09043') {
    registerPlayerCard({
      code,
      ownerVitals: (_s, a) => ({ sanity: a.uses >= 3 ? 1 : 0 }),
      skillModifier: (_s, a, t) =>
        (t.skill === 'agility' && a.uses >= 1) || (t.skill === 'combat' && a.uses >= 2) ? 1 : 0,
      reactions: (s, t, a) =>
        t.type === 'enemyDefeated' && t.enemy.location === getInvestigator(s, a.owner).location
          ? [
              reaction(a.id + ':evidence', a.owner, code, [
                { type: 'AddUses', asset: a.id, amount: 1 },
              ]),
            ]
          : [],
    })
    return true
  }
  if (code === '09050') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        const test = s.skillTest
        const source =
          test?.sourceSnapshot?.code ??
          (test?.source ? s.assets[test.source]?.code : undefined) ??
          test?.effectSource
        const d = source ? playerCardDef(source) : undefined
        const seeker = d?.class === 'seeker' || d?.classes?.includes('seeker')
        const margin = test
          ? (test.autoFail ? 0 : Math.max(0, skillTestValue(s).total + test.tokenModifier)) -
            test.difficulty
          : 0
        return t.type === 'whenWouldFail' &&
          t.investigator === a.owner &&
          !a.exhausted &&
          test &&
          seeker &&
          margin >= -1 &&
          margin <= 0
          ? [
              reaction(a.id + ':coat', a.owner, code, [
                exhaust(a.id),
                { type: 'ForceSkillTestSuccess', replaceFailure: true },
              ]),
            ]
          : []
      },
    })
    return true
  }
  return false
}
