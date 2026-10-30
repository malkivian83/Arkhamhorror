import { getInvestigator, registerPlayerCard, type SkillType } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'

// RR: Uses, Replenish, Fast. Level 4 talents: Uses (2 resources), replenished to two at the start
// of each round. [fast] Spend 1 resource from your pool or from the card: +1 to one of its two
// skills for this skill test (Physical Training 4 pattern).
export function registerReplenishTalent(code: string, skills: readonly SkillType[]): void {
  registerPlayerCard({
    code,
    forced: (_s, t, a) =>
      t.type === 'roundBegins' && a.uses !== 2
        ? [{ type: 'AddUses', asset: a.id, amount: 2 - a.uses }]
        : [],
    testOptions: (s, t, a) =>
      t.investigator === a.owner && skills.includes(t.skill)
        ? [
            ...(getInvestigator(s, a.owner).resources > 0
              ? [{ type: 'SpendResources' as const, investigator: a.owner, amount: 1 }]
              : []),
            ...(a.uses > 0 ? [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }] : []),
          ].map((payment, n) => ({
            key: a.id + ':pump:' + n,
            investigator: a.owner,
            label: payment.type === 'SpendUses' ? 'ability.talentUse' : 'ability.pump',
            params: { card: cardName(code), skill: t.skill, amount: 1 },
            then: [payment, { type: 'BoostSkillTest', amount: 1 }],
          }))
        : [],
  })
}

// Hyperawareness (4): +1 [intellect] or +1 [agility].
registerReplenishTalent('07264', ['intellect', 'agility'])
