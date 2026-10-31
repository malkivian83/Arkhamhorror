// RR: Uses, Replenish, Limits, Defeat, Play Restrictions, Skill Tests.
import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type Message,
  type Asset,
  type Trigger,
  type GameState,
} from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'

export const TALENTS: Record<string, string[]> = {
  '08120': ['Fortune', 'Spell', 'Spirit'],
  '08121': ['Charm', 'Tactic', 'Tome'],
  '08122': ['Armor', 'Firearm', 'Melee'],
  '08123': ['Insight', 'Tool', 'Trick'],
  '08124': ['Favor', 'Relic', 'Ritual'],
}
const reward = (by: string, n: number): Message[] => [
  { type: 'DrawCards', investigator: by, amount: n },
  { type: 'GainResources', investigator: by, amount: n },
]
function localDefeat(s: GameState, t: Trigger, a: Asset): boolean {
  const here = getInvestigator(s, a.owner).location
  if (here === null) return false
  if (t.type === 'enemyDefeated') return t.enemy.location === here
  if (t.type === 'investigatorDefeated') return t.location === here
  return (
    t.type === 'assetDefeated' &&
    !!playerCardDef(t.asset.code)?.traits.includes('Ally') &&
    getInvestigator(s, t.asset.owner).location === here
  )
}
export function registerSupport(code: string): boolean {
  const traits = TALENTS[code]
  if (traits) {
    const matches = (c: string) => playerCardDef(c)?.traits.some((t) => traits.includes(t)) ?? false
    registerPlayerCard({
      code,
      forced: (_s, t, a) =>
        t.type === 'roundBegins' && a.uses < 2
          ? [{ type: 'AddUses', asset: a.id, amount: 2 - a.uses }]
          : [],
      usesAsResources: (_s, a, by, c) => by === a.owner && matches(c),
      testOptions: (s, t, a) => {
        const source = t.source ? s.assets[t.source]?.code : t.effectSource
        return t.investigator === a.owner && a.uses > 0 && source && matches(source)
          ? [
              {
                key: a.id + ':boost',
                investigator: a.owner,
                label: 'ability.talentUse',
                params: { card: cardName(code), amount: 1, skill: t.skill },
                then: [
                  { type: 'SpendUses', asset: a.id, amount: 1 },
                  { type: 'BoostSkillTest', amount: 1 },
                ],
              },
            ]
          : []
      },
    })
    return true
  }
  if (['09103', '11085'].includes(code)) {
    registerPlayerCard({
      code,
      playableFromDiscard: true,
      onlyFromDiscard: true,
      whenDefeated: (_s, a) => [{ type: 'ShuffleAssetIntoDeck', asset: a.id }],
    })
    return true
  }
  if (code === '03025') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        getInvestigator(s, by).hand.flatMap((c, index) =>
          !playerCardDef(c)?.weakness && (playerCardDef(c)?.icons?.intellect ?? 0) > 0
            ? [
                {
                  key: a.id + ':secret:' + index,
                  label: 'choice.chargedSeal',
                  params: { card: cardName(c) },
                  actions: 1,
                  provokes: true,
                  costs: [{ type: 'DiscardFromHand' as const, investigator: by, card: c }],
                  then: [{ type: 'AddUses' as const, asset: a.id, amount: 1 }],
                },
              ]
            : [],
        ),
      forced: (_s, t, a) =>
        t.type === 'afterUsesAdded' && t.asset === a.id && a.uses >= 3 && a.uses - t.amount < 3
          ? [
              { type: 'DiscardAsset', asset: a.id },
              { type: 'GainResources', investigator: a.owner, amount: 5 },
              { type: 'RecordNote', note: 'translatedGlyphs' },
            ]
          : [],
    })
    return true
  }
  if (code === '05154') {
    registerPlayerCard({
      code,
      skillModifier: (_s, a, t) =>
        (t.skill === 'willpower' && a.uses >= 1) || (t.skill === 'intellect' && a.uses >= 2)
          ? 1
          : 0,
      ownerVitals: (_s, a) => ({ sanity: a.uses >= 3 ? 1 : 0 }),
      reactions: (s, t, a) =>
        t.type === 'afterDiscoverClues' &&
        t.last &&
        t.location === getInvestigator(s, a.owner).location
          ? [
              {
                key: a.id + ':evidence:' + t.location,
                investigator: a.owner,
                label: 'choice.chargedCamera',
                params: { card: cardName(code) },
                limit: { per: 'game' },
                then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
              },
            ]
          : [],
    })
    return true
  }
  if (['04026', '53005'].includes(code)) {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        localDefeat(s, t, a)
          ? [
              {
                key: a.id + ':charge',
                investigator: a.owner,
                label: 'choice.chargedCharge',
                params: { card: cardName(code), n: 1 },
                then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
              },
            ]
          : [],
      abilities: (_s, a, by) =>
        a.uses < 1
          ? []
          : [
              {
                key: a.id + ':cash',
                label: 'choice.chargedGain',
                params: { n: code === '04026' ? 1 : Math.min(3, a.uses) },
                actions: 1,
                provokes: true,
                then:
                  code === '04026'
                    ? [{ type: 'SpendUses', asset: a.id, amount: 1 }, ...reward(by, 1)]
                    : ask(
                        by,
                        Array.from({ length: Math.min(3, a.uses) + 1 }, (_, n) => ({
                          label: 'choice.chargedGain',
                          params: { n },
                          then: [
                            { type: 'SpendUses' as const, asset: a.id, amount: n },
                            ...reward(by, n),
                          ],
                        })),
                        true,
                      ),
              },
            ],
    })
    return true
  }
  if (code === '02269') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'afterRevealChaosToken' &&
        ['skull', 'cultist', 'tablet', 'elderThing', 'autoFail'].includes(String(t.token)) &&
        !a.exhausted &&
        getInvestigator(s, t.investigator).location === getInvestigator(s, a.owner).location
          ? [
              {
                key: a.id + ':jewel',
                investigator: a.owner,
                label: 'choice.chargedJewel',
                params: { card: cardName(code) },
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  ...ask(
                    a.owner,
                    [
                      {
                        label: 'choice.drawCards',
                        params: { n: 1 },
                        then: [{ type: 'DrawCards', investigator: a.owner, amount: 1 }],
                      },
                      {
                        label: 'choice.gainResources',
                        params: { n: 2 },
                        then: [{ type: 'GainResources', investigator: a.owner, amount: 2 }],
                      },
                    ],
                    true,
                  ),
                ],
              },
            ]
          : [],
    })
    return true
  }
  return false
}
