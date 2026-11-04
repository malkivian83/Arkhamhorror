// RR: Reaction Opportunities, Printed Health, Uses as Resources, Movement, Tarot, Additional Actions.
import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  shroudOf,
  type GameState,
} from '@lcg/engine'
import { ask, cardName, exhaust, react, traits, continuation, draw } from './common'
const opening = (code: string) => ({
  openingHandReactions: (_s: GameState, by: string, hand: string[]) =>
    hand
      .filter((c) => c === code)
      .map((_, n) => ({
        key: code + ':opening:' + by + ':' + n,
        investigator: by,
        label: 'choice.windowPut',
        params: { card: cardName(code) },
        target: { type: 'hand' as const, code },
        then: [{ type: 'PutAssetIntoPlay' as const, investigator: by, code, fromHand: true }],
      })),
})
export function registerSupportTool(code: string): boolean {
  if (code === '11117') {
    registerPlayerCard({
      code,
      requiredInvestigatorTraits: traits[code]!,
      skillModifier: (_s, _a, t) => (t.skill === 'intellect' ? 1 : 0),
      usesAsResourcesAura: (_s, a, donor, payer, c) =>
        a.owner === payer &&
        donor.owner === payer &&
        playerCardDef(donor.code)?.uses?.type === 'secret' &&
        playerCardDef(c)?.type === 'event' &&
        !!playerCardDef(c)?.traits.includes('Insight'),
    })
    return true
  }
  if (code === '11120') {
    registerPlayerCard({
      code,
      limitTitle: true,
      requiredInvestigatorTraits: traits[code]!,
      reactions: (s, t, a) => {
        if (t.type !== 'afterMove' || t.investigator !== a.owner || a.exhausted || a.uses <= 0)
          return []
        const here = getInvestigator(s, a.owner).location,
          enemies = Object.values(s.enemies).filter((e) => e.location === here)
        if (!enemies.length) return []
        const costs = [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }, exhaust(a)]
        return [
          react(
            a,
            ask(
              a.owner,
              [
                ...(here && s.locations[here]!.clues > 0
                  ? [
                      {
                        label: 'choice.supportClue',
                        then: [
                          ...costs,
                          { type: 'DiscoverClues' as const, investigator: a.owner, amount: 1 },
                        ],
                      },
                    ]
                  : []),
                ...enemies.map((e) => ({
                  label: 'choice.supportEnemyDamage',
                  params: { enemy: e.name },
                  then: [
                    ...costs,
                    { type: 'DamageEnemy' as const, enemy: e.id, amount: 1, by: a.owner },
                  ],
                })),
              ],
              true,
            ),
          ),
        ]
      },
    })
    return true
  }
  if (code === '60276') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'enemyDefeated' &&
        t.enemy.location === getInvestigator(s, a.owner).location &&
        !a.exhausted
          ? [
              react(a, [
                exhaust(a),
                {
                  type: 'BeginSkillTest',
                  investigator: a.owner,
                  source: a.id,
                  skill: 'intellect',
                  difficulty: shroudOf(s, t.enemy.location),
                  modifier: Math.min(5, t.enemy.health),
                  kind: { type: 'investigate', location: t.enemy.location },
                },
              ]),
            ]
          : [],
    })
    return true
  }
  if (code === '54011') {
    registerPlayerCard({
      code,
      ...opening(code),
      playModifiers: (_s, a) => (a.exhausted ? [] : [{ discount: 1, costs: [exhaust(a)] }]),
    })
    return true
  }
  if (code === '54001') {
    registerPlayerCard({ code, ...opening(code), controlledAssetVitals: { health: 1, sanity: 1 } })
    return true
  }
  if (code === '60411') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (t.skill === 'willpower' ? 1 : 0),
      reactions: (s, t, a) =>
        t.type === 'afterSkillTestInitiated' &&
        !a.exhausted &&
        getInvestigator(s, a.owner).location !== null &&
        getInvestigator(s, a.owner).location === getInvestigator(s, t.investigator).location
          ? [react(a, [exhaust(a), continuation(code, a.owner, 'number', { base: 0 })])]
          : [],
      effect: (s, by, step, data) => {
        if (step === 'number') {
          const base = Math.max(0, Number(data.base))
          return ask(
            by,
            [
              ...Array.from({ length: 10 }, (_, n) => ({
                label: 'choice.supportPredict',
                params: { n: base + n },
                then: [
                  {
                    type: 'ModifySkillTest' as const,
                    onSuccess: [continuation(code, by, 'judge', { n: base + n })],
                    onFail: [continuation(code, by, 'judge', { n: base + n })],
                  },
                ],
              })),
              ...(base > 0
                ? [
                    {
                      label: 'choice.supportPredictPrevious',
                      then: [continuation(code, by, 'number', { base: Math.max(0, base - 10) })],
                    },
                  ]
                : []),
              {
                label: 'choice.supportPredictNext',
                then: [continuation(code, by, 'number', { base: base + 10 })],
              },
            ],
            true,
          )
        }
        const t = s.skillTest
        if (step !== 'judge' || !t || t.succeeded === null || t.modifiedSkill === null) return []
        const margin = t.succeeded
          ? Math.max(0, t.modifiedSkill - t.difficulty)
          : Math.max(0, t.difficulty - t.modifiedSkill + (t.failByModifier ?? 0))
        return margin === Number(data.n) ? [draw(by)] : []
      },
    })
    return true
  }
  return false
}
