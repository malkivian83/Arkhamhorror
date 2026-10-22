import { getInvestigator, registerPlayerCard, type SkillType } from '@lcg/engine'
import { boost } from '../asset-utilities/register'
import { registerPhaseAsset } from '../phase-bonuses/register'

// RR: Permanent, Skill Tests, Limits. The two Blood Pact abilities have separate
// limits per physical asset and test; doom is a cost, not a post-test effect.
export function registerPermanentTalent(code: string): void {
  if (code === '02185') return registerPhaseAsset(code)
  const skills: readonly SkillType[] =
    code === '02187'
      ? ['willpower', 'intellect']
      : code === '02189'
        ? ['intellect', 'agility']
        : code === '02191'
          ? ['willpower', 'combat']
          : ['combat', 'agility']
  const cost = code === '02189' ? 2 : 1
  const amount = code === '02189' || code === '02191' ? 3 : code === '02187' ? 2 : 1
  registerPlayerCard({
    code,
    permanent: {},
    testOptions: (s, t, a) => {
      if (!skills.includes(t.skill) || t.investigator !== a.owner) return []
      const key = a.id + ':' + t.skill
      const i = getInvestigator(s, a.owner)
      if (code === '02187' && i.hand.length < 5) return []
      if (code === '02191') {
        if ((t.abilityCounts?.[key] ?? 0) > 0) return []
        return [
          boost(
            a,
            t.skill,
            'ability.permanentPact',
            { skill: t.skill },
            [
              { type: 'PlaceDoomOnAsset', asset: a.id, amount: 1 },
              { type: 'ModifySkillTest', use: key },
            ],
            amount,
          ),
        ]
      }
      if (i.resources < cost) return []
      return [
        boost(
          a,
          t.skill,
          'ability.spendForSkill',
          { skill: t.skill, n: cost },
          [{ type: 'SpendResources', investigator: a.owner, amount: cost }],
          amount,
        ),
      ]
    },
  })
}
